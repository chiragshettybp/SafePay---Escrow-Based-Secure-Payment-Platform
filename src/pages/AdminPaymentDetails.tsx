import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Store,
  ShoppingCart,
  Wallet,
  FileText,
  RefreshCw,
  CreditCard,
  Shield,
  Ban,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  locked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_escrow: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  released: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const gatewayStatusColors: Record<string, string> = {
  created: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const eventIcons: Record<string, React.ReactNode> = {
  order_created: <ShoppingCart className="h-4 w-4" />,
  status_change: <RefreshCw className="h-4 w-4" />,
  escrow_released: <CheckCircle className="h-4 w-4 text-green-500" />,
  admin_force_release: <CheckCircle className="h-4 w-4 text-green-500" />,
  admin_force_refund: <XCircle className="h-4 w-4 text-red-500" />,
  dispute_opened: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  payment_verified: <Shield className="h-4 w-4 text-green-500" />,
};

export default function AdminPaymentDetails() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { usePaymentDetails } = useAdminPayments();
  const { data: payment, isLoading, error } = usePaymentDetails(paymentId || "");

  const canForceRelease =
    payment && ["locked", "pending", "in_escrow"].includes(payment.status);
  const canForceRefund =
    payment && ["locked", "pending", "in_escrow"].includes(payment.status);

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

  if (error || !payment) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Payment Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The payment you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate("/admin/payments")}>
            Back to Payments
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo
        title={`Payment ${paymentId?.slice(0, 8)} | Admin`}
        description="View payment details and escrow timeline"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/payments")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Payment Details</h1>
                <Badge className={statusColors[payment.status] || "bg-gray-100"}>
                  {payment.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono">#{payment.id}</p>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="flex flex-wrap gap-2">
            {canForceRelease && (
              <Button
                variant="default"
                onClick={() =>
                  navigate(`/admin/payments/${payment.id}/force-release`)
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Force Release
              </Button>
            )}
            {canForceRefund && (
              <Button
                variant="destructive"
                onClick={() =>
                  navigate(`/admin/payments/${payment.id}/force-refund`)
                }
              >
                <XCircle className="h-4 w-4 mr-2" />
                Force Refund
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Payment & Order Info */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment ID</p>
                    <p className="font-mono text-sm">{payment.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <Link
                      to={`/admin/orders/${payment.order_id}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {payment.order_id.slice(0, 8)}...
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge className={statusColors[payment.status]}>
                      {payment.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Amount</span>
                    <span className="font-medium">
                      ₹{payment.order?.amount?.toLocaleString() || payment.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escrow Amount</span>
                    <span className="font-medium">
                      ₹{payment.amount.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Payable</span>
                    <span>₹{payment.amount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Razorpay Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Razorpay Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Gateway</p>
                    <p className="font-medium capitalize">{payment.payment_gateway || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gateway Status</p>
                    {payment.gateway_status ? (
                      <Badge className={gatewayStatusColors[payment.gateway_status] || "bg-gray-100"}>
                        {payment.gateway_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>

                {payment.razorpay_order_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Razorpay Order ID</p>
                    <p className="font-mono text-sm">{payment.razorpay_order_id}</p>
                  </div>
                )}

                {payment.razorpay_payment_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Razorpay Payment ID</p>
                    <p className="font-mono text-sm">{payment.razorpay_payment_id}</p>
                  </div>
                )}

                {payment.verified_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Verified At</p>
                    <p className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      {format(new Date(payment.verified_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                )}

                {payment.gateway_failure_reason && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <Ban className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Failure Reason</p>
                        <p className="text-sm text-red-600 dark:text-red-300">{payment.gateway_failure_reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {payment.transaction_reference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Reference</p>
                    <p className="font-mono text-sm">{payment.transaction_reference}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Info */}
            {payment.order && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{payment.order.product_name}</p>
                    {payment.order.product_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {payment.order.product_description}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Status</p>
                      <Badge variant="outline">{payment.order.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Expected Delivery
                      </p>
                      <p className="text-sm">
                        {payment.order.expected_delivery_date
                          ? format(
                              new Date(payment.order.expected_delivery_date),
                              "MMM d, yyyy"
                            )
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            {payment.customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {payment.customer.full_name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ID</p>
                      <p className="font-mono text-sm">{payment.customer_id}</p>
                    </div>
                    {payment.customer.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm">{payment.customer.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Merchant Info */}
            {payment.merchant && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Merchant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{payment.merchant.business_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{payment.merchant.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ID</p>
                      <p className="font-mono text-sm">{payment.merchant_id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Timeline & Disputes */}
          <div className="space-y-6">
            {/* Escrow Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Escrow Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payment.events && payment.events.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {payment.events.map((event, index) => (
                        <div key={event.id} className="relative pl-10">
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-background border flex items-center justify-center">
                            {eventIcons[event.event_type] || (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(
                                new Date(event.created_at),
                                "MMM d, yyyy h:mm a"
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No timeline events yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Disputes */}
            {payment.disputes && payment.disputes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Related Disputes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payment.disputes.map((dispute) => (
                      <Link
                        key={dispute.id}
                        to={`/admin/disputes/${dispute.id}`}
                        className="block p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">
                            #{dispute.id.slice(0, 8)}
                          </span>
                          <Badge variant="outline">{dispute.status}</Badge>
                        </div>
                        <p className="text-sm">{dispute.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Opened{" "}
                          {format(new Date(dispute.created_at), "MMM d, yyyy")}
                        </p>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refunds */}
            {payment.refunds && payment.refunds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-purple-500" />
                    Refunds
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payment.refunds.map((refund) => (
                      <Link
                        key={refund.id}
                        to={`/admin/refunds/${refund.id}`}
                        className="block p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">
                            #{refund.id.slice(0, 8)}
                          </span>
                          <Badge 
                            variant={refund.status === "success" ? "default" : refund.status === "failed" ? "destructive" : "outline"}
                          >
                            {refund.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground capitalize">
                            {refund.refund_type || "Full"} Refund
                          </span>
                          <span className="font-medium">₹{refund.amount.toLocaleString()}</span>
                        </div>
                        {refund.razorpay_refund_id && (
                          <p className="text-xs font-mono text-muted-foreground">
                            RZP: {refund.razorpay_refund_id}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(refund.created_at), "MMM d, yyyy")}
                        </p>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
