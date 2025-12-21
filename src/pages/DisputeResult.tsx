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
          <div className="space-y-4 p-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-sm glass-card text-center">
              <CardContent className="pt-6 pb-6">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Dispute Not Found</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  The dispute doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")} className="w-full">
                  Back to Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (dispute.status !== "resolved" && dispute.status !== "closed") {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-sm glass-card text-center">
              <CardContent className="pt-6 pb-6">
                <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Dispute In Progress</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Still being reviewed. Check back later.
                </p>
                <Button onClick={() => navigate(`/dispute/${disputeId}/status`)} className="w-full">
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
        icon: <XCircle className="h-12 w-12" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted/30",
        title: "Dispute Closed",
        description: "This dispute was closed without a resolution.",
      };
    }
    if (isCustomerWin) {
      return {
        icon: <CheckCircle className="h-12 w-12" />,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        title: "Resolved in Your Favor",
        description: "A full refund will be processed.",
      };
    }
    if (isPartialRefund) {
      return {
        icon: <DollarSign className="h-12 w-12" />,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        title: "Partial Refund",
        description: "A partial refund has been approved.",
      };
    }
    if (isMerchantWin) {
      return {
        icon: <XCircle className="h-12 w-12" />,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        title: "Resolved for Merchant",
        description: "The dispute was resolved in favor of the merchant.",
      };
    }
    return {
      icon: <CheckCircle className="h-12 w-12" />,
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
          <div className="mb-4 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 text-muted-foreground hover:text-foreground h-9"
              onClick={() => navigate("/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Orders
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Dispute Result
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Final decision for your dispute
            </p>
          </div>

          <div className="flex-1 pb-6 space-y-4 px-1">
            {/* Result Banner - Compact & Centered */}
            <Card className={`glass-card ${resultConfig.bgColor} border-0`}>
              <CardContent className="py-6 text-center">
                <div className={`${resultConfig.color} mx-auto mb-3`}>
                  {resultConfig.icon}
                </div>
                <h2 className="text-lg font-bold mb-1">{resultConfig.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {resultConfig.description}
                </p>
                {dispute.refund_amount && dispute.refund_amount > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-background/50 inline-block">
                    <p className="text-xs text-muted-foreground">Refund Amount</p>
                    <p className="text-2xl font-bold text-green-500">
                      ₹{dispute.refund_amount.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decision Details - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Decision Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Issue Type</p>
                    <p className="font-medium text-sm">{dispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resolution Date</p>
                    <p className="font-medium text-sm">
                      {format(new Date(dispute.updated_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium text-sm">
                      {format(new Date(dispute.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={dispute.status === "resolved" ? "default" : "secondary"} className="text-xs">
                      {dispute.status === "resolved" ? "Resolved" : "Closed"}
                    </Badge>
                  </div>
                </div>

                {dispute.resolution_notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Resolution Notes</p>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-sm">{dispute.resolution_notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No timeline events
                  </p>
                ) : (
                  <div className="space-y-3">
                    {updates.slice(0, 5).map((update, index) => (
                      <div key={update.id} className="flex gap-2.5">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            index === 0 ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                          {index < Math.min(updates.length - 1, 4) && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="font-medium text-sm">{update.title}</p>
                          {update.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{update.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(update.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence Files - Compact */}
            {files.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Evidence ({files.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 active:bg-muted/50"
                        onClick={() => window.open(file.file_url, "_blank")}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate flex-1">{file.file_name}</span>
                        <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirm Delivery Action */}
            {canConfirmDelivery && (
              <Card className="glass-card border-green-500/20 bg-green-500/5">
                <CardContent className="py-4 px-4 text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    If you received your order satisfactorily, confirm delivery.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full h-11 bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Delivery
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Delivery?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          Payment will be released to the merchant. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleConfirmDelivery}
                          disabled={isConfirmingDelivery}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                        >
                          {isConfirmingDelivery ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            "Confirm & Release"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            {/* Actions - Stacked */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => navigate(`/order/${dispute.order_id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Order
              </Button>
              <Button
                className="w-full h-11"
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
