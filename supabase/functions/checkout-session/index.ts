import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSessionRequest {
  merchant_id: string;
  cart_data: Array<{
    product_name: string;
    quantity: number;
    price: number;
    image_url?: string;
  }>;
  cart_total: number;
  discount_amount?: number;
  shipping_amount?: number;
  tax_amount?: number;
}

interface UpdateSessionRequest {
  session_id: string;
  action: 'collect_phone' | 'update_address' | 'select_payment' | 'complete' | 'abandon';
  data?: Record<string, unknown>;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get auth token if present
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id || null;
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // GET /checkout-session/:id - Get session details
    if (req.method === "GET" && pathParts.length >= 2) {
      const sessionId = pathParts[pathParts.length - 1];
      
      console.log(`[Checkout] Fetching session: ${sessionId}`);
      
      const { data: session, error } = await supabase
        .from("checkout_sessions")
        .select(`
          *,
          merchants:merchant_id (
            id,
            business_name,
            logo_url
          )
        `)
        .eq("id", sessionId)
        .single();
      
      if (error || !session) {
        console.error(`[Checkout] Session not found: ${sessionId}`, error);
        return json(404, { error: "Session not found" });
      }
      
      // Check if session is expired
      if (new Date(session.expires_at) < new Date() && session.status === 'active') {
        await supabase
          .from("checkout_sessions")
          .update({ status: 'expired' })
          .eq("id", sessionId);
        
        session.status = 'expired';
      }
      
      // Fetch user addresses if logged in
      let addresses: unknown[] = [];
      if (session.user_id) {
        const { data: userAddresses } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("user_id", session.user_id)
          .order("is_default", { ascending: false });
        
        addresses = userAddresses || [];
      }
      
      return json(200, { session, addresses });
    }
    
    // POST /checkout-session - Create new session
    if (req.method === "POST" && !url.pathname.includes("/action")) {
      const body: CreateSessionRequest = await req.json();
      
      console.log(`[Checkout] Creating session for merchant: ${body.merchant_id}`);
      
      // CHECK PLATFORM KILL-SWITCH FLAGS FIRST
      const { data: platformFlags } = await supabase
        .from("platform_flags")
        .select("key, value");
      
      const getFlag = (key: string): unknown => {
        const flag = platformFlags?.find(f => f.key === key);
        if (!flag) return null;
        try {
          return JSON.parse(String(flag.value));
        } catch {
          return flag.value;
        }
      };
      
      const isCheckoutLocked = getFlag("checkout_locked") === true;
      const activeLevel = Number(getFlag("active_incident_level")) || 0;
      
      // Level 2+ blocks new checkout sessions
      if (isCheckoutLocked || activeLevel >= 2) {
        console.log(`[Checkout] BLOCKED - Platform kill-switch active (Level ${activeLevel})`);
        return json(503, { 
          error: "Checkout temporarily unavailable",
          code: "PLATFORM_MAINTENANCE",
          message: "We're performing maintenance. Please try again shortly.",
          kill_switch_active: true,
          level: activeLevel
        });
      }
      
      // Validate merchant exists and is active
      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("id, status, business_name")
        .eq("id", body.merchant_id)
        .single();
      
      if (merchantError || !merchant) {
        console.error(`[Checkout] Merchant not found: ${body.merchant_id}`, merchantError);
        return json(404, { error: "Merchant not found" });
      }
      
      if (merchant.status !== 'active') {
        return json(400, { error: "Merchant is not active" });
      }
      
      // Calculate final amount
      const cartTotal = body.cart_total || 0;
      const discountAmount = body.discount_amount || 0;
      const shippingAmount = body.shipping_amount || 0;
      const taxAmount = body.tax_amount || 0;
      const finalAmount = cartTotal - discountAmount + shippingAmount + taxAmount;
      
      // Check for degradation warning (Level 1)
      const showDegradationWarning = getFlag("degradation_warning") === true || activeLevel === 1;
      
      // Create session
      const { data: session, error: createError } = await supabase
        .from("checkout_sessions")
        .insert({
          merchant_id: body.merchant_id,
          user_id: userId,
          cart_data: body.cart_data,
          cart_total: cartTotal,
          discount_amount: discountAmount,
          shipping_amount: shippingAmount,
          tax_amount: taxAmount,
          final_amount: finalAmount,
          status: 'active',
          current_step: userId ? 'address' : 'login', // Skip login if already authenticated
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
          metadata: showDegradationWarning ? { degradation_warning: true } : {},
        })
        .select()
        .single();
      
      if (createError) {
        console.error(`[Checkout] Failed to create session`, createError);
        return json(500, { error: "Failed to create checkout session" });
      }
      
      // Log event
      await supabase.from("checkout_events").insert({
        session_id: session.id,
        event_type: "session_created",
        event_data: { merchant_id: body.merchant_id, cart_items: body.cart_data?.length || 0 },
        step: session.current_step,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
      });
      
      console.log(`[Checkout] Session created: ${session.id}`);
      
      return json(201, { 
        session,
        degradation_warning: showDegradationWarning 
      });
    }
    
