import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { useOrder } from "@/hooks/useOrders";
import { useTracking } from "@/hooks/useTracking";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  RefreshCcw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

const trackingStatusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: "Pending", color: "bg-secondary", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-500", icon: Package },
  shipped: { label: "Shipped", color: "bg-blue-500", icon: Truck },
  in_transit: { label: "In Transit", color: "bg-primary", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "bg-warning", icon: Truck },
  delivered: { label: "Delivered", color: "bg-success", icon: CheckCircle },
};

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading: orderLoading } = useOrder(orderId || "");
  const { tracking, trackingEvents, isLoading: trackingLoading } = useTracking(orderId || "");

  const isLoading = orderLoading || trackingLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/orders">Back to Orders</Link>
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const statusConfig = tracking 
    ? trackingStatusConfig[tracking.status] || trackingStatusConfig.pending
    : trackingStatusConfig.pending;

  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Track Order</h1>
              <p className="text-muted-foreground">
                Order #{order.id.slice(0, 8)} • {order.product_name}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Current Status */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${statusConfig.color} text-white`}>
                  <StatusIcon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <Badge className={statusConfig.color + " text-white"}>
                    {statusConfig.label}
                  </Badge>
                  <h3 className="text-lg font-semibold text-foreground mt-2">
                    {tracking ? `Your order is ${statusConfig.label.toLowerCase()}` : 'Tracking information not available'}
                  </h3>
                  {tracking?.estimated_delivery && (
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      Estimated delivery: {format(new Date(tracking.estimated_delivery), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Details */}
          {tracking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {tracking.carrier && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Carrier</p>
                      <p className="font-medium text-foreground">{tracking.carrier}</p>
                    </div>
                  )}
                  {tracking.tracking_number && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Tracking Number</p>
                      <p className="font-mono text-foreground">{tracking.tracking_number}</p>
                    </div>
                  )}
                  {tracking.location && (
                    <div className="p-3 rounded-lg bg-muted/30 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Current Location</p>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {tracking.location}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tracking Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tracking History
              </CardTitle>
              <CardDescription>
                Follow your package's journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackingEvents.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-6">
                    {trackingEvents.map((event, index) => (
                      <div key={event.id} className="relative flex gap-4">
                        <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-medium text-foreground">{event.status}</p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          {event.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.occurred_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No tracking updates available yet. Check back later.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/orders/${orderId}`}>View Order Details</Link>
                </Button>
                {order.status === "delivered" && (
                  <Button asChild className="flex-1">
                    <Link to={`/orders/${orderId}/confirm`}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Delivery
                    </Link>
                  </Button>
                )}
                <Button asChild variant="destructive" className="flex-1">
                  <Link to={`/orders/${orderId}/report`}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Issue
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
