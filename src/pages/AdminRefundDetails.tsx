import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminRefunds } from "@/hooks/useAdminRefunds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  FileText,
} from "lucide-react";

const statusColors: Record<string, string> = {
  initiated: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminRefundDetails() {
  const { refundId } = useParams();
  const navigate = useNavigate();
  const { useRefundDetails, retryRefund } = useAdminRefunds();
  const { data: refund, isLoading, error } = useRefundDetails(refundId || "");

  const canRetry = refund?.status === "failed";

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

  if (error || !refund) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Refund Not Found</h2>
          <Button onClick={() => navigate("/admin/refunds")}>Back to Refunds</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo title={`Refund ${refundId?.slice(0, 8)} | Admin`} description="View refund details" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/refunds")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Refund Details</h1>
                <Badge className={statusColors[refund.status]}>{refund.status}</Badge>
              </div>
              <p className="text-muted-foreground font-mono">#{refund.id}</p>
            </div>
          </div>
          {canRetry && (
            <Button onClick={() => retryRefund.mutate({ refundId: refund.id })} disabled={retryRefund.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${retryRefund.isPending ? "animate-spin" : ""}`} />
              Retry Refund
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Refund Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Refund Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold text-primary">₹{refund.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{refund.refund_type || "Full"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Initiated By</p>
                  <p className="font-medium capitalize">{refund.initiated_by || "System"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{format(new Date(refund.created_at), "PPp")}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="text-sm mt-1">{refund.reason}</p>
              </div>
              {refund.razorpay_refund_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Razorpay Refund ID</p>
                  <p className="font-mono text-sm">{refund.razorpay_refund_id}</p>
                </div>
              )}
              {refund.failure_reason && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Failure Reason</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{refund.failure_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order & Payment Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={`/admin/orders/${refund.order?.id}`} className="text-primary hover:underline font-medium">
                  {refund.order?.product_name}
                </Link>
                <p className="text-sm text-muted-foreground">{refund.order?.merchant_name}</p>
                <p className="text-sm">Order Amount: ₹{refund.order?.amount.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{refund.customer?.full_name || "Unknown"}</p>
                <p className="text-sm font-mono text-muted-foreground">{refund.customer_id}</p>
              </CardContent>
            </Card>

            {refund.payment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to={`/admin/payments/${refund.payment.id}`} className="text-primary hover:underline font-mono text-sm">
                    {refund.payment.id.slice(0, 16)}...
                  </Link>
                  {refund.payment.razorpay_payment_id && (
                    <p className="text-sm text-muted-foreground">RZP: {refund.payment.razorpay_payment_id}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Timeline */}
        {refund.events && refund.events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-6">
                  {refund.events.map((event) => (
                    <div key={event.id} className="relative pl-10">
                      <div className="absolute left-0 w-8 h-8 rounded-full bg-background border flex items-center justify-center">
                        {event.event_type.includes("success") ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : event.event_type.includes("fail") ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(event.created_at), "PPp")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
