import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Building2,
  Wallet,
  AlertCircle
} from "lucide-react";
import { useAdminPayoutDetails, usePayoutVerification } from "@/hooks/useAdminPayouts";

export default function AdminPayoutVerify() {
  const navigate = useNavigate();
  const { payoutId } = useParams<{ payoutId: string }>();
  const { payout, loading } = useAdminPayoutDetails(payoutId);
  const { verifyPayout, loading: verifying } = usePayoutVerification();

  const [decision, setDecision] = useState<"approve" | "decline" | "">("");
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const canSubmit = decision && confirmed && (decision === "approve" || (decision === "decline" && reason.trim()));

  const hasInsufficientBalance = payout?.wallet && payout.wallet.available_balance < payout.amount;

  const handleSubmit = async () => {
    if (!payoutId || !decision || !canSubmit) return;

    const result = await verifyPayout(
      payoutId,
      decision,
      reason,
      adminNotes || undefined
    );

    if (result.success) {
      navigate("/admin/payouts");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <Button variant="ghost" className="mb-6" onClick={() => navigate(`/admin/payouts/${payoutId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Details
        </Button>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (!payout) {
    return (
      <AdminLayout>
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/admin/payouts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payouts
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Payout not found</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (!["processing", "pending"].includes(payout.status)) {
    return (
      <AdminLayout>
        <Button variant="ghost" className="mb-6" onClick={() => navigate(`/admin/payouts/${payoutId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Details
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">This payout has already been processed</p>
            <p className="text-muted-foreground">Current status: {payout.status}</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Button variant="ghost" className="mb-6" onClick={() => navigate(`/admin/payouts/${payoutId}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Details
      </Button>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Context Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payout Request Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payout ID</p>
                <p className="font-mono text-sm">{payout.id.slice(0, 12)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested Amount</p>
                <p className="font-bold text-lg">{formatCurrency(payout.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className="font-bold text-lg text-primary">{formatCurrency(payout.net_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payout Method</p>
                <p className="font-medium">Bank Transfer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Merchant & Wallet Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Merchant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">{payout.user_type === 'merchant' ? 'Business Name' : 'Customer Name'}</p>
                <p className="font-medium">{payout.user_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{payout.user_type === 'merchant' ? 'Merchant ID' : 'Customer ID'}</p>
                <p className="font-mono text-sm">{payout.user_id.slice(0, 12)}...</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className={`font-bold text-lg ${hasInsufficientBalance ? "text-destructive" : ""}`}>
                  {formatCurrency(payout.wallet?.available_balance || 0)}
                </p>
              </div>
              {hasInsufficientBalance && (
                <p className="text-sm text-destructive">Insufficient for payout</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Warnings */}
        {hasInsufficientBalance && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Insufficient Balance</AlertTitle>
            <AlertDescription>
              The merchant's available balance ({formatCurrency(payout.wallet?.available_balance || 0)}) 
              is less than the requested payout amount ({formatCurrency(payout.amount)}). 
              Approving this payout is not possible.
            </AlertDescription>
          </Alert>
        )}

        {/* Decision Form */}
        <Card>
          <CardHeader>
            <CardTitle>Make Decision</CardTitle>
            <CardDescription>
              Choose to approve or decline this payout request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup 
              value={decision} 
              onValueChange={(value) => setDecision(value as "approve" | "decline")}
              className="space-y-4"
            >
              <div className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                decision === "approve" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""
              } ${hasInsufficientBalance ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <RadioGroupItem 
                  value="approve" 
                  id="approve" 
                  disabled={hasInsufficientBalance}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="approve" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Approve Payout</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deduct {formatCurrency(payout.amount)} from merchant wallet and process payment
                  </p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors cursor-pointer ${
                decision === "decline" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
              }`}>
                <RadioGroupItem value="decline" id="decline" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="decline" className="flex items-center gap-2 cursor-pointer">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Decline Payout</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reject this payout request. No changes to wallet balance.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {decision === "decline" && (
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Decline <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a clear reason for declining this payout..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any internal notes for record keeping..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            {/* Confirmation */}
            <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="confirm" className="font-medium cursor-pointer">
                  I confirm this action
                </Label>
                <p className="text-sm text-muted-foreground">
                  {decision === "approve" 
                    ? "I understand that approving will deduct funds from the merchant wallet and initiate the payout process. This action will be logged for audit purposes."
                    : decision === "decline"
                    ? "I understand that declining will reject this payout request. The merchant will be notified. This action will be logged for audit purposes."
                    : "Select a decision above to proceed."}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/admin/payouts/${payoutId}`)}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${decision === "approve" ? "bg-green-600 hover:bg-green-700" : decision === "decline" ? "bg-destructive hover:bg-destructive/90" : ""}`}
                disabled={!canSubmit || verifying}
                onClick={handleSubmit}
              >
                {verifying ? "Processing..." : decision === "approve" ? "Approve Payout" : decision === "decline" ? "Decline Payout" : "Select Decision"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
