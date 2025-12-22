import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminDisputes } from "@/hooks/useAdminDisputes";
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
  Gavel,
  Loader2,
  CheckCircle,
  XCircle,
  Scale,
  Ban,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

type DecisionType =
  | "release_to_merchant"
  | "refund_customer"
  | "partial_refund"
  | "resolve_no_funds";

const decisionOptions: {
  value: DecisionType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "release_to_merchant",
    label: "Release Funds to Merchant",
    description: "Order fulfilled correctly. Release escrow to merchant.",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  },
  {
    value: "refund_customer",
    label: "Full Refund to Customer",
    description: "Customer claim is valid. Refund entire escrow amount.",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  {
    value: "partial_refund",
    label: "Partial Refund",
    description: "Split funds between customer and merchant.",
    icon: <Scale className="h-5 w-5 text-yellow-500" />,
  },
  {
    value: "resolve_no_funds",
    label: "Resolve Without Fund Movement",
    description: "Close dispute without moving any funds.",
    icon: <Ban className="h-5 w-5 text-gray-500" />,
  },
];

export default function AdminDisputeDecision() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const { useDisputeDetails, makeDecision } = useAdminDisputes();
  const { data: dispute, isLoading, error } = useDisputeDetails(disputeId || "");

  const [decision, setDecision] = useState<DecisionType | "">("");
  const [reason, setReason] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const refundAmount =
    decision === "refund_customer"
      ? dispute?.order?.amount || 0
      : decision === "partial_refund"
      ? parseFloat(partialAmount) || 0
      : 0;

  const isValidPartialAmount =
    decision !== "partial_refund" ||
    (refundAmount > 0 && refundAmount < (dispute?.order?.amount || 0));

  const canSubmit =
    decision && reason.trim().length >= 10 && confirmed && isValidPartialAmount;

  const handleSubmit = async () => {
    if (!disputeId || !canSubmit || !decision) return;

    await makeDecision.mutateAsync({
      disputeId,
      decision,
      reason: reason.trim(),
      partialAmount: decision === "partial_refund" ? refundAmount : undefined,
    });

    navigate("/admin/disputes");
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

  if (error || !dispute) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
          <Button onClick={() => navigate("/admin/disputes")}>
            Back to Disputes
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const canMakeDecision = ["open", "under_review"].includes(dispute.status);

  if (!canMakeDecision) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Make Decision</AlertTitle>
            <AlertDescription>
              This dispute has status "{dispute.status}" and cannot be modified.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate(`/admin/disputes/${disputeId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dispute
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo
        title="Dispute Decision | Admin"
        description="Make final decision on dispute"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/disputes/${disputeId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Final Decision</h1>
            <p className="text-muted-foreground">
              Make a binding decision on this dispute
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Irreversible Action</AlertTitle>
          <AlertDescription>
            This decision is final and cannot be undone. Funds will be moved
            immediately based on your decision. Review all evidence carefully
            before proceeding.
          </AlertDescription>
        </Alert>

        {/* Dispute Context */}
        <Card>
          <CardHeader>
            <CardTitle>Dispute Summary</CardTitle>
            <CardDescription>Review before making a decision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dispute ID</p>
                <p className="font-mono text-sm">{dispute.id.slice(0, 16)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{dispute.order_id.slice(0, 16)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">
                  {dispute.customer?.full_name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-medium">
                  {dispute.merchant?.business_name || "Unknown"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Dispute Reason</p>
              <p className="text-sm">{dispute.reason}</p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Escrow Amount</span>
                <span className="text-2xl font-bold">
                  ₹{dispute.order?.amount?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Current Status:</p>
              <Badge>{dispute.status.replace(/_/g, " ")}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Decision Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Your Decision
            </CardTitle>
            <CardDescription>Select the appropriate resolution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Options */}
            <RadioGroup
              value={decision}
              onValueChange={(value) => setDecision(value as DecisionType)}
            >
              <div className="space-y-3">
                {decisionOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                      decision === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <Label
                          htmlFor={option.value}
                          className="font-medium cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>

            {/* Partial Amount Input */}
            {decision === "partial_refund" && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <Label htmlFor="partialAmount">
                  Refund Amount to Customer <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="partialAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="pl-8"
                    max={(dispute.order?.amount || 0) - 1}
                    min={1}
                  />
                </div>
                {partialAmount && (
                  <div className="text-sm space-y-1">
                    {!isValidPartialAmount ? (
                      <p className="text-destructive">
                        Amount must be between ₹1 and ₹
                        {((dispute.order?.amount || 0) - 1).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Customer receives: ₹{refundAmount.toLocaleString()} |
                        Merchant receives: ₹
                        {((dispute.order?.amount || 0) - refundAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Decision Summary */}
            {decision && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">Decision Summary</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {decision === "release_to_merchant" &&
                    `₹${dispute.order?.amount?.toLocaleString()} will be released to the merchant.`}
                  {decision === "refund_customer" &&
                    `₹${dispute.order?.amount?.toLocaleString()} will be refunded to the customer.`}
                  {decision === "partial_refund" &&
                    refundAmount > 0 &&
                    `Customer: ₹${refundAmount.toLocaleString()} | Merchant: ₹${(
                      (dispute.order?.amount || 0) - refundAmount
                    ).toLocaleString()}`}
                  {decision === "resolve_no_funds" &&
                    "Dispute will be closed without moving funds."}
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Decision Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain your decision (minimum 10 characters)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/10 characters minimum. This will be recorded in the
                audit log.
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
                  I confirm this decision is final and irreversible
                </Label>
                <p className="text-sm text-muted-foreground">
                  I have reviewed all evidence and understand this action will
                  immediately move funds and close the dispute.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/admin/disputes/${disputeId}`)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={!canSubmit || makeDecision.isPending}
              >
                {makeDecision.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Gavel className="h-4 w-4 mr-2" />
                    Apply Decision
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
