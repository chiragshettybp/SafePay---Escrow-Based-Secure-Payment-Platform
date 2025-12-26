import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function can be called via cron job or manually by admin
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting draft expiration check...');

    // Find all expired drafts
    const { data: expiredDrafts, error: fetchError } = await supabase
      .from('orders')
      .select('id, customer_id, merchant_id, amount, product_name')
      .eq('status', 'draft')
      .eq('draft_status', 'active')
      .lt('draft_expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired drafts:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredDrafts || expiredDrafts.length === 0) {
      console.log('No expired drafts found');
      return new Response(
        JSON.stringify({ success: true, expired_count: 0, message: 'No drafts to expire' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredDrafts.length} expired drafts`);

    // Update all expired drafts
    const draftIds = expiredDrafts.map(d => d.id);
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        draft_status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .in('id', draftIds);

    if (updateError) {
      console.error('Error updating expired drafts:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit logs for all expirations
    const auditLogs = expiredDrafts.map(draft => ({
      order_id: draft.id,
      action_type: 'expired',
      performed_by: draft.customer_id, // System action on behalf of customer
      performed_by_role: 'system',
      previous_state: { draft_status: 'active' },
      new_state: { draft_status: 'expired' },
      reason: 'Draft expired due to timeout',
    }));

    await supabase.from('draft_audit_logs').insert(auditLogs);

    // Notify customers about expired drafts
    const notifications = expiredDrafts.map(draft => ({
      user_id: draft.customer_id,
      title: 'Draft Payment Expired',
      message: `Your draft payment of ₹${draft.amount} for "${draft.product_name}" has expired.`,
      order_id: draft.id,
      type: 'order',
    }));

    await supabase.from('notifications').insert(notifications);

    console.log(`Successfully expired ${expiredDrafts.length} drafts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: expiredDrafts.length,
        message: `Expired ${expiredDrafts.length} drafts`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Expire drafts error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});