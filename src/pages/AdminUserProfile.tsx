import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  MessageSquare,
  History,
  Settings,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
}

interface ActivityStats {
  totalOrders: number;
  totalSpend: number;
  refundCount: number;
  disputeCount: number;
  walletBalance: number;
  ticketCount: number;
}

interface VerificationStatus {
  kycStatus: string;
  bankStatus: string;
}

export default function AdminUserProfile() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ActivityStats>({
    totalOrders: 0,
    totalSpend: 0,
    refundCount: 0,
    disputeCount: 0,
    walletBalance: 0,
    ticketCount: 0,
  });
  const [verification, setVerification] = useState<VerificationStatus>({
    kycStatus: 'not_started',
    bankStatus: 'not_started',
  });

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

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, amount')
        .eq('customer_id', user_id);

      // Fetch refunds
      const { data: refunds } = await supabase
        .from('refunds')
        .select('id')
        .eq('customer_id', user_id);

      // Fetch disputes
      const { data: disputes } = await supabase
        .from('disputes')
        .select('id')
        .eq('customer_id', user_id);

      // Fetch wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('customer_id', user_id)
        .maybeSingle();

      // Fetch tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user_id);

      // Fetch KYC status
      const { data: kyc } = await supabase
        .from('kyc_records')
        .select('status')
        .eq('user_id', user_id)
        .maybeSingle();

      // Fetch bank verification status
      const { data: banks } = await supabase
        .from('bank_accounts')
        .select('verification_status')
        .eq('customer_id', user_id)
        .eq('is_default', true)
        .maybeSingle();

      setStats({
        totalOrders: orders?.length || 0,
        totalSpend: orders?.reduce((sum, o) => sum + Number(o.amount), 0) || 0,
        refundCount: refunds?.length || 0,
        disputeCount: disputes?.length || 0,
        walletBalance: wallet?.balance || 0,
        ticketCount: tickets?.length || 0,
      });

      setVerification({
        kycStatus: kyc?.status || 'not_started',
        bankStatus: banks?.verification_status || 'not_started',
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profile',
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
      .channel(`user-profile-${user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user_id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `customer_id=eq.${user_id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><Clock className="h-3 w-3 mr-1" />Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Banned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <User className="h-6 w-6" />
                {user.full_name || 'Unnamed User'}
              </h1>
              <p className="text-muted-foreground font-mono text-sm">{user.user_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(user.account_status)}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/controls`)}>
            <Settings className="h-4 w-4 mr-2" />
            Controls
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/wallet`)}>
            <Wallet className="h-4 w-4 mr-2" />
            Wallet
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/transactions`)}>
            <History className="h-4 w-4 mr-2" />
            Transactions
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/kyc`)}>
            <Shield className="h-4 w-4 mr-2" />
            KYC
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/bankdetails-verify`)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Bank Details
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">
                    {format(new Date(user.updated_at), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Account Status</div>
                  <div>{getStatusBadge(user.account_status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span>KYC Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  {getVerificationBadge(verification.kycStatus)}
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/users/${user_id}/kyc`)}>
                    View
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span>Bank Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  {getVerificationBadge(verification.bankStatus)}
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/users/${user_id}/bankdetails-verify`)}>
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity Snapshot
            </CardTitle>
            <CardDescription>Overview of user activity on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <IndianRupee className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold">₹{stats.totalSpend.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Spend</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <History className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold">{stats.refundCount}</div>
                <div className="text-sm text-muted-foreground">Refunds</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-400" />
                <div className="text-2xl font-bold">{stats.disputeCount}</div>
                <div className="text-sm text-muted-foreground">Disputes</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Wallet className="h-6 w-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold">₹{stats.walletBalance.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Wallet Balance</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold">{stats.ticketCount}</div>
                <div className="text-sm text-muted-foreground">Support Tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}