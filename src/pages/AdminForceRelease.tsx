import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

export default function AdminForceRelease() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { usePaymentDetails, forceRelease } = useAdminPayments();
  const { data: payment, isLoading, error } = usePaymentDetails(paymentId || "");

  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const canSubmit = reason.trim().length >= 10 && confirmed;

  const handleSubmit = async () => {
    if (!paymentId || !canSubmit) return;

    await forceRelease.mutateAsync({
      paymentId,
      reason: reason.trim(),
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

  const canForceRelease = ["locked", "pending", "in_escrow"].includes(payment.status);

  if (!canForceRelease) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Force Release</AlertTitle>
            <AlertDescription>
              This payment has status "{payment.status}" and cannot be force released.
              Only payments in escrow can be released.
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
        title="Force Release Payment | Admin"
        description="Force release escrow funds to merchant"
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
            <h1 className="text-2xl font-bold">Force Release Funds</h1>
            <p className="text-muted-foreground">
              Release escrow funds to merchant manually
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Irreversible Action</AlertTitle>
          <AlertDescription>
            Force releasing funds will immediately transfer the escrow amount to the
            merchant's wallet. This action cannot be undone. Only proceed if you are
            certain this is the correct action.
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
                <span className="text-2xl font-bold text-primary">
                  ₹{payment.amount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                This amount will be credited to the merchant's wallet
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <Badge className="mt-1">{payment.status.replace(/_/g, " ")}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Release Form */}
        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
            <CardDescription>
              Provide a reason for this force release action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Force Release <span className="text-destructive">*</span>
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
                  I understand that once released, the funds cannot be recovered
                  and the customer will not be able to request a refund through
                  the normal process.
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
                className="flex-1"
                onClick={handleSubmit}
                disabled={!canSubmit || forceRelease.isPending}
              >
                {forceRelease.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Force Release Funds
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
