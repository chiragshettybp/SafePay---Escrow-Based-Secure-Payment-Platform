import { Link, useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantOrderDetails } from "@/hooks/useMerchantOrderDetails";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  User,
  Phone,
  Calendar,
  Truck,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  MessageSquare,
  ExternalLink,
  MapPin,
  FileImage,
  Loader2,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  escrow_locked: { label: "Payment Locked", color: "bg-primary", icon: CreditCard },
  in_progress: { label: "In Transit", color: "bg-blue-500", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-500", icon: Package },
  completed: { label: "Completed", color: "bg-green-600", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive", icon: AlertTriangle },
  refunded: { label: "Refunded", color: "bg-red-500", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-gray-500", icon: Clock },
  draft: { label: "Draft", color: "bg-gray-400", icon: Clock },
};

export default function MerchantOrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    order,
    tracking,
    orderEvents,
    deliveryProofs,
    dispute,
    isLoading,
    error,
    updateStatus,
    isUpdating,
  } = useMerchantOrderDetails(orderId);

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </MerchantLayout>
    );
  }

  if (error || !order) {
    return (
      <MerchantLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This order doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/merchant/orders">Back to Orders</Link>
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  const statusInfo = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  const canAddTracking = ["pending", "escrow_locked"].includes(order.status);
  const canEditTracking = ["in_progress"].includes(order.status) && tracking;
  const canUploadProof = ["in_progress", "delivered"].includes(order.status);
  const canMarkDelivered = order.status === "in_progress" && !order.delivered_at;

  return (
    <MerchantLayout>
      <Seo
        title={`Order ${order.id.slice(0, 8)} | Merchant Portal`}
        description="View order details and manage shipment"
        canonicalPath={`/merchant/order/${orderId}`}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/merchant/orders")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
                Order #{order.id.slice(0, 8)}
                <Badge variant="outline" className="ml-2">
                  <StatusIcon className="h-3 w-3 mr-1.5" />
                  {statusInfo.label}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Created {format(new Date(order.created_at), "MMMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{order.product_name}</p>
                    {order.product_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.product_description}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold">₹{Number(order.amount).toLocaleString()}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{order.customer_name || "Customer"}</p>
                    </div>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-medium">{order.customer_phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {order.expected_delivery_date && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Delivery</p>
                        <p className="font-medium">
                          {format(new Date(order.expected_delivery_date), "MMMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No timeline events yet
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {orderEvents.map((event, index) => (
                        <div key={event.id} className="relative pl-10">
                          <div
                            className={`absolute left-2 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${
                              index === orderEvents.length - 1
                                ? "bg-primary"
                                : "bg-muted"
                            }`}
                          >
                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            {event.description && (
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(event.created_at), "MMM dd, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tracking Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tracking Information
                </CardTitle>
                {canEditTracking && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/merchant/order/${orderId}/tracking/edit`}>
                      Edit Tracking
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {tracking ? (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking Number</p>
                        <p className="font-mono font-medium">{tracking.tracking_number || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Carrier</p>
                        <p className="font-medium">{tracking.carrier || "—"}</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant="outline">{tracking.status}</Badge>
                      </div>
                      {tracking.estimated_delivery && (
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                          <p className="font-medium">
                            {format(new Date(tracking.estimated_delivery), "MMM dd, yyyy")}
                          </p>
                        </div>
                      )}
                    </div>
                    {tracking.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{tracking.location}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">No tracking added yet</p>
                    {canAddTracking && (
                      <Button asChild>
                        <Link to={`/merchant/order/${orderId}/tracking/add`}>
                          <Truck className="h-4 w-4 mr-2" />
                          Add Tracking
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Proofs Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Delivery Proof
                </CardTitle>
                {canUploadProof && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/merchant/order/${orderId}/delivery-proof`}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Proof
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {deliveryProofs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {deliveryProofs.map((proof) => (
                      <div
                        key={proof.id}
                        className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileImage className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-xs text-white truncate">
                            {format(new Date(proof.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No delivery proof uploaded yet
                    </p>
                    {canUploadProof && (
                      <Button asChild>
                        <Link to={`/merchant/order/${orderId}/delivery-proof`}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Proof
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canAddTracking && (
                  <Button asChild className="w-full">
                    <Link to={`/merchant/order/${orderId}/tracking/add`}>
                      <Truck className="h-4 w-4 mr-2" />
                      Add Tracking
                    </Link>
                  </Button>
                )}
                {canEditTracking && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/merchant/order/${orderId}/tracking/edit`}>
                      <Truck className="h-4 w-4 mr-2" />
                      Edit Tracking
                    </Link>
                  </Button>
                )}
                {canUploadProof && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/merchant/order/${orderId}/delivery-proof`}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Delivery Proof
                    </Link>
                  </Button>
                )}
                {canMarkDelivered && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => updateStatus("delivered")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark as Delivered
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Escrow Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Escrow Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-medium">₹{Number(order.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                      {order.status === "completed"
                        ? "Released"
                        : order.status === "refunded"
                        ? "Refunded"
                        : "Held in Escrow"}
                    </Badge>
                  </div>
                  {order.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Released</span>
                      <span className="text-sm">
                        {format(new Date(order.completed_at), "MMM dd, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dispute Section */}
            {dispute && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Active Dispute
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{dispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="destructive">{dispute.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-sm">
                      {format(new Date(dispute.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Button asChild variant="destructive" className="w-full">
                    <Link to={`/merchant/dispute/${orderId}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond to Dispute
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
