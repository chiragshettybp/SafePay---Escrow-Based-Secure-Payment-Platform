import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useDisputeDetails, useDisputes } from "@/hooks/useDisputes";
import { useOrders } from "@/hooks/useOrders";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  Clock,
  Home,
  Eye,
  Loader2
} from "lucide-react";

export default function DisputeResult() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { dispute, updates, files, isLoadingDispute } = useDisputeDetails(disputeId || "");
  const { confirmDeliveryAfterDispute, isConfirmingDelivery } = useDisputes();
  const { orders } = useOrders();

  if (isLoadingDispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Card className="glass-card">
              <CardContent className="py-12">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The dispute you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")}>
                  Back to Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  // Redirect if not resolved
  if (dispute.status !== "resolved" && dispute.status !== "closed") {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dispute In Progress</h2>
                <p className="text-muted-foreground mb-6">
                  This dispute is still being reviewed. Check back later for the result.
                </p>
                <Button onClick={() => navigate(`/dispute/${disputeId}/status`)}>
                  View Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const isCustomerWin = dispute.final_decision === "customer_won" || 
    (dispute.refund_amount && dispute.refund_amount > 0);
  const isPartialRefund = dispute.final_decision === "partial_refund";
  const isMerchantWin = dispute.final_decision === "merchant_won" || 
    dispute.final_decision === "Merchant won" ||
    dispute.final_decision === "Customer withdrew dispute" ||
    dispute.final_decision === "Customer confirmed delivery";
  
  // Check if order is still not completed (escrow not released yet)
  const relatedOrder = orders.find(o => o.id === dispute.order_id);
  const canConfirmDelivery = relatedOrder && relatedOrder.status !== "completed" && relatedOrder.status !== "refunded";
  
  const handleConfirmDelivery = () => {
    if (!disputeId || !dispute?.order_id) return;
    confirmDeliveryAfterDispute({ disputeId, orderId: dispute.order_id }, {
      onSuccess: () => navigate("/orders"),
    });
  };

  const getResultConfig = () => {
    if (dispute.status === "closed") {
      return {
        icon: <XCircle className="h-16 w-16" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted/30",
        title: "Dispute Closed",
        description: "This dispute was closed without a resolution.",
      };
    }
    if (isCustomerWin) {
      return {
        icon: <CheckCircle className="h-16 w-16" />,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        title: "Dispute Resolved in Your Favor",
        description: "Your dispute has been resolved. A full refund will be processed.",
      };
    }
    if (isPartialRefund) {
      return {
        icon: <DollarSign className="h-16 w-16" />,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        title: "Partial Refund Approved",
        description: "A partial refund has been approved for your dispute.",
      };
    }
    if (isMerchantWin) {
      return {
        icon: <XCircle className="h-16 w-16" />,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        title: "Dispute Resolved for Merchant",
        description: "After review, the dispute was resolved in favor of the merchant.",
      };
    }
    return {
      icon: <CheckCircle className="h-16 w-16" />,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      title: "Dispute Resolved",
      description: "Your dispute has been resolved.",
    };
  };

  const resultConfig = getResultConfig();

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Dispute Result
            </h1>
            <p className="text-muted-foreground mt-1">
              Final decision for your dispute
            </p>
          </div>

          <div className="flex-1 pb-24 sm:pb-6 space-y-6 max-w-3xl mx-auto w-full">
            {/* Result Banner */}
            <Card className={`glass-card ${resultConfig.bgColor} border-0`}>
              <CardContent className="pt-8 pb-8 text-center">
                <div className={`${resultConfig.color} mx-auto mb-4`}>
                  {resultConfig.icon}
                </div>
                <h2 className="text-2xl font-bold mb-2">{resultConfig.title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {resultConfig.description}
                </p>
                {dispute.refund_amount && dispute.refund_amount > 0 && (
                  <div className="mt-6 p-4 rounded-lg bg-background/50 inline-block">
                    <p className="text-sm text-muted-foreground">Refund Amount</p>
                    <p className="text-3xl font-bold text-green-500">
                      ${dispute.refund_amount.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decision Details */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Decision Details</CardTitle>
                <CardDescription>
                  Summary of the dispute resolution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Issue Type</p>
                    <p className="font-medium">{dispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resolution Date</p>
                    <p className="font-medium">
                      {format(new Date(dispute.updated_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {format(new Date(dispute.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={dispute.status === "resolved" ? "default" : "secondary"}>
                      {dispute.status === "resolved" ? "Resolved" : "Closed"}
                    </Badge>
                  </div>
                </div>

                {dispute.resolution_notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Resolution Notes</p>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <p className="text-sm">{dispute.resolution_notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Full Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No timeline events recorded
                  </p>
                ) : (
                  <div className="space-y-4">
                    {updates.map((update, index) => (
                      <div key={update.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            index === updates.length - 1 ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                          {index < updates.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-sm">{update.title}</p>
                          {update.description && (
                            <p className="text-sm text-muted-foreground mt-1">{update.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence Files */}
            {files.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Submitted Evidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {files.map((file) => (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => window.open(file.file_url, "_blank")}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{file.file_name}</span>
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirm Delivery Action for resolved disputes */}
            {canConfirmDelivery && (
              <Card className="glass-card border-green-500/20 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      If you received your order satisfactorily, confirm delivery to release payment to the merchant.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Delivery & Release Payment
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Delivery?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will confirm that you received the order. 
                            The escrowed payment will be released to the merchant immediately.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleConfirmDelivery}
                            disabled={isConfirmingDelivery}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isConfirmingDelivery ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Processing...
                              </>
                            ) : (
                              "Confirm & Release Payment"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/order/${dispute.order_id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Order
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