    // POST /checkout-session/action - Perform action on session
    if (req.method === "POST" && url.pathname.includes("/action")) {
      const body: UpdateSessionRequest = await req.json();
      
      console.log(`[Checkout] Action: ${body.action} on session: ${body.session_id}`);
      
      // Fetch current session
      const { data: session, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("id", body.session_id)
        .single();
      
      if (sessionError || !session) {
        return json(404, { error: "Session not found" });
      }
      
      // Check if session is still active
      if (session.status !== 'active') {
        return json(400, { error: `Session is ${session.status}` });
      }
      
      // Check expiry
      if (new Date(session.expires_at) < new Date()) {
        await supabase
          .from("checkout_sessions")
          .update({ status: 'expired' })
          .eq("id", body.session_id);
        
        return json(400, { error: "Session has expired" });
      }
      
      switch (body.action) {
        case 'collect_phone': {
          const phoneNumber = body.data?.phone_number as string;
          const isPaymentLink = session.payment_link_id !== null;
          
          if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
            return json(400, { error: "Invalid phone number format. Use +91XXXXXXXXXX" });
          }
          
          const maskedPhone = phoneNumber.slice(0, 4) + '****' + phoneNumber.slice(-4);
          console.log(`[Checkout] Collecting phone: ${maskedPhone}, isPaymentLink: ${isPaymentLink}`);
          
          let resolvedUserId: string | null = null;
          let existingUser: { id: string; full_name: string | null; phone: string } | null = null;
          let associationType: 'created' | 'existing' | null = null;
          
          // For payment links, use the resolve-payment-link-user function for atomic user resolution
          if (isPaymentLink && !session.user_id) {
            console.log(`[Checkout] Payment link flow - resolving user atomically`);
            
            // Call the resolve-payment-link-user function internally
            try {
              // Check if user exists with this phone number first
              const { data: userByPhone } = await supabase
                .from("profiles")
                .select("id, full_name, phone, account_claimed, account_source")
                .eq("phone", phoneNumber)
                .maybeSingle();
              
              if (userByPhone) {
                // Existing user - just associate
                resolvedUserId = userByPhone.id;
                existingUser = userByPhone;
                associationType = 'existing';
                
                console.log(`[Checkout] Found existing user: ${resolvedUserId}`);
                
              } else {
                // No user exists - create new unclaimed account via auth admin API
                console.log(`[Checkout] Creating new user for payment link`);
                
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                  phone: phoneNumber,
                  phone_confirm: true,
                  user_metadata: {
                    account_source: 'payment_link',
                    created_via: 'public_payment_link',
                    checkout_session_id: body.session_id,
                  },
                  app_metadata: {
                    account_claimed: false,
                    auth_provider: 'payment_link',
                  }
                });
                
                if (authError) {
                  // Handle race condition - user might have been created concurrently
                  if (authError.message?.includes('already') || authError.message?.includes('exists') || authError.message?.includes('duplicate')) {
                    console.log(`[Checkout] Race condition - re-fetching user`);
                    const { data: retryUser } = await supabase
                      .from("profiles")
                      .select("id, full_name, phone")
                      .eq("phone", phoneNumber)
                      .single();
                    
                    if (retryUser) {
                      resolvedUserId = retryUser.id;
                      existingUser = retryUser;
                      associationType = 'existing';
                    }
                  } else {
                    console.error(`[Checkout] Failed to create user:`, authError);
                  }
                } else if (authUser?.user) {
                  resolvedUserId = authUser.user.id;
                  associationType = 'created';
                  
                  // Ensure profile has correct fields
                  await supabase
                    .from("profiles")
                    .upsert({
                      id: authUser.user.id,
                      user_id: authUser.user.id,
                      phone: phoneNumber,
                      account_source: 'payment_link',
                      account_claimed: false,
                      auth_provider: 'payment_link',
                      phone_verified: true,
                    }, { onConflict: 'id' });
                  
                  console.log(`[Checkout] Created new user: ${resolvedUserId}`);
                }
              }
              
              // Create audit log for payment link user association
              if (resolvedUserId && associationType) {
                await supabase
                  .from("payment_link_user_associations")
                  .insert({
                    checkout_session_id: body.session_id,
                    payment_link_id: session.payment_link_id,
                    user_id: resolvedUserId,
                    phone_number: phoneNumber,
                    association_type: associationType,
                    ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
                    user_agent: req.headers.get("user-agent"),
                    metadata: { step: 'collect_phone' }
                  });
              }
              
            } catch (resolveError) {
              console.error(`[Checkout] User resolution error:`, resolveError);
              // Non-blocking - continue with checkout even if user resolution fails
            }
            
          } else {
            // Non-payment-link flow - just look up existing user
            const { data: userByPhone } = await supabase
              .from("profiles")
              .select("id, full_name, phone")
              .eq("phone", phoneNumber)
              .single();
            
            if (userByPhone) {
              existingUser = userByPhone;
              resolvedUserId = userByPhone.id;
              associationType = 'existing';
            }
          }
          
          // Update session with phone number, user_id, and phone_snapshot
          const updateData: Record<string, unknown> = {
            phone_number: phoneNumber,
            phone_snapshot: phoneNumber, // Immutable snapshot for audit
            current_step: 'address',
          };
          
          if (resolvedUserId) {
            updateData.user_id = resolvedUserId;
          }
          
          await supabase
            .from("checkout_sessions")
            .update(updateData)
            .eq("id", body.session_id);
          
          // Log event with association info
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: associationType === 'created' 
              ? "user_auto_created_via_payment_link" 
              : "phone_collected",
            event_data: { 
              phone_masked: maskedPhone, 
              returning_user: associationType === 'existing',
              is_payment_link: isPaymentLink,
              association_type: associationType,
              user_resolved: !!resolvedUserId,
            },
            step: 'address',
            previous_step: 'login',
          });
          
          // Fetch addresses if user found/created
          let addresses: unknown[] = [];
          if (resolvedUserId) {
            const { data: userAddresses } = await supabase
              .from("customer_addresses")
              .select("*")
              .eq("user_id", resolvedUserId)
              .order("is_default", { ascending: false });
            
            addresses = userAddresses || [];
          }
          
          // Privacy: Never expose whether account existed or was created
          // Use neutral messaging
          return json(200, { 
            message: "Phone number saved",
            user: existingUser ? { id: existingUser.id, full_name: existingUser.full_name } : null,
            addresses,
            // Internal fields (not exposed to public UI but useful for frontend logic)
            _internal: {
              user_resolved: !!resolvedUserId,
              // Don't expose association_type to prevent account enumeration
            }
          });
        }
        
        case 'update_address': {
          const addressData = body.data as {
            address_id?: string;
            full_name: string;
            phone: string;
            address_line1: string;
            address_line2?: string;
            city: string;
            state: string;
            pincode: string;
            save_address?: boolean;
          };
          
          // Validate pincode serviceability
          const { data: pincodeData } = await supabase
            .from("pincode_serviceability")
            .select("*")
            .eq("pincode", addressData.pincode)
            .single();
          
          const isServiceable = pincodeData?.is_serviceable ?? true;
          const codAvailable = pincodeData?.cod_available ?? true;
          const deliveryMin = pincodeData?.delivery_days_min ?? 3;
          const deliveryMax = pincodeData?.delivery_days_max ?? 7;
          
          if (!isServiceable) {
            return json(400, { error: "Delivery not available to this pincode" });
          }
          
          // Build shipping address object
          const shippingAddress = {
            address_line1: addressData.address_line1,
            address_line2: addressData.address_line2 || '',
            city: addressData.city,
            state: addressData.state,
            pincode: addressData.pincode,
            country: 'India',
          };
          
          // Calculate delivery estimate
          const deliveryEstimate = `${deliveryMin}-${deliveryMax} business days`;
          
          // Update session
          await supabase
            .from("checkout_sessions")
            .update({
              shipping_name: addressData.full_name,
              shipping_address: shippingAddress,
              shipping_pincode: addressData.pincode,
              delivery_estimate: deliveryEstimate,
              cod_available: codAvailable,
              current_step: 'payment',
            })
            .eq("id", body.session_id);
          
          // Save address if requested and user is logged in
          if (addressData.save_address && session.user_id) {
            await supabase
              .from("customer_addresses")
              .insert({
                user_id: session.user_id,
                label: 'Home',
                full_name: addressData.full_name,
                phone: addressData.phone,
                ...shippingAddress,
              });
          }
          
          // Log event
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: "address_updated",
            event_data: { pincode: addressData.pincode, cod_available: codAvailable },
            step: 'payment',
            previous_step: 'address',
          });
          
          return json(200, { 
            message: "Address updated",
            delivery_estimate: deliveryEstimate,
            cod_available: codAvailable,
          });
        }
        
        case 'select_payment': {
          const paymentMethod = body.data?.payment_method as string;
          
          const validMethods = ['upi', 'card', 'wallet', 'emi', 'cod', 'netbanking'];
          if (!paymentMethod || !validMethods.includes(paymentMethod)) {
            return json(400, { error: "Invalid payment method" });
          }
          
          // Check COD availability
          if (paymentMethod === 'cod' && !session.cod_available) {
            return json(400, { error: "COD is not available for this location" });
          }
          
          // Update session
          await supabase
            .from("checkout_sessions")
            .update({
              selected_payment_method: paymentMethod,
              cod_verification_required: paymentMethod === 'cod',
            })
            .eq("id", body.session_id);
          
          // Log event
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: "payment_method_selected",
            event_data: { payment_method: paymentMethod },
            step: 'payment',
          });
          
          return json(200, { 
            message: "Payment method selected",
            requires_verification: paymentMethod === 'cod',
          });
        }
        
        case 'complete': {
          // Verify all required data is present - phone must be collected (no OTP verification)
          if (!session.phone_number) {
            return json(400, { error: "Phone number required" });
          }
          
          if (!session.shipping_address) {
            return json(400, { error: "Shipping address required" });
          }
          
          if (!session.selected_payment_method) {
            return json(400, { error: "Payment method required" });
          }
          
          // For COD, mark as completed
          // For online payment, this would be called after payment success
          const orderId = body.data?.order_id as string;
          const paymentId = body.data?.payment_id as string;
          
          await supabase
            .from("checkout_sessions")
            .update({
              status: 'completed',
              current_step: 'confirmation',
              order_id: orderId,
              payment_id: paymentId,
              completed_at: new Date().toISOString(),
            })
            .eq("id", body.session_id);
          
          // Log event
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: "checkout_completed",
            event_data: { order_id: orderId, payment_method: session.selected_payment_method },
            step: 'confirmation',
            previous_step: 'payment',
          });
          
          return json(200, { 
            message: "Checkout completed",
            order_id: orderId,
          });
        }
        
        case 'abandon': {
          await supabase
            .from("checkout_sessions")
            .update({ status: 'abandoned' })
            .eq("id", body.session_id);
          
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: "checkout_abandoned",
            event_data: { step_abandoned: session.current_step },
            step: session.current_step,
          });
          
          return json(200, { message: "Session abandoned" });
        }
        
        default:
          return json(400, { error: "Invalid action" });
      }
    }
    
    return json(405, { error: "Method not allowed" });
    
  } catch (error) {
    console.error("[Checkout] Error:", error);
    return json(500, { error: "Internal server error" });
  }
});