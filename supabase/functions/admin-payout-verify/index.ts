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
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { payout_id, decision, reason, admin_notes } = await req.json();

    if (!payout_id || !decision) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: payout_id and decision' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['approve', 'decline'].includes(decision)) {
      return new Response(
        JSON.stringify({ error: 'Invalid decision. Must be "approve" or "decline"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (decision === 'decline' && !reason) {
      return new Response(
        JSON.stringify({ error: 'Reason is required when declining a payout' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing payout ${payout_id} - Decision: ${decision}`);

    // First, try to find in merchant_payouts
    const { data: merchantPayout } = await supabase
      .from('merchant_payouts')
      .select('*')
      .eq('id', payout_id)
      .maybeSingle();

    // If not found, try wallet_transactions (customer withdrawals)
    const { data: customerWithdrawal } = !merchantPayout ? await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', payout_id)
      .eq('type', 'withdrawal')
      .maybeSingle() : { data: null };

    if (!merchantPayout && !customerWithdrawal) {
      console.error('Payout not found in either table');
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // Handle merchant payout
    if (merchantPayout) {
      console.log('Processing merchant payout');
      
      // Validate payout status
      if (!['processing', 'pending'].includes(merchantPayout.status)) {
        return new Response(
          JSON.stringify({ error: `Cannot process payout with status: ${merchantPayout.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get merchant wallet
      const { data: wallet, error: walletError } = await supabase
        .from('merchant_wallets')
        .select('*')
        .eq('merchant_id', merchantPayout.merchant_id)
        .single();

      if (walletError || !wallet) {
        console.error('Wallet not found:', walletError);
        return new Response(
          JSON.stringify({ error: 'Merchant wallet not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (decision === 'approve') {
        // Validate wallet balance
        if (wallet.available_balance < merchantPayout.amount) {
          return new Response(
            JSON.stringify({ error: 'Insufficient wallet balance for payout' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deduct from wallet balance
        const newAvailableBalance = wallet.available_balance - merchantPayout.amount;
        const newTotalPaidOut = wallet.total_paid_out + merchantPayout.net_amount;

        const { error: walletUpdateError } = await supabase
          .from('merchant_wallets')
          .update({
            available_balance: newAvailableBalance,
            total_paid_out: newTotalPaidOut,
            updated_at: now
          })
          .eq('id', wallet.id);

        if (walletUpdateError) {
          console.error('Wallet update error:', walletUpdateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update wallet balance' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update payout status to approved/paid
        const { error: payoutUpdateError } = await supabase
          .from('merchant_payouts')
          .update({
            status: 'paid',
            processed_at: now,
            notes: admin_notes || merchantPayout.notes,
            updated_at: now
          })
          .eq('id', payout_id);

        if (payoutUpdateError) {
          console.error('Payout update error:', payoutUpdateError);
          // Rollback wallet update
          await supabase
            .from('merchant_wallets')
            .update({
              available_balance: wallet.available_balance,
              total_paid_out: wallet.total_paid_out,
              updated_at: now
            })
            .eq('id', wallet.id);

          return new Response(
            JSON.stringify({ error: 'Failed to update payout status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create notification for merchant
        await supabase
          .from('merchant_notifications')
          .insert({
            merchant_id: merchantPayout.merchant_id,
            type: 'payout',
            title: 'Payout Approved',
            body: `Your payout request of ₹${merchantPayout.net_amount.toLocaleString()} has been approved and is being processed.`,
            priority: 'high'
          });

        console.log(`Merchant payout ${payout_id} approved successfully`);
      } else {
        // Decline payout
        const { error: payoutUpdateError } = await supabase
          .from('merchant_payouts')
          .update({
            status: 'failed',
            failure_reason: reason,
            notes: admin_notes || merchantPayout.notes,
            updated_at: now
          })
          .eq('id', payout_id);

        if (payoutUpdateError) {
          console.error('Payout update error:', payoutUpdateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update payout status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create notification for merchant
        await supabase
          .from('merchant_notifications')
          .insert({
            merchant_id: merchantPayout.merchant_id,
            type: 'payout',
            title: 'Payout Declined',
            body: `Your payout request of ₹${merchantPayout.net_amount.toLocaleString()} has been declined. Reason: ${reason}`,
            priority: 'high'
          });

        console.log(`Merchant payout ${payout_id} declined successfully`);
      }
    } 
    // Handle customer withdrawal
    else if (customerWithdrawal) {
      console.log('Processing customer withdrawal');
      
      // Validate withdrawal status
      if (!['processing', 'pending'].includes(customerWithdrawal.status)) {
        return new Response(
          JSON.stringify({ error: `Cannot process withdrawal with status: ${customerWithdrawal.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (decision === 'approve') {
        // Update withdrawal status to success
        const { error: withdrawalUpdateError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'success',
            updated_at: now
          })
          .eq('id', payout_id);

        if (withdrawalUpdateError) {
          console.error('Withdrawal update error:', withdrawalUpdateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update withdrawal status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create notification for customer
        await supabase
          .from('notifications')
          .insert({
            user_id: customerWithdrawal.customer_id,
            type: 'wallet',
            title: 'Withdrawal Approved',
            message: `Your withdrawal request of ₹${customerWithdrawal.amount.toLocaleString()} has been approved and is being processed.`
          });

        console.log(`Customer withdrawal ${payout_id} approved successfully`);
      } else {
        // Decline withdrawal - refund to wallet
        const { data: customerWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('customer_id', customerWithdrawal.customer_id)
          .single();

        if (customerWallet) {
          // Refund the amount back to wallet
          const { error: walletUpdateError } = await supabase
            .from('wallets')
            .update({
              balance: customerWallet.balance + customerWithdrawal.amount,
              updated_at: now
            })
            .eq('id', customerWallet.id);

          if (walletUpdateError) {
            console.error('Wallet refund error:', walletUpdateError);
          }
        }

        // Update withdrawal status to failed
        const { error: withdrawalUpdateError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'failed',
            updated_at: now
          })
          .eq('id', payout_id);

        if (withdrawalUpdateError) {
          console.error('Withdrawal update error:', withdrawalUpdateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update withdrawal status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create notification for customer
        await supabase
          .from('notifications')
          .insert({
            user_id: customerWithdrawal.customer_id,
            type: 'wallet',
            title: 'Withdrawal Declined',
            message: `Your withdrawal request of ₹${customerWithdrawal.amount.toLocaleString()} has been declined. Reason: ${reason}. The amount has been refunded to your wallet.`
          });

        console.log(`Customer withdrawal ${payout_id} declined successfully`);
      }
    }

    // Log admin action
    await supabase
      .from('admin_financial_actions_log')
      .insert({
        admin_id: user.id,
        action_type: decision === 'approve' ? 'payout_approved' : 'payout_declined',
        target_type: merchantPayout ? 'merchant_payout' : 'customer_withdrawal',
        target_id: payout_id,
        amount: merchantPayout?.amount || customerWithdrawal?.amount,
        reason: decision === 'decline' ? reason : null,
        metadata: { admin_notes }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: decision === 'approve' ? 'Payout approved and processed' : 'Payout declined',
        payout_id,
        payout_type: merchantPayout ? 'merchant' : 'customer'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
