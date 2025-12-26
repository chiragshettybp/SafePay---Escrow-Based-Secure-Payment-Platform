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
  action: 'send_otp' | 'verify_otp' | 'update_address' | 'select_payment' | 'complete' | 'abandon';
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
          otp_verified: !!userId,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
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
      
      return json(201, { session });
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
        case 'send_otp': {
          const phoneNumber = body.data?.phone_number as string;
          
          if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
            return json(400, { error: "Invalid phone number format. Use +91XXXXXXXXXX" });
          }
          
          // Check OTP rate limiting
          if (session.otp_attempts >= 5) {
            return json(429, { error: "Too many OTP attempts. Please try again later." });
          }
          
          // In production, integrate with SMS provider
          // For now, we'll simulate OTP sending
          console.log(`[Checkout] Sending OTP to ${phoneNumber}`);
          
          // Update session with phone number
          await supabase
            .from("checkout_sessions")
            .update({
              phone_number: phoneNumber,
              otp_sent_at: new Date().toISOString(),
              otp_attempts: session.otp_attempts + 1,
            })
            .eq("id", body.session_id);
          
          // Log event
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: "otp_sent",
            event_data: { phone_number: phoneNumber.replace(/\d(?=\d{4})/g, '*') },
            step: 'login',
          });
          
          return json(200, { message: "OTP sent successfully" });
        }
        
        case 'verify_otp': {
          const otp = body.data?.otp as string;
          
          if (!otp || otp.length !== 6) {
            return json(400, { error: "Invalid OTP format" });
          }
          
          // In production, verify OTP with SMS provider
          // For demo, accept any 6-digit OTP or "123456"
          const isValidOtp = otp === "123456" || /^\d{6}$/.test(otp);
          
          if (!isValidOtp) {
            return json(400, { error: "Invalid OTP" });
          }
          
          // Check if user exists with this phone number
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .eq("phone", session.phone_number)
            .single();
          
          // Update session
          const updateData: Record<string, unknown> = {
            otp_verified: true,
            current_step: 'address',
          };
          
          if (existingUser) {
            updateData.user_id = existingUser.id;
          }
          
          await supabase
            .from("checkout_sessions")
            .update(updateData)
            .eq("id", body.session_id);
          
          // Log event
          await supabase.from("checkout_events").insert({
            session_id: body.session_id,
            event_type: "otp_verified",
            event_data: { returning_user: !!existingUser },
            step: 'address',
            previous_step: 'login',
          });
          
          // Fetch addresses if user found
          let addresses: unknown[] = [];
          if (existingUser) {
            const { data: userAddresses } = await supabase
              .from("customer_addresses")
              .select("*")
              .eq("user_id", existingUser.id)
              .order("is_default", { ascending: false });
            
            addresses = userAddresses || [];
          }
          
          return json(200, { 
            message: "OTP verified successfully",
            user: existingUser,
            addresses
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
          // Verify all required data is present
          if (!session.otp_verified) {
            return json(400, { error: "Phone verification required" });
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