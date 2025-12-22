import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useOrder, OrderStatus } from "@/hooks/useOrders";
import { useOrderEvents } from "@/hooks/useOrderEvents";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  IndianRupee,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Truck,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "secondary", color: "text-secondary" },
  draft: { label: "Draft", variant: "secondary", color: "text-muted-foreground" },
  escrow_locked: { label: "Escrow Locked", variant: "default", color: "text-primary" },
  in_progress: { label: "In Progress", variant: "default", color: "text-primary" },
  delivered: { label: "Delivered", variant: "default", color: "text-primary" },
  completed: { label: "Completed", variant: "outline", color: "text-success" },
  disputed: { label: "Disputed", variant: "destructive", color: "text-destructive" },
  refunded: { label: "Refunded", variant: "outline", color: "text-muted-foreground" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "text-destructive" },
};

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(orderId || "");
  const { data: orderEvents, isLoading: eventsLoading } = useOrderEvents(orderId || "");

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
              The order you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const config = statusConfig[order.status];

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Order Details</h1>
                <p className="text-muted-foreground font-mono text-sm">#{order.id}</p>
              </div>
            </div>
            <Badge variant={config.variant} className="self-start sm:self-center">
              {config.label}
            </Badge>
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{order.product_name}</h3>
                  {order.product_description && (
                    <p className="text-muted-foreground mt-1">{order.product_description}</p>
                  )}
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Merchant</p>
                      <p className="font-medium text-foreground">{order.merchant_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <IndianRupee className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount in Escrow</p>
                      <p className="font-medium text-foreground">{formatCurrency(order.amount)}</p>
                    </div>
                  </div>

                  {order.expected_delivery_date && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 sm:col-span-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Delivery</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(order.expected_delivery_date), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <OrderTimeline events={orderEvents || []} isLoading={eventsLoading} />
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1 sm:flex-none">
                  <Link to={`/order/${order.id}/tracking`}>
                    <Truck className="h-4 w-4 mr-2" />
                    Track Order
                  </Link>
                </Button>

                {/* Show Confirm Delivery only for non-disputed orders */}
                {(order.status === "delivered" || order.status === "escrow_locked" || order.status === "in_progress") && (
                  <Button asChild className="flex-1 sm:flex-none">
                    <Link to={`/order/${order.id}/confirm`}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Delivery
                    </Link>
                  </Button>
                )}

                {/* Show View Dispute for disputed orders */}
                {order.status === "disputed" && (
                  <Button asChild variant="secondary" className="flex-1 sm:flex-none">
                    <Link to={`/disputes`}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      View Dispute
                    </Link>
                  </Button>
                )}
                
                {/* Only show Report Issue for valid statuses */}
                {(order.status === "pending" || order.status === "in_progress" || order.status === "delivered" || order.status === "escrow_locked") && (
                  <Button asChild variant="destructive" className="flex-1 sm:flex-none">
                    <Link to={`/order/${order.id}/report`}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Link>
                  </Button>
                )}
                
                <Button asChild variant="outline" className="flex-1 sm:flex-none">
                  <Link to="/orders">Back to Orders</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
