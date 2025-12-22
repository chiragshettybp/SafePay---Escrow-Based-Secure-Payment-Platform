import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  User,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Phone,
  Shield,
  History,
  Building2,
  Hash,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface BankAccount {
  id: string;
  customer_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  is_verified: boolean;
  verification_status: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  created_at: string;
}

interface KycStatus {
  status: string;
}

export default function AdminUserBankVerify() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [kycStatus, setKycStatus] = useState<string>('not_started');
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'reupload' | null>(null);
  const [reason, setReason] = useState('');

  const fetchData = useCallback(async () => {
    if (!user_id) return;
    setIsLoading(true);

    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (profileError) throw profileError;
      setUser(profile);

      // Fetch KYC status
      const { data: kyc } = await supabase
        .from('kyc_records')
        .select('status')
        .eq('user_id', user_id)
        .maybeSingle();

      setKycStatus(kyc?.status || 'not_started');

      // Fetch bank accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('customer_id', user_id)
        .order('is_default', { ascending: false });

      if (accountsError) throw accountsError;
      setBankAccounts(accounts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
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
      .channel(`user-bank-${user_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank_accounts', filter: `customer_id=eq.${user_id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, fetchData]);

  const handleAction = async () => {
    if (!selectedAccount || !actionType) return;
    if ((actionType === 'reject' || actionType === 'reupload') && !reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason',
        variant: 'destructive',
      });
      return;
    }

    // Prevent duplicate submissions
    if (isSubmitting) return;

    // Prevent duplicate approvals
    if (actionType === 'approve' && selectedAccount.verification_status === 'verified') {
      toast({
        title: 'Already Verified',
        description: 'This bank account is already verified',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const newStatus = actionType === 'approve' ? 'verified' : actionType === 'reject' ? 'rejected' : 'pending';
      const isVerified = actionType === 'approve';

      // Update bank account status
      const { data: updatedAccount, error: updateError } = await supabase
        .from('bank_accounts')
        .update({
          verification_status: newStatus,
          is_verified: isVerified,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAccount.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Log to verification history
      const { error: logError } = await supabase.from('user_verification_history').insert({
        user_id: user_id,
        action_type: `bank_${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'reupload_requested'}`,
        admin_id: session.user.id,
        reason: reason || null,
        metadata: { bank_account_id: selectedAccount.id, account_number_masked: maskAccountNumber(selectedAccount.account_number) },
      });

      if (logError) {
        console.error('Log error:', logError);
      }

      // Immediately update local state for instant UI feedback
      setBankAccounts((prev) =>
        prev.map((acc) =>
          acc.id === selectedAccount.id
            ? { ...acc, verification_status: newStatus, is_verified: isVerified, updated_at: new Date().toISOString() }
            : acc
        )
      );

      toast({
        title: 'Success',
        description: `Bank account ${actionType === 'approve' ? 'verified' : actionType === 'reject' ? 'rejected' : 're-upload requested'} successfully`,
      });

      setActionType(null);
      setReason('');
      setSelectedAccount(null);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update bank account status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><RefreshCw className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const getKycStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">KYC Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">KYC Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">KYC Pending</Badge>;
      default:
        return <Badge variant="secondary">KYC Not Started</Badge>;
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return 'N/A';
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
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
            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user_id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Bank Account Verification
              </h1>
              <p className="text-muted-foreground">{user.full_name || 'Unnamed User'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/kyc`)}>
              <Shield className="h-4 w-4 mr-2" />
              KYC Verification
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/verification-history`)}>
              <History className="h-4 w-4 mr-2" />
              Verification History
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Full Name</div>
                  <div className="font-medium">{user.full_name || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {user.phone || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Account Status</div>
                  <Badge variant={user.account_status === 'active' ? 'default' : 'secondary'}>
                    {user.account_status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">KYC Status</div>
                  {getKycStatusBadge(kycStatus)}
                </div>
              </div>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate(`/admin/users/${user_id}`)}
              >
                View Full Profile →
              </Button>
            </CardContent>
          </Card>

          {/* Bank Accounts List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Accounts
              </CardTitle>
              <CardDescription>Registered bank accounts for this user</CardDescription>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">No bank accounts registered</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAccount?.id === account.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedAccount(account)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{account.bank_name}</div>
                          <div className="text-sm text-muted-foreground">{account.account_holder_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                          {getStatusBadge(account.verification_status)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Account: </span>
                          <span className="font-mono">{maskAccountNumber(account.account_number)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">IFSC: </span>
                          <span className="font-mono">{account.ifsc_code}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type: </span>
                          <span className="capitalize">{account.account_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Added: </span>
                          <span>{format(new Date(account.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Account Actions */}
        {selectedAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Bank Account</CardTitle>
              <CardDescription>
                {selectedAccount.bank_name} - {maskAccountNumber(selectedAccount.account_number)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionType ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="font-medium">Action: </span>
                    {actionType === 'approve' && <span className="text-green-400">Approve Bank Account</span>}
                    {actionType === 'reject' && <span className="text-red-400">Reject Bank Account</span>}
                    {actionType === 'reupload' && <span className="text-yellow-400">Request Re-Upload</span>}
                  </div>
                  {actionType !== 'approve' && (
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
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAction}
                      disabled={isSubmitting || (actionType !== 'approve' && !reason.trim())}
                      className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm Action'}
                    </Button>
                    <Button variant="outline" onClick={() => { setActionType(null); setReason(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setActionType('approve')}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={selectedAccount.verification_status === 'verified'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Bank Account
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setActionType('reject')}
                    disabled={selectedAccount.verification_status === 'rejected'}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Bank Account
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActionType('reupload')}
                    className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Request Re-Upload
                  </Button>
                </div>
              )}

              {kycStatus !== 'approved' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    KYC Not Approved
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This user's KYC is not approved. Payouts and refunds may be blocked even if bank details are verified.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}