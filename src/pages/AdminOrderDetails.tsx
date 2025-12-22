import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Seo } from "@/components/seo/Seo";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminOrderDetails } from "@/hooks/useAdminOrders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  RefreshCw,
  User,
  Store,
  ShoppingCart,
  CreditCard,
  Truck,
  History,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Send,
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  escrow_locked: { label: "Escrow Locked", variant: "default", icon: ShoppingCart },
  in_progress: { label: "In Progress", variant: "default", icon: Clock },
  delivered: { label: "Delivered", variant: "outline", icon: Truck },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  disputed: { label: "Disputed", variant: "destructive", icon: AlertTriangle },
  refunded: { label: "Refunded", variant: "secondary", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "secondary", icon: XCircle },
  draft: { label: "Draft", variant: "outline", icon: Clock },
};

const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  completed: { label: "Paid", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
  escrow: { label: "In Escrow", variant: "default" },
};

export default function AdminOrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const {
    isLoading,
    isSubmitting,
    order,
    events,
    payments,
    tracking,
    updateOrderStatus,
    addAdminNote,
    cancelOrder,
    refetch,
  } = useAdminOrderDetails(orderId || "");

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <p className="text-muted-foreground mb-4">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const paymentStatus = paymentStatusConfig[order.payment_status || "pending"] || paymentStatusConfig.pending;

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    await updateOrderStatus(newStatus, statusReason);
    setNewStatus("");
    setStatusReason("");
  };

  const handleAddNote = async () => {
    if (!adminNote.trim()) return;
    await addAdminNote(adminNote);
    setAdminNote("");
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    await cancelOrder(cancelReason);
    setCancelReason("");
  };

  return (
    <>
      <Seo
        title={`Order ${order.id.slice(0, 8)} | Admin`}
        description="View and manage order details"
        noIndex={true}
      />
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Order Details</h1>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-mono">{order.id}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="overview" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="shipments" className="gap-2">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Shipments</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="actions" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Actions</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Product</p>
                        <p className="font-medium">{order.product_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-medium text-lg">₹{Number(order.amount).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Order Status</p>
                        <Badge variant={status.variant} className="mt-1 gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Status</p>
                        <Badge variant={paymentStatus.variant} className="mt-1">
                          {paymentStatus.label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-medium">{format(new Date(order.created_at), "MMM d, yyyy h:mm a")}</p>
                      </div>
                      {order.expected_delivery_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Expected Delivery</p>
                          <p className="font-medium">{format(new Date(order.expected_delivery_date), "MMM d, yyyy")}</p>
                        </div>
                      )}
                    </div>
                    {order.product_description && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{order.product_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer & Merchant */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4" />
                        Customer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{order.customer_id.slice(0, 8)}...</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => navigate(`/admin/users/${order.customer_id}`)}
                      >
                        View Customer Profile →
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Store className="h-4 w-4" />
                        Merchant
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{order.merchant_business_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{order.merchant_id.slice(0, 8)}...</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => navigate(`/admin/merchants/${order.merchant_id}`)}
                      >
                        View Merchant Profile →
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                  <CardDescription>All payment transactions for this order</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No payment records found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">
                              {payment.transaction_reference || payment.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{Number(payment.amount).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={paymentStatusConfig[payment.status]?.variant || "secondary"}>
                                {paymentStatusConfig[payment.status]?.label || payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipments Tab */}
            <TabsContent value="shipments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!tracking ? (
                    <div className="text-center py-8">
                      <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No shipment information available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Carrier</p>
                          <p className="font-medium">{tracking.carrier || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking Number</p>
                          <p className="font-medium font-mono">{tracking.tracking_number || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant="default" className="mt-1">{tracking.status}</Badge>
                        </div>
                        {tracking.estimated_delivery && (
                          <div>
                            <p className="text-sm text-muted-foreground">Est. Delivery</p>
                            <p className="font-medium">{format(new Date(tracking.estimated_delivery), "MMM d, yyyy")}</p>
                          </div>
                        )}
                      </div>
                      {tracking.location && (
                        <div>
                          <p className="text-sm text-muted-foreground">Current Location</p>
                          <p className="font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {tracking.location}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Order Timeline
                  </CardTitle>
                  <CardDescription>Complete audit trail of all order events</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No events recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events.map((event, index) => (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            {index < events.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{event.title}</p>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(event.created_at), "MMM d, h:mm a")}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                            <Badge variant="outline" className="mt-2 text-xs">
                              {event.event_type}
                            </Badge>
                          </div>
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
                {/* Update Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Update Order Status
                    </CardTitle>
                    <CardDescription>Change the current order status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>New Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="escrow_locked">Escrow Locked</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Textarea
                        placeholder="Why are you changing the status?"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleStatusUpdate}
                      disabled={!newStatus || isSubmitting}
                    >
                      Update Status
                    </Button>
                  </CardContent>
                </Card>

                {/* Add Admin Note */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Add Admin Note
                    </CardTitle>
                    <CardDescription>Add an internal note to this order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Note</Label>
                      <Textarea
                        placeholder="Enter your note..."
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAddNote}
                      disabled={!adminNote.trim() || isSubmitting}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </CardContent>
                </Card>

                {/* Cancel Order */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      Cancel Order
                    </CardTitle>
                    <CardDescription>Permanently cancel this order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cancellation Reason</Label>
                      <Textarea
                        placeholder="Why is this order being cancelled?"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full"
                          disabled={!cancelReason.trim() || isSubmitting}
                        >
                          Cancel Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The order will be marked as cancelled
                            and any escrow funds may be refunded to the customer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Order</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelOrder}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, Cancel Order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate(`/admin/disputes?order_id=${order.id}`)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      View Related Disputes
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate(`/admin/payments/${order.id}`)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Payment
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
}
