import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()
    
    if (!session_id) {
      console.error('Missing session_id')
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing checkout for session:', session_id)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get checkout session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('checkout_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      console.error('Session fetch error:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch merchant separately to ensure we get user_id correctly
    // checkout_sessions.merchant_id references merchants.id (table PK)
    const { data: merchantData, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, user_id, business_name')
      .eq('id', session.merchant_id)
      .single()

    if (merchantError) {
      console.error('Merchant fetch error:', merchantError)
    }

    // CRITICAL: Use merchant's user_id (auth UUID) for orders, NOT merchants table ID
    const merchantUserId = merchantData?.user_id || session.merchant_id
    const merchantBusinessName = merchantData?.business_name || 'Merchant'

    console.log('Session found:', { 
      id: session.id, 
      phone: session.phone_number,
      user_id: session.user_id,
      payment_link_id: session.payment_link_id,
      payment_method: session.selected_payment_method,
      merchant_table_id: session.merchant_id,
      merchant_user_id: merchantUserId,
    })

    // Validate session state
    if (!session.phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session.shipping_address) {
      return new Response(
        JSON.stringify({ error: 'Shipping address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session.selected_payment_method) {
      return new Response(
        JSON.stringify({ error: 'Payment method required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If order already exists, return it
    if (session.order_id) {
      console.log('Order already exists:', session.order_id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          order_id: session.order_id,
          payment_method: session.selected_payment_method
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve user if not already set (for payment link flows)
    let effectiveCustomerId = session.user_id

    if (!effectiveCustomerId && session.phone_number) {
      console.log('Resolving user for phone:', session.phone_number)
      
      // Normalize phone number
      let normalizedPhone = session.phone_number.replace(/[\s\-\(\)]/g, '')
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = normalizedPhone.startsWith('91') ? `+${normalizedPhone}` : `+91${normalizedPhone}`
      }

      // Strategy 1: Check profiles table for user with this phone
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (existingProfile?.user_id) {
        effectiveCustomerId = existingProfile.user_id
        console.log('Found existing user by profile phone:', effectiveCustomerId)
      } else if (existingProfile?.id) {
        effectiveCustomerId = existingProfile.id
        console.log('Found existing user by profile id:', effectiveCustomerId)
      }

      // Strategy 2: If not found in profiles, try to create user
      if (!effectiveCustomerId) {
        console.log('Creating new user for phone:', normalizedPhone)
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          phone: normalizedPhone,
          phone_confirm: true,
          user_metadata: {
            account_source: 'payment_link',
            created_via_checkout: session_id,
          },
        })

        if (authError) {
          // Handle duplicate phone - user exists in auth but not in profiles
          const isDuplicate = authError.message?.includes('already') || 
                             authError.message?.includes('exists') ||
                             authError.message?.includes('duplicate') ||
                             authError.message?.includes('unique') ||
                             (authError as any).code === '23505'
          
          if (isDuplicate) {
            console.log('User already exists, performing comprehensive search...')
            
            // Re-check profiles with a slight delay (trigger might have created it)
            await new Promise(resolve => setTimeout(resolve, 200))
            
            const { data: retryProfile } = await supabaseAdmin
              .from('profiles')
              .select('id, user_id')
              .eq('phone', normalizedPhone)
              .maybeSingle()
            
            if (retryProfile?.user_id) {
              effectiveCustomerId = retryProfile.user_id
              console.log('Found user on retry (profiles):', effectiveCustomerId)
            } else if (retryProfile?.id) {
              effectiveCustomerId = retryProfile.id
              console.log('Found user on retry (profiles id):', effectiveCustomerId)
            } else {
              // Last resort: Paginate through auth users to find by phone
              let page = 1
              let found = false
              while (!found && page <= 10) { // Max 1000 users search
                const { data: pageUsers } = await supabaseAdmin.auth.admin.listUsers({
                  page,
                  perPage: 100,
                })
                
                const matchingUser = pageUsers?.users?.find(u => u.phone === normalizedPhone)
                if (matchingUser) {
                  effectiveCustomerId = matchingUser.id
                  console.log('Found user in auth list (page', page, '):', effectiveCustomerId)
                  found = true
                  
                  // Ensure profile exists for this user
                  const { error: upsertErr } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                      id: matchingUser.id,
                      user_id: matchingUser.id,
                      phone: normalizedPhone,
                      account_source: 'payment_link',
                      account_claimed: false,
                      auth_provider: 'payment_link',
                      phone_verified: true,
                    }, { onConflict: 'id' })
                  
                  if (upsertErr) {
                    console.error('Profile upsert error:', upsertErr)
                  }
                }
                
                if (!pageUsers?.users?.length || pageUsers.users.length < 100) break
                page++
              }
            }
          } else {
            console.error('Auth user creation error:', authError)
          }
        } else if (authData?.user) {
          effectiveCustomerId = authData.user.id
          console.log('Created new user:', effectiveCustomerId)

          // Wait a moment for trigger to create profile, then ensure correct fields
          await new Promise(resolve => setTimeout(resolve, 150))
          
          const { error: profileUpsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: authData.user.id,
              user_id: authData.user.id,
              phone: normalizedPhone,
              account_source: 'payment_link',
              account_claimed: false,
              auth_provider: 'payment_link',
              phone_verified: true,
            }, { onConflict: 'id' })

          if (profileUpsertError) {
            console.error('Profile upsert error:', profileUpsertError)
          }
        }
      }

      // Update checkout session with resolved user_id
      if (effectiveCustomerId) {
        await supabaseAdmin
          .from('checkout_sessions')
          .update({ 
            user_id: effectiveCustomerId,
            phone_snapshot: session.phone_number
          })
          .eq('id', session_id)
      }
    }

    if (!effectiveCustomerId) {
      console.error('Could not resolve customer ID')
      return new Response(
        JSON.stringify({ error: 'Unable to process checkout. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create order using service role (bypasses RLS)
    const orderStatus = session.selected_payment_method === 'cod' ? 'in_progress' : 'pending'
    const cartData = (session.cart_data as any[]) || []

    console.log('Creating order:', { 
      customer_id: effectiveCustomerId, 
      merchant_id: merchantUserId,
      amount: session.final_amount,
      status: orderStatus
    })

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: effectiveCustomerId,
        merchant_id: merchantUserId,
        merchant_name: merchantBusinessName,
        product_name: cartData[0]?.product_name || 'Order',
        product_description: cartData.map((i: any) => `${i.product_name} x${i.quantity}`).join(', '),
        amount: session.final_amount,
        status: orderStatus,
        phone_snapshot: session.phone_number || session.phone_snapshot,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: orderError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Order created:', order.id)

    // Update checkout session with order info
    const { error: updateError } = await supabaseAdmin
      .from('checkout_sessions')
      .update({
        status: session.selected_payment_method === 'cod' ? 'completed' : 'active',
        current_step: session.selected_payment_method === 'cod' ? 'confirmation' : 'payment',
        order_id: order.id,
        completed_at: session.selected_payment_method === 'cod' ? new Date().toISOString() : null,
        user_id: effectiveCustomerId,
      })
      .eq('id', session_id)

    if (updateError) {
      console.error('Session update error:', updateError)
    }

    // Log checkout event
    await supabaseAdmin.from('checkout_events').insert({
      session_id: session_id,
      event_type: session.selected_payment_method === 'cod' ? 'checkout_completed' : 'order_created',
      event_data: { 
        order_id: order.id, 
        payment_method: session.selected_payment_method,
        customer_id: effectiveCustomerId,
      },
      step: session.selected_payment_method === 'cod' ? 'confirmation' : 'payment',
      previous_step: 'payment',
    })

    // Log user association if this was a payment link flow
    if (session.payment_link_id) {
      const { error: assocError } = await supabaseAdmin.from('payment_link_user_associations').insert({
        payment_link_id: session.payment_link_id,
        checkout_session_id: session_id,
        user_id: effectiveCustomerId,
        phone_number: session.phone_number, // Column is phone_number, not phone_used
        association_type: 'order_completed',
      })
      if (assocError) {
        console.error('Association log error:', assocError)
      }
    }

    console.log('Checkout completed successfully:', { 
      order_id: order.id, 
      customer_id: effectiveCustomerId,
      payment_method: session.selected_payment_method 
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: order.id,
        payment_method: session.selected_payment_method
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Complete checkout error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
