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
  History,
  Shield,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VerificationHistoryItem {
  id: string;
  user_id: string;
  action_type: string;
  admin_id: string | null;
  reason: string | null;
  metadata: unknown;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
}

export default function AdminUserVerificationHistory() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);

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

      // Fetch verification history
      const { data: historyData, error: historyError } = await supabase
        .from('user_verification_history')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification history',
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
      .channel(`user-verification-history-${user_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_verification_history', filter: `user_id=eq.${user_id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, fetchData]);

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('approved')) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    if (actionType.includes('rejected')) {
      return <XCircle className="h-4 w-4 text-red-400" />;
    }
    if (actionType.includes('reupload')) {
      return <RefreshCw className="h-4 w-4 text-yellow-400" />;
    }
    if (actionType.includes('submitted')) {
      return <FileText className="h-4 w-4 text-blue-400" />;
    }
    return <History className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadge = (actionType: string) => {
    if (actionType.includes('kyc')) {
      return <Badge variant="outline" className="border-purple-500/30 text-purple-400">KYC</Badge>;
    }
    if (actionType.includes('bank')) {
      return <Badge variant="outline" className="border-blue-500/30 text-blue-400">Bank</Badge>;
    }
    return <Badge variant="secondary">Other</Badge>;
  };

  const formatActionType = (actionType: string) => {
    const formatted = actionType
      .replace('kyc_', 'KYC ')
      .replace('bank_', 'Bank ')
      .replace('_', ' ')
      .replace('approved', 'Approved')
      .replace('rejected', 'Rejected')
      .replace('reupload requested', 'Re-upload Requested')
      .replace('submitted', 'Submitted');
    return formatted;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
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
                <History className="h-6 w-6" />
                Verification History
              </h1>
              <p className="text-muted-foreground">{user.full_name || 'Unnamed User'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/kyc`)}>
              <Shield className="h-4 w-4 mr-2" />
              KYC Verification
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/bankdetails-verify`)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Bank Verification
            </Button>
          </div>
        </div>

        {/* User Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Full Name</div>
                <div className="font-medium">{user.full_name || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">User ID</div>
                <div className="font-mono text-sm">{user.user_id.slice(0, 8)}...</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Account Status</div>
                <Badge variant={user.account_status === 'active' ? 'default' : 'secondary'}>
                  {user.account_status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Events</div>
                <div className="font-medium">{history.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            <CardDescription>
              Immutable record of all verification actions (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">No verification history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Admin ID</TableHead>
                      <TableHead>Reason / Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{format(new Date(item.created_at), 'MMM d, yyyy')}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(item.created_at), 'HH:mm:ss')}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(item.action_type)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(item.action_type)}
                            <span>{formatActionType(item.action_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {item.admin_id ? `${item.admin_id.slice(0, 8)}...` : 'System'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {item.reason || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline View (Mobile-friendly) */}
        <Card className="lg:hidden">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getActionIcon(item.action_type)}
                    </div>
                    {index < history.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionBadge(item.action_type)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="font-medium">{formatActionType(item.action_type)}</div>
                    {item.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      By: {item.admin_id ? `Admin ${item.admin_id.slice(0, 8)}` : 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}