import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

export default function AdminForceRefund() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { usePaymentDetails, forceRefund } = useAdminPayments();
  const { data: payment, isLoading, error } = usePaymentDetails(paymentId || "");

  const [reason, setReason] = useState("");
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const refundAmount =
    refundType === "full"
      ? payment?.amount || 0
      : parseFloat(partialAmount) || 0;

  const isValidAmount =
    refundType === "full" ||
    (refundAmount > 0 && refundAmount <= (payment?.amount || 0));

  const canSubmit =
    reason.trim().length >= 10 && confirmed && isValidAmount;

  const handleSubmit = async () => {
    if (!paymentId || !canSubmit) return;

    await forceRefund.mutateAsync({
      paymentId,
      reason: reason.trim(),
      refundType,
      refundAmount: refundType === "partial" ? refundAmount : undefined,
    });

    navigate(`/admin/payments/${paymentId}`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
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
          <Button onClick={() => navigate("/admin/payments")}>
            Back to Payments
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const canForceRefund = ["locked", "pending", "in_escrow"].includes(payment.status);

  if (!canForceRefund) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Force Refund</AlertTitle>
            <AlertDescription>
              This payment has status "{payment.status}" and cannot be refunded.
              Only payments in escrow can be refunded.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate(`/admin/payments/${paymentId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payment Details
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo
        title="Force Refund Payment | Admin"
        description="Force refund escrow funds to customer"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/payments/${paymentId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Force Refund</h1>
            <p className="text-muted-foreground">
              Refund escrow funds to customer manually
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Irreversible Action</AlertTitle>
          <AlertDescription>
            Force refunding will immediately transfer funds to the customer's wallet
            and mark the order as refunded. This action cannot be undone.
          </AlertDescription>
        </Alert>

        {/* Payment Context */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>Review the payment details before proceeding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment ID</p>
                <p className="font-mono text-sm">{payment.id.slice(0, 16)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{payment.order_id.slice(0, 16)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">
                  {payment.customer?.full_name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-medium">
                  {payment.merchant?.business_name || "Unknown"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Escrow Amount</span>
                <span className="text-2xl font-bold">
                  ₹{payment.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <Badge className="mt-1">{payment.status.replace(/_/g, " ")}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Refund Form */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Details</CardTitle>
            <CardDescription>
              Configure the refund parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Refund Type */}
            <div className="space-y-3">
              <Label>Refund Type</Label>
              <RadioGroup
                value={refundType}
                onValueChange={(value) => setRefundType(value as "full" | "partial")}
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="full" id="full" />
                  <div className="flex-1">
                    <Label htmlFor="full" className="cursor-pointer">
                      Full Refund
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Refund the entire escrow amount (₹{payment.amount.toLocaleString()})
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="partial" id="partial" />
                  <div className="flex-1">
                    <Label htmlFor="partial" className="cursor-pointer">
                      Partial Refund
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Refund a custom amount
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Partial Amount Input */}
            {refundType === "partial" && (
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Refund Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="pl-8"
                    max={payment.amount}
                    min={1}
                  />
                </div>
                {partialAmount && !isValidAmount && (
                  <p className="text-sm text-destructive">
                    Amount must be between ₹1 and ₹{payment.amount.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Refund Summary */}
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Amount to Refund</span>
                <span className="text-xl font-bold text-destructive">
                  ₹{refundAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                This amount will be credited to the customer's wallet
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Force Refund <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Provide a detailed reason for this action (minimum 10 characters)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/10 characters minimum
              </p>
            </div>

            {/* Confirmation */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-background">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="confirm" className="font-medium cursor-pointer">
                  I confirm this action is irreversible
                </Label>
                <p className="text-sm text-muted-foreground">
                  I understand that once refunded, this action cannot be reversed.
                  The order will be marked as refunded and the merchant will not
                  receive payment.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/admin/payments/${paymentId}`)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!canSubmit || forceRefund.isPending}
              >
                {forceRefund.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Force Refund ₹{refundAmount.toLocaleString()}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
