import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminShipmentDetails } from '@/hooks/useAdminShipments';
import {
  ArrowLeft,
  Package,
  Truck,
  User,
  Store,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  FileText,
  RotateCcw,
  Plus,
  MessageSquare,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  pending: { label: 'Pending', variant: 'secondary', color: 'text-gray-500' },
  picked: { label: 'Picked Up', variant: 'outline', color: 'text-blue-500' },
  in_transit: { label: 'In Transit', variant: 'default', color: 'text-blue-500' },
  out_for_delivery: { label: 'Out for Delivery', variant: 'default', color: 'text-orange-500' },
  delivered: { label: 'Delivered', variant: 'default', color: 'text-green-500' },
  failed: { label: 'Failed', variant: 'destructive', color: 'text-red-500' },
  returned: { label: 'Returned', variant: 'destructive', color: 'text-red-500' },
};

const issueTypeOptions = [
  { value: 'delay', label: 'Delay' },
  { value: 'lost', label: 'Lost Package' },
  { value: 'damaged', label: 'Damaged Package' },
  { value: 'wrong_address', label: 'Wrong Address' },
  { value: 'customer_unavailable', label: 'Customer Unavailable' },
  { value: 'other', label: 'Other' },
];

const issueStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function AdminShipmentDetails() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [actionNotes, setActionNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; handler: () => Promise<void> } | null>(null);
  const [newIssue, setNewIssue] = useState({ type: '', description: '', orderImpact: '' });
  const [newExpectedDate, setNewExpectedDate] = useState('');

  const {
    shipment,
    trackingEvents,
    issues,
    actionLogs,
    loading,
    updateShipmentStatus,
    markDelayed,
    updateExpectedDelivery,
    markDelivered,
    triggerReturn,
    createIssue,
    updateIssueStatus,
    addAdminNote,
  } = useAdminShipmentDetails(shipmentId || '');

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!shipment) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Shipment Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The shipment you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/admin/shipments')}>
            Back to Shipments
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const config = statusConfig[shipment.status] || { label: shipment.status, variant: 'secondary', color: 'text-gray-500' };

  const confirmAction = (type: string, handler: () => Promise<void>) => {
    setPendingAction({ type, handler });
    setShowConfirmDialog(true);
  };

  const executeAction = async () => {
    if (pendingAction) {
      await pendingAction.handler();
      setPendingAction(null);
      setActionNotes('');
    }
    setShowConfirmDialog(false);
  };

  const handleCreateIssue = async () => {
    if (!newIssue.type || !newIssue.description) return;
    await createIssue(newIssue.type, newIssue.description, newIssue.orderImpact);
    setNewIssue({ type: '', description: '', orderImpact: '' });
  };

  const handleAddNote = async () => {
    if (!actionNotes.trim()) return;
    await addAdminNote(actionNotes);
    setActionNotes('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/shipments')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  Shipment {shipment.shipment_number || shipment.id.slice(0, 8)}
                </h1>
                <Badge variant={config.variant}>{config.label}</Badge>
                {shipment.is_delayed && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Delayed
                  </Badge>
                )}
              </div>
              {shipment.tracking_number && (
                <p className="text-muted-foreground">
                  Tracking: {shipment.tracking_number}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full md:w-auto overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Shipment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Carrier</p>
                      <p className="font-medium">
                        {shipment.logistics_provider || shipment.carrier || 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tracking Number</p>
                      <p className="font-medium">{shipment.tracking_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Location</p>
                      <p className="font-medium">{shipment.location || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium">
                        {shipment.expected_delivery_date || shipment.estimated_delivery
                          ? format(
                              new Date(shipment.expected_delivery_date || shipment.estimated_delivery!),
                              'MMM d, yyyy'
                            )
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {format(new Date(shipment.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Order */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Linked Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shipment.order ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Order ID</p>
                          <Link
                            to={`/admin/orders/${shipment.order.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {shipment.order.id.slice(0, 8)}
                          </Link>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Order Status</p>
                          <Badge variant="outline">{shipment.order.status}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Product</p>
                          <p className="font-medium">{shipment.order.product_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-medium">₹{shipment.order.amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/admin/orders/${shipment.order?.id}`)}
                      >
                        View Order Details
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No linked order found</p>
                  )}
                </CardContent>
              </Card>

              {/* Customer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {shipment.customer ? (
                    <>
                      <p className="font-medium">{shipment.customer.full_name || 'Unknown'}</p>
                      {shipment.customer.phone && (
                        <p className="text-sm text-muted-foreground">{shipment.customer.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Customer details not available</p>
                  )}
                </CardContent>
              </Card>

              {/* Merchant Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Merchant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {shipment.merchant ? (
                    <p className="font-medium">{shipment.merchant.business_name}</p>
                  ) : shipment.order?.merchant_name ? (
                    <p className="font-medium">{shipment.order.merchant_name}</p>
                  ) : (
                    <p className="text-muted-foreground">Merchant details not available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tracking Timeline</CardTitle>
                <CardDescription>
                  Real-time tracking events from the carrier
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trackingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No tracking events yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {trackingEvents.map((event, index) => (
                        <div key={event.id} className="relative pl-10">
                          <div
                            className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                              index === 0
                                ? 'bg-primary border-primary'
                                : 'bg-background border-border'
                            }`}
                          />
                          <div className="bg-accent/50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium">{event.status}</span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(event.occurred_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {event.location && (
                              <p className="text-sm flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-sm mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-6">
            {/* Create New Issue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Issue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Issue Type</Label>
                    <Select
                      value={newIssue.type}
                      onValueChange={(value) => setNewIssue({ ...newIssue, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Order Impact</Label>
                    <Input
                      placeholder="e.g., Delivery delayed by 2 days"
                      value={newIssue.orderImpact}
                      onChange={(e) => setNewIssue({ ...newIssue, orderImpact: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the issue in detail..."
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreateIssue}
                  disabled={!newIssue.type || !newIssue.description}
                >
                  Create Issue
                </Button>
              </CardContent>
            </Card>

            {/* Existing Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <p className="mt-4 text-muted-foreground">No issues reported</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {issues.map((issue) => (
                      <div key={issue.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={issue.issue_status === 'resolved' ? 'default' : 'destructive'}>
                              {issue.issue_type}
                            </Badge>
                            <Badge variant="outline">{issue.issue_status}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(issue.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-sm mb-3">{issue.description}</p>
                        {issue.order_impact && (
                          <p className="text-sm text-muted-foreground mb-3">
                            <strong>Impact:</strong> {issue.order_impact}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Select
                            value={issue.issue_status}
                            onValueChange={(value) => updateIssueStatus(issue.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {issueStatusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Action History</CardTitle>
                <CardDescription>
                  Complete audit trail of all admin actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actionLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No actions recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actionLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline">{log.action_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {log.description && <p className="text-sm mb-2">{log.description}</p>}
                        {log.admin_notes && (
                          <p className="text-sm text-muted-foreground italic">
                            Note: {log.admin_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Update */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Update Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusConfig).map(([status, cfg]) => (
                      <Button
                        key={status}
                        variant={shipment.status === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          confirmAction(`Update status to ${cfg.label}`, () =>
                            updateShipmentStatus(status, actionNotes)
                          )
                        }
                        disabled={shipment.status === status}
                      >
                        {cfg.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delay Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Delay Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant={shipment.is_delayed ? 'default' : 'destructive'}
                    className="w-full"
                    onClick={() =>
                      confirmAction(
                        shipment.is_delayed ? 'Clear delay status' : 'Mark as delayed',
                        () => markDelayed(!shipment.is_delayed, actionNotes)
                      )
                    }
                  >
                    {shipment.is_delayed ? 'Clear Delay Status' : 'Mark as Delayed'}
                  </Button>
                </CardContent>
              </Card>

              {/* Update Expected Delivery */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Expected Delivery Date
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="date"
                    value={newExpectedDate}
                    onChange={(e) => setNewExpectedDate(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={!newExpectedDate}
                    onClick={() =>
                      confirmAction('Update expected delivery date', () =>
                        updateExpectedDelivery(newExpectedDate, actionNotes)
                      )
                    }
                  >
                    Update Delivery Date
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full flex items-center gap-2"
                    onClick={() =>
                      confirmAction('Mark as delivered', () => markDelivered(actionNotes))
                    }
                    disabled={shipment.status === 'delivered'}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Delivered (Override)
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full flex items-center gap-2"
                    onClick={() =>
                      confirmAction('Initiate return process', () => triggerReturn(actionNotes))
                    }
                    disabled={shipment.status === 'returned'}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Trigger Return
                  </Button>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Add Admin Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add an internal note about this shipment..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddNote} disabled={!actionNotes.trim()}>
                    Add Note
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {pendingAction?.type}? This action will be logged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add notes for this action..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={2}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeAction}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
