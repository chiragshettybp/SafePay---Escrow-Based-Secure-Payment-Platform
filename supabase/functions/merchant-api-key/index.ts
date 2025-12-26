import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cryptographically secure random key generation
function generateSecureKey(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  let key = prefix;
  for (let i = 0; i < array.length; i++) {
    key += chars[array[i] % chars.length];
  }
  return key;
}

// Simple hash function using SubtleCrypto
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

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a merchant
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, user_id, status')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ error: 'Merchant account not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (merchant.status === 'banned' || merchant.status === 'suspended') {
      return new Response(
        JSON.stringify({ error: 'Merchant account is suspended' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, keyType, environment, keyId, name } = body;

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log(`[merchant-api-key] Action: ${action}, Merchant: ${merchant.id}, Type: ${keyType}, Env: ${environment}`);

    switch (action) {
      case 'generate': {
        // Validate inputs
        if (!keyType || !['public', 'secret'].includes(keyType)) {
          return new Response(
            JSON.stringify({ error: 'Invalid key type. Must be "public" or "secret"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!environment || !['test', 'live'].includes(environment)) {
          return new Response(
            JSON.stringify({ error: 'Invalid environment. Must be "test" or "live"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if key already exists for this type/environment combo
        const { data: existingKey } = await supabase
          .from('merchant_api_keys')
          .select('id')
          .eq('merchant_id', merchant.id)
          .eq('key_type', keyType)
          .eq('environment', environment)
          .eq('status', 'active')
          .single();

        if (existingKey) {
          return new Response(
            JSON.stringify({ error: `Active ${environment} ${keyType} key already exists. Rotate or revoke it first.` }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate key based on environment and type
        const prefix = `${environment}_${keyType === 'public' ? 'pk' : 'sk'}_`;
        const rawKey = generateSecureKey(prefix);
        const keyHash = await hashKey(rawKey);
        const keyPrefix = rawKey.substring(0, prefix.length + 8);

        // Store the key hash in database
        const { data: newKey, error: insertError } = await supabase
          .from('merchant_api_keys')
          .insert({
            merchant_id: merchant.id,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            key_type: keyType,
            environment: environment,
            status: 'active',
            name: name || `${environment.charAt(0).toUpperCase() + environment.slice(1)} ${keyType} key`,
            scopes: keyType === 'public' ? ['read'] : ['read', 'write'],
          })
          .select()
          .single();

        if (insertError) {
          console.error('[merchant-api-key] Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to create API key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabase.from('api_key_audit_log').insert({
          merchant_id: merchant.id,
          api_key_id: newKey.id,
          action: 'generated',
          key_prefix: keyPrefix,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { environment, keyType }
        });

        // Ensure merchant integration record exists
        await supabase.from('merchant_integrations').upsert({
          merchant_id: merchant.id,
          integration_status: 'connected',
          [`${environment}_mode_enabled`]: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'merchant_id' });

        console.log(`[merchant-api-key] Key generated successfully: ${keyPrefix}`);

        // Return the raw key ONCE - this is the only time it's visible
        return new Response(
          JSON.stringify({
            success: true,
            key: {
              id: newKey.id,
              rawKey: rawKey, // Only returned once!
              prefix: keyPrefix,
              type: keyType,
              environment: environment,
              createdAt: newKey.created_at
            },
            warning: 'This is the only time this key will be shown. Please save it securely.'
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'rotate': {
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'Key ID is required for rotation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the existing key
        const { data: existingKey, error: fetchError } = await supabase
          .from('merchant_api_keys')
          .select('*')
          .eq('id', keyId)
          .eq('merchant_id', merchant.id)
          .single();

        if (fetchError || !existingKey) {
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (existingKey.status === 'revoked') {
          return new Response(
            JSON.stringify({ error: 'Cannot rotate a revoked key' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Revoke the old key
        await supabase
          .from('merchant_api_keys')
          .update({ status: 'revoked' })
          .eq('id', keyId);

        // Generate new key with same type/environment
        const prefix = `${existingKey.environment}_${existingKey.key_type === 'public' ? 'pk' : 'sk'}_`;
        const rawKey = generateSecureKey(prefix);
        const keyHash = await hashKey(rawKey);
        const keyPrefix = rawKey.substring(0, prefix.length + 8);

        // Create new key
        const { data: newKey, error: insertError } = await supabase
          .from('merchant_api_keys')
          .insert({
            merchant_id: merchant.id,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            key_type: existingKey.key_type,
            environment: existingKey.environment,
            status: 'active',
            name: existingKey.name,
            scopes: existingKey.scopes,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[merchant-api-key] Rotate insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to create new API key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log both actions
        await supabase.from('api_key_audit_log').insert([
          {
            merchant_id: merchant.id,
            api_key_id: keyId,
            action: 'revoked',
            key_prefix: existingKey.key_prefix,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'rotation' }
          },
          {
            merchant_id: merchant.id,
            api_key_id: newKey.id,
            action: 'rotated',
            key_prefix: keyPrefix,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { previousKeyId: keyId }
          }
        ]);

        console.log(`[merchant-api-key] Key rotated: ${existingKey.key_prefix} -> ${keyPrefix}`);

        return new Response(
          JSON.stringify({
            success: true,
            key: {
              id: newKey.id,
              rawKey: rawKey,
              prefix: keyPrefix,
              type: existingKey.key_type,
              environment: existingKey.environment,
              createdAt: newKey.created_at
            },
            warning: 'This is the only time this key will be shown. The old key has been revoked.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke': {
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'Key ID is required for revocation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the key
        const { data: existingKey, error: fetchError } = await supabase
          .from('merchant_api_keys')
          .select('*')
          .eq('id', keyId)
          .eq('merchant_id', merchant.id)
          .single();

        if (fetchError || !existingKey) {
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (existingKey.status === 'revoked') {
          return new Response(
            JSON.stringify({ error: 'Key is already revoked' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Revoke the key
        const { error: updateError } = await supabase
          .from('merchant_api_keys')
          .update({ status: 'revoked' })
          .eq('id', keyId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to revoke key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabase.from('api_key_audit_log').insert({
          merchant_id: merchant.id,
          api_key_id: keyId,
          action: 'revoked',
          key_prefix: existingKey.key_prefix,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { reason: 'manual_revocation' }
        });

        console.log(`[merchant-api-key] Key revoked: ${existingKey.key_prefix}`);

        return new Response(
          JSON.stringify({ success: true, message: 'API key revoked successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'log_copy': {
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'Key ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get key prefix for logging
        const { data: key } = await supabase
          .from('merchant_api_keys')
          .select('key_prefix')
          .eq('id', keyId)
          .eq('merchant_id', merchant.id)
          .single();

        // Log the copy action
        await supabase.from('api_key_audit_log').insert({
          merchant_id: merchant.id,
          api_key_id: keyId,
          action: 'copied',
          key_prefix: key?.key_prefix,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[merchant-api-key] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
