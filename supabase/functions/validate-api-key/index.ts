import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Hash function matching the generation function
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from headers
    const apiKey = req.headers.get('x-api-key') || 
                   req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'API key is required',
          code: 'MISSING_API_KEY'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate key format
    const keyPrefixMatch = apiKey.match(/^(test|live)_(pk|sk)_/);
    if (!keyPrefixMatch) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid API key format',
          code: 'INVALID_KEY_FORMAT'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const environment = keyPrefixMatch[1]; // 'test' or 'live'
    const keyType = keyPrefixMatch[2] === 'pk' ? 'public' : 'secret';

    // Hash the incoming key
    const keyHash = await hashKey(apiKey);

    // Look up the key in database
    const { data: keyRecord, error: keyError } = await supabase
      .from('merchant_api_keys')
      .select(`
        id,
        merchant_id,
        key_type,
        environment,
        status,
        scopes,
        expires_at,
        last_used_at
      `)
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyRecord) {
      console.log('[validate-api-key] Key not found:', keyHash.substring(0, 16) + '...');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid API key',
          code: 'KEY_NOT_FOUND'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key is active
    if (keyRecord.status !== 'active') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'API key has been revoked',
          code: 'KEY_REVOKED'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key has expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'API key has expired',
          code: 'KEY_EXPIRED'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get merchant details
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, user_id, business_name, status')
      .eq('user_id', keyRecord.merchant_id)
      .single();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Merchant account not found',
          code: 'MERCHANT_NOT_FOUND'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check merchant status
    if (merchant.status === 'banned' || merchant.status === 'suspended') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Merchant account is suspended',
          code: 'MERCHANT_SUSPENDED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('merchant_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    // Log usage
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    await supabase.from('api_key_audit_log').insert({
      merchant_id: keyRecord.merchant_id,
      api_key_id: keyRecord.id,
      action: 'used',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { endpoint: req.url }
    });

    console.log(`[validate-api-key] Key validated for merchant: ${merchant.id}, env: ${environment}`);

    return new Response(
      JSON.stringify({
        valid: true,
        merchant: {
          id: merchant.id,
          userId: merchant.user_id,
          businessName: merchant.business_name
        },
        key: {
          id: keyRecord.id,
          type: keyRecord.key_type,
          environment: keyRecord.environment,
          scopes: keyRecord.scopes
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-api-key] Error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
