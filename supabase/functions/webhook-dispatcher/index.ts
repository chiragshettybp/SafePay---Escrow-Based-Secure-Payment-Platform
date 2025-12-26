import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC-SHA256 signature
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

async function deliverWebhook(
  supabase: any,
  endpoint: any,
  eventType: string,
  payload: any,
  merchantId: string,
  attempt: number = 1
): Promise<{ success: boolean; responseCode?: number; error?: string }> {
  const timestamp = Date.now().toString();
  const payloadString = JSON.stringify(payload);
  const signatureData = `${payloadString}${timestamp}`;
  
  let signature = '';
  if (endpoint.secret) {
    signature = await generateSignature(signatureData, endpoint.secret);
  }

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Event-Type': eventType,
        'X-Timestamp': timestamp,
        'X-Delivery-Attempt': attempt.toString(),
        'User-Agent': 'SafePay-Webhook/1.0',
      },
      body: payloadString,
    });

    const responseText = await response.text();

    // Log the delivery
    await supabase.from('webhook_deliveries').insert({
      endpoint_id: endpoint.id,
      merchant_id: merchantId,
      event_type: eventType,
      payload: payload,
      response_code: response.status,
      response_body: responseText.substring(0, 1000), // Limit size
      attempt: attempt,
      status: response.ok ? 'success' : 'failed',
      delivered_at: new Date().toISOString(),
    });

    // Update endpoint last triggered
    await supabase
      .from('merchant_webhooks')
      .update({ 
        last_triggered_at: new Date().toISOString(),
        last_status: response.status 
      })
      .eq('id', endpoint.id);

    if (!response.ok) {
      return { 
        success: false, 
        responseCode: response.status, 
        error: `HTTP ${response.status}: ${responseText.substring(0, 200)}` 
      };
    }

    return { success: true, responseCode: response.status };

  } catch (error: any) {
    console.error(`[webhook-dispatcher] Delivery failed for ${endpoint.url}:`, error.message);
    
    // Log failed delivery
    await supabase.from('webhook_deliveries').insert({
      endpoint_id: endpoint.id,
      merchant_id: merchantId,
      event_type: eventType,
      payload: payload,
      response_code: null,
      attempt: attempt,
      status: 'failed',
      error_message: error.message,
      delivered_at: new Date().toISOString(),
    });

    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { merchantId, eventType, payload, endpointId } = body;

    if (!merchantId || !eventType || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: merchantId, eventType, payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[webhook-dispatcher] Dispatching ${eventType} for merchant ${merchantId}`);

    // Get active webhook endpoints for this merchant
    let query = supabase
      .from('merchant_webhooks')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);

    // If specific endpoint provided, only use that one
    if (endpointId) {
      query = query.eq('id', endpointId);
    }

    const { data: endpoints, error: endpointsError } = await query;

    if (endpointsError) {
      console.error('[webhook-dispatcher] Failed to fetch endpoints:', endpointsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhook endpoints' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!endpoints || endpoints.length === 0) {
      console.log(`[webhook-dispatcher] No active endpoints for merchant ${merchantId}`);
      return new Response(
        JSON.stringify({ message: 'No active webhook endpoints found', dispatched: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter endpoints by event type subscription
    const matchingEndpoints = endpoints.filter(ep => {
      if (!ep.events || ep.events.length === 0) return true; // Subscribe to all
      return ep.events.includes(eventType) || ep.events.includes('*');
    });

    if (matchingEndpoints.length === 0) {
      console.log(`[webhook-dispatcher] No endpoints subscribed to ${eventType}`);
      return new Response(
        JSON.stringify({ message: 'No endpoints subscribed to this event', dispatched: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Dispatch to all matching endpoints
    const results = await Promise.all(
      matchingEndpoints.map(async (endpoint) => {
        let result = await deliverWebhook(supabase, endpoint, eventType, payload, merchantId, 1);
        
        // Retry logic
        let attempt = 1;
        while (!result.success && attempt < MAX_RETRIES) {
          attempt++;
          console.log(`[webhook-dispatcher] Retrying ${endpoint.url}, attempt ${attempt}`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 2]));
          
          // Update status to retrying
          await supabase.from('webhook_deliveries')
            .update({ status: 'retrying' })
            .eq('endpoint_id', endpoint.id)
            .eq('event_type', eventType)
            .order('created_at', { ascending: false })
            .limit(1);
          
          result = await deliverWebhook(supabase, endpoint, eventType, payload, merchantId, attempt);
        }
        
        return {
          endpointId: endpoint.id,
          url: endpoint.url,
          success: result.success,
          responseCode: result.responseCode,
          error: result.error,
          attempts: attempt
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[webhook-dispatcher] Completed: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        dispatched: matchingEndpoints.length,
        successful: successCount,
        failed: failedCount,
        results: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[webhook-dispatcher] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
