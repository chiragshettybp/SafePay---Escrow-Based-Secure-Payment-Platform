import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useOrder, useOrders } from "@/hooks/useOrders";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, color: "text-secondary" },
  in_progress: { label: "In Progress", variant: "default" as const, color: "text-primary" },
  delivered: { label: "Delivered", variant: "default" as const, color: "text-primary" },
  completed: { label: "Completed", variant: "outline" as const, color: "text-success" },
  disputed: { label: "Disputed", variant: "destructive" as const, color: "text-destructive" },
  refunded: { label: "Refunded", variant: "outline" as const, color: "text-muted-foreground" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, color: "text-destructive" },
};

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(orderId || "");
  const { confirmDelivery, isConfirming } = useOrders();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirmDelivery = () => {
    if (order) {
      confirmDelivery(order.id);
      setShowConfirmDialog(false);
    }
  };

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
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount in Escrow</p>
                      <p className="font-medium text-foreground">${order.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Order Created</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  
                  {order.expected_delivery_date && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Expected Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.expected_delivery_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {order.delivered_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-success mt-2" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Delivered</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.delivered_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {order.completed_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-success mt-2" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.completed_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                {order.status === "delivered" && (
                  <Button onClick={() => setShowConfirmDialog(true)} className="flex-1 sm:flex-none">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Delivery
                  </Button>
                )}
                
                {(order.status === "pending" || order.status === "in_progress" || order.status === "delivered") && (
                  <Button asChild variant="destructive" className="flex-1 sm:flex-none">
                    <Link to={`/orders/${order.id}/report`}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Link>
                  </Button>
                )}
                
                <Button asChild variant="outline" className="flex-1 sm:flex-none">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confirm Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to confirm delivery? This will release the payment of ${order.amount.toFixed(2)} to the merchant. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelivery} disabled={isConfirming}>
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Delivery"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageTransition>
    </DashboardLayout>
  );
}
