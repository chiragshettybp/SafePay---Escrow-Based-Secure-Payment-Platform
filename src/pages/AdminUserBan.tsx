import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminUserDetails, useAdminUserAction } from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  AlertTriangle,
  Ban,
  AlertCircle,
  ShoppingCart,
  Scale,
} from 'lucide-react';

type ActionType = 'warn' | 'suspend' | 'ban';

export default function AdminUserBan() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, orders, disputes, isLoading } = useAdminUserDetails(user_id || '');
  const { executeAction, isSubmitting } = useAdminUserAction();

  const [action, setAction] = useState<ActionType>('warn');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const actionParam = searchParams.get('action') as ActionType;
    if (actionParam && ['warn', 'suspend', 'ban'].includes(actionParam)) {
      setAction(actionParam);
    }
  }, [searchParams]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'warned':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warned</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Banned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user_id || !reason || !confirmed) return;

    const success = await executeAction(
      user_id,
      action,
      reason,
      notes || undefined,
      action === 'suspend' ? durationDays : undefined
    );

    if (success) {
      navigate(`/admin/users/${user_id}`);
    }
  };

  const getActionConfig = () => {
    switch (action) {
      case 'warn':
        return {
          title: 'Issue Warning',
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          color: 'yellow',
          description: 'Issue a warning to this user. They will continue to have access but the warning will be recorded.',
          buttonText: 'Issue Warning',
          buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'suspend':
        return {
          title: 'Suspend User',
          icon: <AlertCircle className="h-6 w-6 text-orange-500" />,
          color: 'orange',
          description: 'Temporarily suspend this user. They will not be able to login or place orders during the suspension period.',
          buttonText: 'Suspend User',
          buttonClass: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'ban':
        return {
          title: 'Ban User',
          icon: <Ban className="h-6 w-6 text-red-500" />,
          color: 'red',
          description: 'Permanently ban this user. They will not be able to login or access the platform.',
          buttonText: 'Ban User Permanently',
          buttonClass: 'bg-red-600 hover:bg-red-700',
        };
    }
  };

  const config = getActionConfig();
  const activeOrders = orders?.filter(o => !['completed', 'cancelled', 'refunded'].includes(o.status)) || [];
  const openDisputes = disputes?.filter(d => d.status === 'open' || d.status === 'under_review') || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user_id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {config.icon}
              {config.title}
            </h1>
            <p className="text-muted-foreground">Take enforcement action on user account</p>
          </div>
        </div>

        {/* User Context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">User ID</div>
                <div className="font-mono text-sm">{user.user_id}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Status</div>
                <div>{getStatusBadge(user.account_status)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{user.phone || 'Not provided'}</div>
              </div>
            </div>

            {/* Active Orders & Disputes Warning */}
            {(activeOrders.length > 0 || openDisputes.length > 0) && (
              <Alert className="mt-4 border-orange-500/50 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-500">Active Items</AlertTitle>
                <AlertDescription className="text-orange-400">
                  <div className="flex gap-4 mt-2">
                    {activeOrders.length > 0 && (
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-4 w-4" />
                        {activeOrders.length} active order(s)
                      </div>
                    )}
                    {openDisputes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Scale className="h-4 w-4" />
                        {openDisputes.length} open dispute(s)
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Action Form */}
        <Card>
          <CardHeader>
            <CardTitle>Action Details</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={action} onValueChange={(v) => setAction(v as ActionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Issue Warning
                      </span>
                    </SelectItem>
                    <SelectItem value="suspend" disabled={user.account_status === 'suspended' || user.account_status === 'banned'}>
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Suspend User
                      </span>
                    </SelectItem>
                    <SelectItem value="ban" disabled={user.account_status === 'banned'}>
                      <span className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-500" />
                        Ban User
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                />
              </div>

              {action === 'suspend' && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Suspension Duration (days) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any internal notes for admin reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Warning for Ban */}
              {action === 'ban' && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <Ban className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-red-500">Permanent Action</AlertTitle>
                  <AlertDescription className="text-red-400">
                    Banning a user is permanent. They will lose all access to the platform immediately.
                    This action should only be taken for serious violations.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
                  I understand the impact of this action and confirm that I want to {action === 'warn' ? 'issue a warning to' : action === 'suspend' ? 'suspend' : 'permanently ban'} this user.
                </Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin/users/${user_id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!reason || !confirmed || isSubmitting}
                  className={`flex-1 ${config.buttonClass}`}
                >
                  {isSubmitting ? 'Processing...' : config.buttonText}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
