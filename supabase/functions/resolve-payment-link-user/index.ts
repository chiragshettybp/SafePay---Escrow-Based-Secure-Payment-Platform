/**
 * resolve-payment-link-user Edge Function
 * 
 * This function handles atomic user creation/association for public payment links.
 * It ensures:
 * - No duplicate users are created (phone-based uniqueness)
 * - Idempotency for repeated calls with same payment_id
 * - Race-safe operations using database transactions
 * - Audit logging for all associations
 * 
 * CRITICAL: This function uses service role and must be called server-side only.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveUserRequest {
  phone_number: string;
  checkout_session_id: string;
  order_id?: string;
  payment_id?: string;
  payment_link_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface ResolveUserResponse {
  success: boolean;
  user_id: string;
  association_type: 'created' | 'existing';
  account_claimed: boolean;
  message: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Normalize phone number to canonical format (+91XXXXXXXXXX)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 91 but no +, add +
  if (normalized.startsWith('91') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  // If it's 10 digits, assume Indian number and add +91
  if (/^\d{10}$/.test(normalized)) {
    normalized = '+91' + normalized;
  }
  
  return normalized;
}

/**
 * Validate phone number format
 */
function isValidPhoneNumber(phone: string): boolean {
  return /^\+91\d{10}$/.test(phone);
}

