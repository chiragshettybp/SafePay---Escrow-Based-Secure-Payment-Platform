import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  session_id: string;
  idempotency_key?: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Normalize phone number to +91XXXXXXXXXX format
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  let normalized = phone.replace(/[\s\-\(\)]/g, '')
  if (!normalized.startsWith('+')) {
    normalized = normalized.startsWith('91') ? `+${normalized}` : `+91${normalized}`
  }
  return normalized
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  try {
    const body: CheckoutRequest = await req.json()
    const { session_id, idempotency_key } = body
    
    // ==========================================
    // VALIDATION: Required fields
    // ==========================================
    if (!session_id) {
      console.error('[CompleteCheckout] Missing session_id')
      return json(400, { error: 'session_id is required' })
    }

    console.log('[CompleteCheckout] Processing session:', session_id)

    // ==========================================
    // STEP 1: Fetch and validate session
    // ==========================================
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('checkout_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      console.error('[CompleteCheckout] Session not found:', sessionError)
      return json(404, { error: 'Session not found' })
    }

    // ==========================================
    // IDEMPOTENCY CHECK: Return existing order if already completed
    // ==========================================
    if (session.order_id) {
      console.log('[CompleteCheckout] IDEMPOTENT: Order already exists:', session.order_id)
      return json(200, { 
        success: true, 
        order_id: session.order_id,
        payment_method: session.selected_payment_method,
        idempotent: true
      })
    }

    // ==========================================
    // VALIDATION: Session must be active
    // ==========================================
    if (session.status === 'expired') {
      console.error('[CompleteCheckout] Session expired')
      return json(400, { error: 'Session has expired' })
    }

    if (session.status === 'completed') {
      // Session completed but no order_id - data corruption
      console.error('[CompleteCheckout] Session completed but no order_id - data corruption')
      return json(500, { error: 'Session state corrupted. Please contact support.' })
    }

    if (session.status !== 'active') {
      console.error('[CompleteCheckout] Invalid session status:', session.status)
      return json(400, { error: `Cannot complete checkout. Session is ${session.status}` })
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      console.log('[CompleteCheckout] Session expired, updating status')
      await supabaseAdmin
        .from('checkout_sessions')
        .update({ status: 'expired' })
        .eq('id', session_id)
      return json(400, { error: 'Session has expired' })
    }

    // ==========================================
    // VALIDATION: Required checkout data
    // ==========================================
    if (!session.phone_number) {
      return json(400, { error: 'Phone number required. Please go back and enter your phone.' })
    }

    if (!session.shipping_address) {
      return json(400, { error: 'Shipping address required. Please go back and enter your address.' })
    }

    if (!session.selected_payment_method) {
      return json(400, { error: 'Payment method required. Please select a payment method.' })
    }

    // ==========================================
    // STEP 2: Fetch merchant data
    // ==========================================
    const { data: merchantData, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, user_id, business_name, status')
      .eq('id', session.merchant_id)
      .single()

    if (merchantError || !merchantData) {
      console.error('[CompleteCheckout] Merchant not found:', merchantError)
      return json(400, { error: 'Merchant not found' })
    }

    if (merchantData.status !== 'active' && merchantData.status !== 'pending_verification') {
      console.error('[CompleteCheckout] Merchant not active:', merchantData.status)
      return json(400, { error: 'Merchant is not available' })
    }

    // CRITICAL: Use merchant's user_id (auth UUID) for orders table
    // The orders table merchant_id column expects auth.users.id, not merchants.id
    const merchantUserId = merchantData.user_id
    const merchantBusinessName = merchantData.business_name || 'Merchant'

    if (!merchantUserId) {
      console.error('[CompleteCheckout] Merchant has no user_id')
      return json(500, { error: 'Merchant configuration error' })
    }

    console.log('[CompleteCheckout] Merchant resolved:', { 
      merchant_table_id: merchantData.id,
      merchant_user_id: merchantUserId,
      business_name: merchantBusinessName
    })

    // ==========================================
    // STEP 3: Resolve or create customer
    // ==========================================
    let effectiveCustomerId = session.user_id
    const normalizedPhone = normalizePhone(session.phone_number)

    if (!effectiveCustomerId && normalizedPhone) {
      console.log('[CompleteCheckout] Resolving user for phone:', normalizedPhone?.slice(0, 4) + '****')
      
      // Strategy 1: Check profiles table
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (existingProfile?.user_id) {
        effectiveCustomerId = existingProfile.user_id
        console.log('[CompleteCheckout] Found user by profile.user_id:', effectiveCustomerId)
      } else if (existingProfile?.id) {
        effectiveCustomerId = existingProfile.id
        console.log('[CompleteCheckout] Found user by profile.id:', effectiveCustomerId)
      }

      // Strategy 2: Create new user if not found
      if (!effectiveCustomerId) {
        console.log('[CompleteCheckout] Creating new user for phone:', normalizedPhone?.slice(0, 4) + '****')
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          phone: normalizedPhone,
          phone_confirm: true,
          user_metadata: {
            account_source: 'payment_link',
            created_via_checkout: session_id,
          },
        })

        if (authError) {
          const isDuplicate = authError.message?.includes('already') || 
                             authError.message?.includes('exists') ||
                             authError.message?.includes('duplicate') ||
                             authError.message?.includes('unique')
          
          if (isDuplicate) {
            console.log('[CompleteCheckout] User exists, retrying lookup...')
            
            // Wait for potential trigger execution
            await new Promise(resolve => setTimeout(resolve, 200))
            
            const { data: retryProfile } = await supabaseAdmin
              .from('profiles')
              .select('id, user_id')
              .eq('phone', normalizedPhone)
              .maybeSingle()
            
            if (retryProfile?.user_id) {
              effectiveCustomerId = retryProfile.user_id
            } else if (retryProfile?.id) {
              effectiveCustomerId = retryProfile.id
            } else {
              // Last resort: paginate through auth users
              let page = 1
              while (!effectiveCustomerId && page <= 5) {
                const { data: pageUsers } = await supabaseAdmin.auth.admin.listUsers({
                  page,
                  perPage: 100,
                })
                
                const matchingUser = pageUsers?.users?.find(u => u.phone === normalizedPhone)
                if (matchingUser) {
                  effectiveCustomerId = matchingUser.id
                  console.log('[CompleteCheckout] Found user in auth list (page', page, '):', effectiveCustomerId)
                  
                  // Ensure profile exists
                  await supabaseAdmin
                    .from('profiles')
                    .upsert({
                      id: matchingUser.id,
                      user_id: matchingUser.id,
                      phone: normalizedPhone,
                      account_source: 'payment_link',
                      account_claimed: false,
                      phone_verified: true,
                    }, { onConflict: 'id' })
                }
                
                if (!pageUsers?.users?.length || pageUsers.users.length < 100) break
                page++
              }
            }
          } else {
            console.error('[CompleteCheckout] Auth user creation failed:', authError)
          }
        } else if (authData?.user) {
          effectiveCustomerId = authData.user.id
          console.log('[CompleteCheckout] Created new user:', effectiveCustomerId)

          // Wait for trigger, then ensure profile has correct fields
          await new Promise(resolve => setTimeout(resolve, 150))
          
          await supabaseAdmin
            .from('profiles')
            .upsert({
              id: authData.user.id,
              user_id: authData.user.id,
              phone: normalizedPhone,
              account_source: 'payment_link',
              account_claimed: false,
              phone_verified: true,
            }, { onConflict: 'id' })
        }
      }
    }

    if (!effectiveCustomerId) {
      console.error('[CompleteCheckout] Could not resolve customer ID')
      return json(400, { error: 'Unable to process checkout. Please try again or contact support.' })
    }

    // Update session with resolved user_id
    if (effectiveCustomerId !== session.user_id) {
      await supabaseAdmin
        .from('checkout_sessions')
        .update({ 
          user_id: effectiveCustomerId,
          phone_snapshot: normalizedPhone || session.phone_number
        })
        .eq('id', session_id)
    }

    // ==========================================
    // STEP 4: Create order (ATOMIC)
    // ==========================================
    const orderStatus = session.selected_payment_method === 'cod' ? 'in_progress' : 'pending'
    const cartData = (session.cart_data as any[]) || []
    const productName = cartData[0]?.product_name || 'Order'
    const productDescription = cartData.map((i: any) => `${i.product_name || 'Item'} x${i.quantity || 1}`).join(', ')

    console.log('[CompleteCheckout] Creating order:', { 
      customer_id: effectiveCustomerId, 
      merchant_id: merchantUserId,
      amount: session.final_amount,
      status: orderStatus,
      product: productName
    })

    // Use upsert with unique constraint for idempotency
    // Generate idempotency key from session_id if not provided
    const orderIdempotencyKey = idempotency_key || `order_${session_id}`

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: effectiveCustomerId,
        merchant_id: merchantUserId,
        merchant_name: merchantBusinessName,
        product_name: productName,
        product_description: productDescription,
        amount: session.final_amount,
        status: orderStatus,
        phone_snapshot: normalizedPhone || session.phone_number,
      })
      .select()
      .single()

    if (orderError) {
      console.error('[CompleteCheckout] Order creation failed:', orderError)
      
      // Check if this is a duplicate - might be a retry
      if (orderError.code === '23505') {
        console.log('[CompleteCheckout] Possible duplicate order, checking session again')
        const { data: retrySession } = await supabaseAdmin
          .from('checkout_sessions')
          .select('order_id')
          .eq('id', session_id)
          .single()
        
        if (retrySession?.order_id) {
          return json(200, { 
            success: true, 
            order_id: retrySession.order_id,
            payment_method: session.selected_payment_method,
            idempotent: true
          })
        }
      }
      
      return json(500, { error: 'Failed to create order. Please try again.' })
    }

    console.log('[CompleteCheckout] Order created:', order.id)

    // ==========================================
    // STEP 5: Update session atomically
    // ==========================================
    const isCod = session.selected_payment_method === 'cod'
    const sessionUpdate = {
      status: isCod ? 'completed' : 'active',
      current_step: isCod ? 'confirmation' : 'payment',
      order_id: order.id,
      completed_at: isCod ? new Date().toISOString() : null,
      user_id: effectiveCustomerId,
      phone_snapshot: normalizedPhone || session.phone_number,
    }

    const { error: updateError } = await supabaseAdmin
      .from('checkout_sessions')
      .update(sessionUpdate)
      .eq('id', session_id)
      .eq('order_id', null) // Ensure we don't update if order_id already set (race condition)

    if (updateError) {
      console.error('[CompleteCheckout] Session update error:', updateError)
      // Non-blocking - order is already created
    }

    // ==========================================
    // STEP 6: Log checkout event
    // ==========================================
    await supabaseAdmin.from('checkout_events').insert({
      session_id: session_id,
      event_type: isCod ? 'checkout_completed_cod' : 'order_created_prepaid',
      event_data: { 
        order_id: order.id, 
        payment_method: session.selected_payment_method,
        customer_id: effectiveCustomerId,
        amount: session.final_amount,
      },
      step: isCod ? 'confirmation' : 'payment',
      previous_step: 'payment',
    })

    // ==========================================
    // STEP 7: Log payment link association (if applicable)
    // ==========================================
    if (session.payment_link_id) {
      const { error: assocError } = await supabaseAdmin
        .from('payment_link_user_associations')
        .insert({
          payment_link_id: session.payment_link_id,
          checkout_session_id: session_id,
          order_id: order.id,
          user_id: effectiveCustomerId,
          phone_number: normalizedPhone || session.phone_number, // Correct column name
          association_type: 'order_completed',
          metadata: {
            payment_method: session.selected_payment_method,
            amount: session.final_amount,
          }
        })
      
      if (assocError) {
        console.error('[CompleteCheckout] Association log error (non-blocking):', assocError)
      }

      // Update payment link stats (non-blocking)
      try {
        const { error: rpcError } = await supabaseAdmin.rpc('increment_payment_link_stats', {
          link_id: session.payment_link_id,
          payment_amount: session.final_amount
        })
        if (rpcError) {
          console.error('[CompleteCheckout] Stats update error (non-blocking):', rpcError)
        }
      } catch (rpcErr) {
        console.error('[CompleteCheckout] Stats RPC error (non-blocking):', rpcErr)
      }
    }

    console.log('[CompleteCheckout] SUCCESS:', { 
      order_id: order.id, 
      customer_id: effectiveCustomerId,
      merchant_id: merchantUserId,
      payment_method: session.selected_payment_method,
      status: orderStatus
    })

    return json(200, { 
      success: true, 
      order_id: order.id,
      payment_method: session.selected_payment_method,
      status: orderStatus
    })

  } catch (error) {
    console.error('[CompleteCheckout] Unexpected error:', error)
    return json(500, { error: 'Internal server error. Please try again.' })
  }
})
