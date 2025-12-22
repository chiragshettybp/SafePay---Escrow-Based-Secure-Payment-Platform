import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminUserDetails } from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  User,
  ShoppingCart,
  AlertTriangle,
  Ban,
  Calendar,
  Phone,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function AdminUserDetails() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { user, warnings, bans, orders, disputes, isLoading } = useAdminUserDetails(user_id || '');

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

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'disputed':
        return <Badge className="bg-orange-500/20 text-orange-400"><AlertCircle className="h-3 w-3 mr-1" />Disputed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
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
                  <div className="text-sm text-muted-foreground">Joined</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Account Status</div>
                  <div className="font-medium">{getStatusBadge(user.account_status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{(user as any).total_orders || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold flex items-center">
                    <DollarSign className="h-5 w-5" />
                    ₹{((user as any).total_spend || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Spend</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{(user as any).completed_orders || 0}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">{user.disputes_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Disputes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Last 10 orders by this user</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders found</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{order.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{Number(order.amount).toLocaleString()}</div>
                        {getOrderStatusBadge(order.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disputes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Disputes
              </CardTitle>
              <CardDescription>Disputes raised by this user</CardDescription>
            </CardHeader>
            <CardContent>
              {disputes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No disputes found</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {disputes.map((dispute) => (
                    <div key={dispute.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{dispute.reason}</div>
                          <div className="text-sm text-muted-foreground">
                            {dispute.orders?.product_name} • ₹{Number(dispute.orders?.amount || 0).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="secondary">{dispute.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enforcement History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Enforcement History
            </CardTitle>
            <CardDescription>Warnings, suspensions, and bans</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="warnings">
                <AccordionTrigger>
                  Warnings ({warnings.length})
                </AccordionTrigger>
                <AccordionContent>
                  {warnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No warnings issued</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warnings.map((warning) => (
                          <TableRow key={warning.id}>
                            <TableCell>{format(new Date(warning.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{warning.reason}</TableCell>
                            <TableCell className="text-muted-foreground">{warning.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="bans">
                <AccordionTrigger>
                  Suspensions & Bans ({bans.length})
                </AccordionTrigger>
                <AccordionContent>
                  {bans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No suspensions or bans</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bans.map((ban) => (
                          <TableRow key={ban.id}>
                            <TableCell>{format(new Date(ban.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={ban.action_type === 'ban' ? 'destructive' : 'secondary'}>
                                {ban.action_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{ban.reason}</TableCell>
                            <TableCell>
                              {ban.duration_days ? `${ban.duration_days} days` : 'Permanent'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ban.is_active ? 'destructive' : 'secondary'}>
                                {ban.is_active ? 'Active' : 'Expired'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Take action on this user account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/users/${user_id}/ban?action=warn`)}
                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Issue Warning
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/users/${user_id}/ban?action=suspend`)}
                className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                disabled={user.account_status === 'suspended' || user.account_status === 'banned'}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Suspend User
              </Button>
              <Button
                variant="destructive"
                onClick={() => navigate(`/admin/users/${user_id}/ban?action=ban`)}
                disabled={user.account_status === 'banned'}
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban User
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
