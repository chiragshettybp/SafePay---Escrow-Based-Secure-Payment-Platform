import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  User,
  Shield,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogOut,
  ShoppingCart,
  History,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  created_at: string;
}

export default function AdminUserControls() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);

  const fetchData = useCallback(async () => {
    if (!user_id) return;
    setIsLoading(true);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (error) throw error;
      setUser(profile);
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
      .channel(`user-controls-${user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user_id}` }, () => fetchData())
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

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let newStatus = user?.account_status;
      
      switch (actionType) {
        case 'activate':
          newStatus = 'active';
          break;
        case 'deactivate':
          newStatus = 'inactive';
          break;
        case 'suspend':
          newStatus = 'suspended';
          // Create ban record
          await supabase.from('user_bans').insert({
            user_id: user_id,
            admin_id: session.user.id,
            action_type: 'suspend',
            reason: reason,
            notes: notes || null,
            duration_days: durationDays,
            expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
          });
          break;
        case 'ban':
          newStatus = 'banned';
          await supabase.from('user_bans').insert({
            user_id: user_id,
            admin_id: session.user.id,
            action_type: 'ban',
            reason: reason,
            notes: notes || null,
            is_active: true,
          });
          break;
        case 'warn':
          await supabase.from('user_warnings').insert({
            user_id: user_id,
            admin_id: session.user.id,
            reason: reason,
            notes: notes || null,
          });
          newStatus = 'warned';
          break;
        case 'unban':
          newStatus = 'active';
          // Deactivate existing bans
          await supabase
            .from('user_bans')
            .update({ is_active: false })
            .eq('user_id', user_id)
            .eq('is_active', true);
          break;
      }

      // Update profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('user_id', user_id);

      if (updateError) throw updateError;

      // Log action
      await supabase.from('user_verification_history').insert({
        user_id: user_id,
        action_type: `account_${actionType}`,
        admin_id: session.user.id,
        reason: reason,
        metadata: { notes, duration_days: durationDays },
      });

      toast({
        title: 'Success',
        description: `User ${actionType} action completed successfully`,
      });

      setActionType(null);
      setReason('');
      setNotes('');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute action',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'warned':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Warned</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><Clock className="h-3 w-3 mr-1" />Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Ban className="h-3 w-3 mr-1" />Banned</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user_id}/profile`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Settings className="h-6 w-6" />
                User Controls
              </h1>
              <p className="text-muted-foreground">{user.full_name || 'Unnamed User'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(user.account_status)}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account Status Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Status
              </CardTitle>
              <CardDescription>Control user account access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActionType('activate')}
                  disabled={user.account_status === 'active'}
                >
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Activate</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActionType('deactivate')}
                  disabled={user.account_status === 'inactive'}
                >
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span>Deactivate</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 border-yellow-500/30 hover:bg-yellow-500/10"
                  onClick={() => setActionType('warn')}
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <span>Issue Warning</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 border-orange-500/30 hover:bg-orange-500/10"
                  onClick={() => setActionType('suspend')}
                  disabled={user.account_status === 'suspended' || user.account_status === 'banned'}
                >
                  <Clock className="h-5 w-5 text-orange-400" />
                  <span>Suspend</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setActionType('ban')}
                  disabled={user.account_status === 'banned'}
                >
                  <Ban className="h-5 w-5 text-red-400" />
                  <span>Ban User</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActionType('unban')}
                  disabled={user.account_status !== 'banned' && user.account_status !== 'suspended'}
                >
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Unban/Unsuspend</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Form */}
          {actionType && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {actionType === 'activate' && 'Activate Account'}
                  {actionType === 'deactivate' && 'Deactivate Account'}
                  {actionType === 'warn' && 'Issue Warning'}
                  {actionType === 'suspend' && 'Suspend Account'}
                  {actionType === 'ban' && 'Ban User'}
                  {actionType === 'unban' && 'Remove Restrictions'}
                </CardTitle>
                <CardDescription>Complete the action details below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {actionType === 'suspend' && (
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (Days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)}
                      min={1}
                      max={365}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any internal notes..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAction}
                    disabled={isSubmitting || !reason.trim()}
                    className={
                      actionType === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                      actionType === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' :
                      actionType === 'warn' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-green-600 hover:bg-green-700'
                    }
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Action'}
                  </Button>
                  <Button variant="outline" onClick={() => { setActionType(null); setReason(''); setNotes(''); }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card className={actionType ? 'lg:col-span-2' : ''}>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/profile`)}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/wallet`)}>
                  <History className="h-4 w-4 mr-2" />
                  Wallet
                </Button>
                <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/verification-history`)}>
                  <History className="h-4 w-4 mr-2" />
                  Activity Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}