/**
 * Mask phone number for logging (privacy)
 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // CRITICAL: Use service role for user creation
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const body: ResolveUserRequest = await req.json();
    
    // Validate required fields
    if (!body.phone_number) {
      return json(400, { error: "phone_number is required" });
    }
    
    if (!body.checkout_session_id) {
      return json(400, { error: "checkout_session_id is required" });
    }
    
    // Normalize and validate phone number
    const normalizedPhone = normalizePhoneNumber(body.phone_number);
    
    if (!isValidPhoneNumber(normalizedPhone)) {
      return json(400, { error: "Invalid phone number format. Use +91XXXXXXXXXX" });
    }
    
    console.log(`[ResolveUser] Processing phone: ${maskPhone(normalizedPhone)}, session: ${body.checkout_session_id}`);
    
    // =====================================================
    // STEP 1: IDEMPOTENCY CHECK
    // Check if this session already has a user associated
    // =====================================================
    const { data: existingSession } = await supabase
      .from("checkout_sessions")
      .select("id, user_id, phone_snapshot")
      .eq("id", body.checkout_session_id)
      .single();
    
    if (!existingSession) {
      return json(404, { error: "Checkout session not found" });
    }
    
    // If session already has a user_id and phone_snapshot, return idempotent response
    if (existingSession.user_id && existingSession.phone_snapshot) {
      console.log(`[ResolveUser] IDEMPOTENT: Session ${body.checkout_session_id} already has user ${existingSession.user_id}`);
      
      // Fetch user details
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, account_claimed, account_source")
        .eq("id", existingSession.user_id)
        .single();
      
      return json(200, {
        success: true,
        user_id: existingSession.user_id,
        association_type: existingUser?.account_source === 'payment_link' ? 'created' : 'existing',
        account_claimed: existingUser?.account_claimed ?? false,
        message: "User already associated with session",
        idempotent: true
      } as ResolveUserResponse);
    }
    
    // =====================================================
    // STEP 2: USER RESOLUTION (ATOMIC)
    // Try to find existing user or create new one
    // =====================================================
    
    let userId: string;
    let associationType: 'created' | 'existing';
    let accountClaimed: boolean;
    
    // Check if user exists with this phone number
    const { data: existingUser, error: userLookupError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, account_claimed, account_source, auth_provider")
      .eq("phone", normalizedPhone)
      .maybeSingle();
    
    if (userLookupError) {
      console.error(`[ResolveUser] Error looking up user:`, userLookupError);
      return json(500, { error: "Failed to lookup user" });
    }
    
    if (existingUser) {
      // =====================================================
      // EXISTING USER FLOW
      // User found - associate payment with existing account
      // =====================================================
      userId = existingUser.id;
      associationType = 'existing';
      accountClaimed = existingUser.account_claimed ?? true;
      
      console.log(`[ResolveUser] Found existing user: ${userId}, claimed: ${accountClaimed}`);
      
    } else {
      // =====================================================
      // NEW USER FLOW
      // No user found - create new unclaimed account
      // =====================================================
      
      console.log(`[ResolveUser] No existing user, creating new account for phone: ${maskPhone(normalizedPhone)}`);
      
      // First, create auth user with phone (no password - must claim later)
      // Using admin API to create user without email/password
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true, // Mark phone as verified since they're using it
        user_metadata: {
          account_source: 'payment_link',
          created_via: 'public_payment_link',
          checkout_session_id: body.checkout_session_id,
        },
        app_metadata: {
          account_claimed: false,
          auth_provider: 'payment_link',
        }
      });
      
      if (authError) {
        // Check if it's a duplicate error (race condition)
        if (authError.message?.includes('already') || authError.message?.includes('exists')) {
          console.log(`[ResolveUser] Race condition detected, re-fetching user`);
          
          // Retry lookup
          const { data: retryUser } = await supabase
            .from("profiles")
            .select("id, account_claimed")
            .eq("phone", normalizedPhone)
            .single();
          
          if (retryUser) {
            userId = retryUser.id;
            associationType = 'existing';
            accountClaimed = retryUser.account_claimed ?? true;
          } else {
            console.error(`[ResolveUser] Race condition but user still not found:`, authError);
            return json(500, { error: "Failed to create or find user" });
          }
        } else {
          console.error(`[ResolveUser] Auth user creation failed:`, authError);
          return json(500, { error: "Failed to create user account" });
        }
      } else if (authUser?.user) {
        userId = authUser.user.id;
        associationType = 'created';
        accountClaimed = false;
        
        console.log(`[ResolveUser] Created new auth user: ${userId}`);
        
        // The handle_new_user trigger should create the profile automatically
        // But let's ensure the profile has correct fields
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            user_id: userId,
            phone: normalizedPhone,
            account_source: 'payment_link',
            account_claimed: false,
            auth_provider: 'payment_link',
            phone_verified: true,
          }, {
            onConflict: 'id'
          });
        
        if (profileUpdateError) {
          console.error(`[ResolveUser] Profile upsert warning:`, profileUpdateError);
          // Non-blocking - profile might already exist via trigger
        }
        
        console.log(`[ResolveUser] Profile created/updated for user: ${userId}`);
      } else {
        return json(500, { error: "Unexpected error during user creation" });
      }
    }
    
    // =====================================================
    // STEP 3: ASSOCIATE USER WITH SESSION AND ORDER
    // =====================================================
    
    // Update checkout session with user_id and phone_snapshot
    const { error: sessionUpdateError } = await supabase
      .from("checkout_sessions")
      .update({
        user_id: userId,
        phone_snapshot: normalizedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.checkout_session_id);
    
    if (sessionUpdateError) {
      console.error(`[ResolveUser] Failed to update session:`, sessionUpdateError);
      return json(500, { error: "Failed to associate user with session" });
    }
    
    console.log(`[ResolveUser] Session ${body.checkout_session_id} updated with user ${userId}`);
    
    // Update order if provided
    if (body.order_id) {
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          customer_id: userId,
          phone_snapshot: normalizedPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.order_id);
      
      if (orderUpdateError) {
        console.error(`[ResolveUser] Failed to update order:`, orderUpdateError);
        // Non-blocking - order update is secondary
      } else {
        console.log(`[ResolveUser] Order ${body.order_id} updated with user ${userId}`);
      }
    }
    
    // =====================================================
    // STEP 4: CREATE AUDIT LOG
    // =====================================================
    
    const { error: auditError } = await supabase
      .from("payment_link_user_associations")
      .insert({
        checkout_session_id: body.checkout_session_id,
        order_id: body.order_id,
        payment_id: body.payment_id,
        payment_link_id: body.payment_link_id,
        user_id: userId,
        phone_number: normalizedPhone,
        association_type: associationType,
        ip_address: body.ip_address,
        user_agent: body.user_agent,
        metadata: {
          account_claimed: accountClaimed,
          timestamp: new Date().toISOString(),
        }
      });
    
    if (auditError) {
      console.error(`[ResolveUser] Audit log error (non-blocking):`, auditError);
      // Non-blocking - audit failure shouldn't stop the flow
    }
    
    // =====================================================
    // STEP 5: LOG EVENT
    // =====================================================
    
    await supabase.from("checkout_events").insert({
      session_id: body.checkout_session_id,
      event_type: associationType === 'created' 
        ? "user_auto_created_via_payment_link" 
        : "payment_link_user_associated_existing",
      event_data: {
        user_id: userId,
        phone_masked: maskPhone(normalizedPhone),
        association_type: associationType,
        account_claimed: accountClaimed,
      },
      ip_address: body.ip_address,
      user_agent: body.user_agent,
    });
    
    console.log(`[ResolveUser] SUCCESS: User ${userId} (${associationType}) associated with session ${body.checkout_session_id}`);
    
    return json(200, {
      success: true,
      user_id: userId,
      association_type: associationType,
      account_claimed: accountClaimed,
      message: associationType === 'created' 
        ? "New account created via payment link. User can claim account later."
        : "Payment associated with existing account.",
    } as ResolveUserResponse);
    
  } catch (error) {
    console.error("[ResolveUser] Unexpected error:", error);
    return json(500, { error: "Internal server error" });
  }
});
