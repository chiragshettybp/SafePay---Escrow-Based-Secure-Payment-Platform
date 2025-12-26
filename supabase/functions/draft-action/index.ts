import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DraftActionRequest {
  orderId: string;
  action: string;
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { orderId, action, reason } = await req.json() as DraftActionRequest;

    if (!orderId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId and action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check order is a draft
    if (order.status !== 'draft') {
      return new Response(
        JSON.stringify({ error: 'Order is not a draft' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = roleData?.some(r => r.role === 'admin') || false;
    const isMerchant = roleData?.some(r => r.role === 'merchant') || false;
    const isCustomer = order.customer_id === user.id;
    const isOrderMerchant = order.merchant_id === user.id;

    let updateData: Record<string, unknown> = {};
    let auditAction: string = action;
    let performerRole = isAdmin ? 'admin' : (isMerchant ? 'merchant' : 'customer');

    console.log(`Draft action: ${action} by ${performerRole} on order ${orderId}`);

    switch (action) {
      case 'submit':
        // Only customer can submit their own draft
        if (!isCustomer) {
          return new Response(
            JSON.stringify({ error: 'Only the customer can submit their draft' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (order.draft_status !== 'active' && order.draft_status !== 'change_requested') {
          return new Response(
            JSON.stringify({ error: `Cannot submit draft with status: ${order.draft_status}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData = {
          draft_status: 'submitted',
          draft_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        break;

      case 'cancel':
        // Customer can cancel their own active/submitted draft
        // Merchant can cancel submitted drafts
        // Admin can cancel any draft
        if (!isAdmin && !isCustomer && !(isMerchant && isOrderMerchant && order.draft_status === 'submitted')) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to cancel this draft' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!['active', 'submitted', 'change_requested'].includes(order.draft_status)) {
          return new Response(
            JSON.stringify({ error: `Cannot cancel draft with status: ${order.draft_status}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData = {
          draft_status: 'cancelled',
          draft_cancelled_at: new Date().toISOString(),
          draft_cancelled_by: user.id,
          draft_cancelled_reason: reason || null,
          updated_at: new Date().toISOString(),
        };
        break;

      case 'delete':
        // Only customer can soft delete their own draft, admin can delete any
        if (!isAdmin && !isCustomer) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to delete this draft' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!['active', 'cancelled'].includes(order.draft_status)) {
          return new Response(
            JSON.stringify({ error: `Cannot delete draft with status: ${order.draft_status}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData = {
          draft_status: 'deleted',
          draft_deleted_at: new Date().toISOString(),
          draft_deleted_by: user.id,
          updated_at: new Date().toISOString(),
        };
        break;

      case 'restore':
        // Customer can restore cancelled drafts within window
        // Admin can restore any draft
        if (!isAdmin && !isCustomer) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to restore this draft' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!['cancelled', 'deleted'].includes(order.draft_status)) {
          return new Response(
            JSON.stringify({ error: `Cannot restore draft with status: ${order.draft_status}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Check restore window for non-admins
        if (!isAdmin && order.draft_status === 'cancelled') {
          const { data: settings } = await supabase
            .from('order_settings')
            .select('setting_value')
            .eq('setting_key', 'draft_restore_window_hours')
            .single();
          
          const windowHours = parseInt(settings?.setting_value || '24');
          const cancelledAt = new Date(order.draft_cancelled_at);
          const windowEnd = new Date(cancelledAt.getTime() + windowHours * 60 * 60 * 1000);
          
          if (new Date() > windowEnd) {
            return new Response(
              JSON.stringify({ error: 'Restore window has expired' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        // Only admin can restore deleted drafts
        if (order.draft_status === 'deleted' && !isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only admins can restore deleted drafts' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get new expiration hours
        const { data: expSettings } = await supabase
          .from('order_settings')
          .select('setting_value')
          .eq('setting_key', 'draft_expiration_hours')
          .single();
        
        const expirationHours = parseInt(expSettings?.setting_value || '48');
        
        updateData = {
          draft_status: 'active',
          draft_expires_at: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString(),
          draft_cancelled_at: null,
          draft_cancelled_by: null,
          draft_cancelled_reason: null,
          draft_deleted_at: null,
          draft_deleted_by: null,
          updated_at: new Date().toISOString(),
        };
        auditAction = 'restored';
        break;

      case 'reject':
        // Only merchant can reject submitted drafts
        if (!isMerchant || !isOrderMerchant) {
          return new Response(
            JSON.stringify({ error: 'Only the merchant can reject this draft' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (order.draft_status !== 'submitted') {
          return new Response(
            JSON.stringify({ error: 'Can only reject submitted drafts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!reason) {
          return new Response(
            JSON.stringify({ error: 'Rejection reason is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData = {
          draft_status: 'rejected',
          draft_rejected_at: new Date().toISOString(),
          draft_rejected_by: user.id,
          draft_rejection_reason: reason,
          updated_at: new Date().toISOString(),
        };
        break;

      case 'request_changes':
        // Only merchant can request changes on submitted drafts
        if (!isMerchant || !isOrderMerchant) {
          return new Response(
            JSON.stringify({ error: 'Only the merchant can request changes' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (order.draft_status !== 'submitted') {
          return new Response(
            JSON.stringify({ error: 'Can only request changes on submitted drafts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!reason) {
          return new Response(
            JSON.stringify({ error: 'Change request reason is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Extend expiration for customer to make changes
        const { data: changeSettings } = await supabase
          .from('order_settings')
          .select('setting_value')
          .eq('setting_key', 'draft_expiration_hours')
          .single();
        
        const changeExpirationHours = parseInt(changeSettings?.setting_value || '48');
        
        updateData = {
          draft_status: 'change_requested',
          draft_change_requested_at: new Date().toISOString(),
          draft_change_requested_by: user.id,
          draft_change_request_reason: reason,
          draft_expires_at: new Date(Date.now() + changeExpirationHours * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };
        auditAction = 'change_requested';
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabase.from('draft_audit_logs').insert({
      order_id: orderId,
      action_type: auditAction,
      performed_by: user.id,
      performed_by_role: performerRole,
      previous_state: {
        draft_status: order.draft_status,
        amount: order.amount,
        product_name: order.product_name,
      },
      new_state: {
        draft_status: updatedOrder.draft_status,
        amount: updatedOrder.amount,
        product_name: updatedOrder.product_name,
      },
      reason: reason || null,
    });

    // Create notification for relevant party
    const notificationData: { user_id: string; title: string; message: string; order_id: string; type: string }[] = [];

    if (action === 'submit') {
      // Notify merchant
      notificationData.push({
        user_id: order.merchant_id,
        title: 'New Draft Payment Submitted',
        message: `A customer has submitted a draft payment of ₹${order.amount} for "${order.product_name}"`,
        order_id: orderId,
        type: 'order',
      });
    } else if (action === 'cancel' && performerRole === 'customer') {
      // Notify merchant if it was submitted
      if (order.draft_status === 'submitted') {
        notificationData.push({
          user_id: order.merchant_id,
          title: 'Draft Payment Cancelled',
          message: `Customer cancelled their draft payment for "${order.product_name}"`,
          order_id: orderId,
          type: 'order',
        });
      }
    } else if (action === 'reject' || action === 'request_changes') {
      // Notify customer
      notificationData.push({
        user_id: order.customer_id,
        title: action === 'reject' ? 'Draft Payment Rejected' : 'Changes Requested',
        message: action === 'reject' 
          ? `Merchant rejected your draft payment: ${reason}`
          : `Merchant requested changes: ${reason}`,
        order_id: orderId,
        type: 'order',
      });
    }

    if (notificationData.length > 0) {
      await supabase.from('notifications').insert(notificationData);
    }

    console.log(`Draft action ${action} completed successfully for order ${orderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: updatedOrder,
        message: `Draft ${action} successful`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Draft action error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});