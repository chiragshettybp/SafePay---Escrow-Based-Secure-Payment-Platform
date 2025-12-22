import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  User,
  Wallet,
  Lock,
  Unlock,
  Plus,
  Minus,
  History,
  IndianRupee,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  account_status: string;
}

interface WalletData {
  id: string;
  customer_id: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUserWallet() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [actionType, setActionType] = useState<'credit' | 'debit' | 'freeze' | 'unfreeze' | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');

  const fetchData = useCallback(async () => {
    if (!user_id) return;
    setIsLoading(true);

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (profileError) throw profileError;
      setUser(profile);

      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('customer_id', user_id)
        .maybeSingle();

      if (walletError) throw walletError;
      setWallet(walletData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wallet data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user_id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!user_id) return;

    const channel = supabase
      .channel(`user-wallet-${user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `customer_id=eq.${user_id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, fetchData]);

  const handleAction = async () => {
    if (!actionType || !reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason',
        variant: 'destructive',
      });
      return;
    }

    if ((actionType === 'credit' || actionType === 'debit') && (!amount || parseFloat(amount) <= 0)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const amountValue = parseFloat(amount) || 0;

      if (actionType === 'freeze' || actionType === 'unfreeze') {
        // Update wallet status
        const { error } = await supabase
          .from('wallets')
          .update({ status: actionType === 'freeze' ? 'frozen' : 'active' })
          .eq('customer_id', user_id);

        if (error) throw error;
      } else if (wallet) {
        // Credit or debit
        const newBalance = actionType === 'credit' 
          ? wallet.balance + amountValue 
          : Math.max(0, wallet.balance - amountValue);

        // Update wallet balance
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet.id);

        if (walletError) throw walletError;

        // Create transaction record
        const { error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            customer_id: user_id!,
            type: actionType,
            amount: amountValue,
            description: reason,
            reference_type: 'admin_adjustment',
            status: 'completed',
          });

        if (txError) throw txError;
      }

      // Log to verification history
      await supabase.from('user_verification_history').insert({
        user_id: user_id,
        action_type: `wallet_${actionType}`,
        admin_id: session.user.id,
        reason: reason,
        metadata: { amount: amountValue },
      });

      toast({
        title: 'Success',
        description: `Wallet ${actionType} completed successfully`,
      });

      setActionType(null);
      setAmount('');
      setReason('');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete action',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="mt-4">
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user_id}/profile`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                User Wallet
              </h1>
              <p className="text-muted-foreground">{user.full_name || 'Unnamed User'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/transactions`)}>
            <History className="h-4 w-4 mr-2" />
            View Transactions
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                ₹{(wallet?.balance || 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Currency: {wallet?.currency || 'INR'}
              </p>
            </CardContent>
          </Card>

          {/* Wallet Status */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                className={wallet?.status === 'frozen' 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 text-lg px-4 py-2' 
                  : 'bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-2'
                }
              >
                {wallet?.status === 'frozen' ? (
                  <><Lock className="h-4 w-4 mr-2" />Frozen</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" />Active</>
                )}
              </Badge>
              {!wallet && (
                <p className="text-sm text-muted-foreground mt-2">No wallet found for this user</p>
              )}
            </CardContent>
          </Card>

          {/* Status Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Status Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-red-500/30 hover:bg-red-500/10"
                onClick={() => setActionType('freeze')}
                disabled={!wallet || wallet.status === 'frozen'}
              >
                <Lock className="h-4 w-4 mr-2 text-red-400" />
                Freeze Wallet
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-500/30 hover:bg-green-500/10"
                onClick={() => setActionType('unfreeze')}
                disabled={!wallet || wallet.status !== 'frozen'}
              >
                <Unlock className="h-4 w-4 mr-2 text-green-400" />
                Unfreeze Wallet
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Manual Adjustment */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Adjustment</CardTitle>
            <CardDescription>Credit or debit the user's wallet balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-24 flex-col gap-2 border-green-500/30 hover:bg-green-500/10"
                onClick={() => setActionType('credit')}
                disabled={!wallet || wallet.status === 'frozen'}
              >
                <Plus className="h-8 w-8 text-green-400" />
                <span>Credit Wallet</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-24 flex-col gap-2 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setActionType('debit')}
                disabled={!wallet || wallet.status === 'frozen'}
              >
                <Minus className="h-8 w-8 text-red-400" />
                <span>Debit Wallet</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Form */}
        {actionType && (
          <Card>
            <CardHeader>
              <CardTitle>
                {actionType === 'credit' && 'Credit Wallet'}
                {actionType === 'debit' && 'Debit Wallet'}
                {actionType === 'freeze' && 'Freeze Wallet'}
                {actionType === 'unfreeze' && 'Unfreeze Wallet'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(actionType === 'credit' || actionType === 'debit') && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    min={0}
                    step={0.01}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Required)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a reason for this action..."
                  rows={3}
                />
              </div>

              {actionType === 'freeze' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Freezing the wallet will prevent all transactions including withdrawals and refunds.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleAction}
                  disabled={isSubmitting || !reason.trim() || ((actionType === 'credit' || actionType === 'debit') && !amount)}
                  className={
                    actionType === 'credit' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'debit' || actionType === 'freeze' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-green-600 hover:bg-green-700'
                  }
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Action'}
                </Button>
                <Button variant="outline" onClick={() => { setActionType(null); setAmount(''); setReason(''); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}