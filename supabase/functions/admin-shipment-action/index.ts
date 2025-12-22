import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, shipmentId, ...params } = body;

    console.log(`Admin shipment action: ${action} for shipment ${shipmentId} by admin ${user.id}`);

    // Get current shipment state
    const { data: shipment } = await supabase
      .from('tracking')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (!shipment) {
      return new Response(JSON.stringify({ error: 'Shipment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (action) {
      case 'update_status': {
        const { status, notes } = params;
        const previousStatus = shipment.status;
        
        const { error } = await supabase
          .from('tracking')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', shipmentId);
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'status_update',
          description: `Status changed from ${previousStatus} to ${status}`,
          previous_value: { status: previousStatus },
          new_value: { status },
          admin_id: user.id,
          admin_notes: notes,
        });

        await supabase.from('tracking_events').insert({
          tracking_id: shipmentId,
          status,
          description: `Status updated by admin`,
          occurred_at: new Date().toISOString(),
        });

        result = { success: true, message: 'Status updated' };
        break;
      }

      case 'mark_delayed': {
        const { isDelayed, notes } = params;
        
        const { error } = await supabase
          .from('tracking')
          .update({ is_delayed: isDelayed, updated_at: new Date().toISOString() })
          .eq('id', shipmentId);
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: isDelayed ? 'mark_delayed' : 'clear_delay',
          description: isDelayed ? 'Shipment marked as delayed' : 'Delay status cleared',
          previous_value: { is_delayed: shipment.is_delayed },
          new_value: { is_delayed: isDelayed },
          admin_id: user.id,
          admin_notes: notes,
        });

        result = { success: true, message: isDelayed ? 'Marked as delayed' : 'Delay cleared' };
        break;
      }

      case 'update_expected_delivery': {
        const { expectedDeliveryDate, notes } = params;
        
        const { error } = await supabase
          .from('tracking')
          .update({ 
            expected_delivery_date: expectedDeliveryDate,
            estimated_delivery: expectedDeliveryDate,
            updated_at: new Date().toISOString() 
          })
          .eq('id', shipmentId);
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'update_delivery_date',
          description: `Expected delivery updated to ${expectedDeliveryDate}`,
          previous_value: { expected_delivery_date: shipment.expected_delivery_date },
          new_value: { expected_delivery_date: expectedDeliveryDate },
          admin_id: user.id,
          admin_notes: notes,
        });

        result = { success: true, message: 'Delivery date updated' };
        break;
      }

      case 'mark_delivered': {
        const { notes } = params;
        
        const { error } = await supabase
          .from('tracking')
          .update({ 
            status: 'delivered',
            actual_delivery_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString() 
          })
          .eq('id', shipmentId);
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'mark_delivered',
          description: 'Shipment manually marked as delivered',
          previous_value: { status: shipment.status },
          new_value: { status: 'delivered' },
          admin_id: user.id,
          admin_notes: notes,
        });

        await supabase.from('tracking_events').insert({
          tracking_id: shipmentId,
          status: 'delivered',
          description: 'Marked as delivered by admin',
          occurred_at: new Date().toISOString(),
        });

        result = { success: true, message: 'Marked as delivered' };
        break;
      }

      case 'trigger_return': {
        const { notes } = params;
        
        const { error } = await supabase
          .from('tracking')
          .update({ status: 'returned', updated_at: new Date().toISOString() })
          .eq('id', shipmentId);
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'trigger_return',
          description: 'Return process initiated',
          previous_value: { status: shipment.status },
          new_value: { status: 'returned' },
          admin_id: user.id,
          admin_notes: notes,
        });

        result = { success: true, message: 'Return initiated' };
        break;
      }

      case 'create_issue': {
        const { issueType, description, orderImpact } = params;
        
        const { error } = await supabase.from('shipment_issues').insert({
          shipment_id: shipmentId,
          issue_type: issueType,
          description,
          order_impact: orderImpact,
          created_by: user.id,
        });
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'create_issue',
          description: `Issue created: ${issueType}`,
          new_value: { issue_type: issueType, description },
          admin_id: user.id,
        });

        result = { success: true, message: 'Issue created' };
        break;
      }

      case 'update_issue_status': {
        const { issueId, issueStatus, notes } = params;
        
        const updateData: Record<string, unknown> = { issue_status: issueStatus };
        if (issueStatus === 'resolved') {
          updateData.resolved_by = user.id;
          updateData.resolved_at = new Date().toISOString();
        }
        
        const { error } = await supabase
          .from('shipment_issues')
          .update(updateData)
          .eq('id', issueId);
        
        if (error) throw error;

        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'update_issue',
          description: `Issue status updated to ${issueStatus}`,
          new_value: { issue_status: issueStatus },
          admin_id: user.id,
          admin_notes: notes,
        });

        result = { success: true, message: 'Issue updated' };
        break;
      }

      case 'add_note': {
        const { notes } = params;
        
        await supabase.from('shipment_actions_log').insert({
          shipment_id: shipmentId,
          action_type: 'admin_note',
          description: 'Admin note added',
          admin_id: user.id,
          admin_notes: notes,
        });

        result = { success: true, message: 'Note added' };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-shipment-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
