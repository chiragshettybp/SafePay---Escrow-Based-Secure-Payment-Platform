import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminInfoCard } from "@/components/admin/AdminInfoCard";
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
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Building2,
  Wallet,
  AlertCircle,
  User
} from "lucide-react";
import { useAdminPayoutDetails, usePayoutVerification } from "@/hooks/useAdminPayouts";
import { formatCurrency } from "@/lib/utils";

export default function AdminPayoutVerify() {
  const navigate = useNavigate();
  const { payoutId } = useParams<{ payoutId: string }>();
  const { payout, loading } = useAdminPayoutDetails(payoutId);
  const { verifyPayout, loading: verifying } = usePayoutVerification();

  const [decision, setDecision] = useState<"approve" | "decline" | "">("");
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

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
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (!payout) {
    return (
      <AdminLayout>
        <AdminPageHeader
          title="Payout Not Found"
          backUrl="/admin/payouts"
          backLabel="Back to Payouts"
        />
        <Card className="admin-card-compact">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Payout not found</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (!["processing", "pending"].includes(payout.status)) {
    return (
      <AdminLayout>
        <AdminPageHeader
          title="Payout Already Processed"
          backUrl={`/admin/payouts/${payoutId}`}
          backLabel="Back to Details"
        />
        <Card className="admin-card-compact">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">This payout has already been processed</p>
            <p className="text-sm text-muted-foreground mt-1">Current status: {payout.status}</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const isCustomer = payout.user_type === 'customer';

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Verify Payout"
          subtitle="Review and make a decision on this payout request"
          backUrl={`/admin/payouts/${payoutId}`}
          backLabel="Back to Details"
        />

        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Context Summary */}
          <Card className="admin-card-compact">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payout Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="admin-info-item">
                  <p className="admin-info-label">Payout ID</p>
                  <p className="font-mono text-xs">{payout.id.slice(0, 12)}...</p>
                </div>
                <div className="admin-info-item">
                  <p className="admin-info-label">Requested</p>
                  <p className="font-bold text-base sm:text-lg">{formatCurrency(payout.amount)}</p>
                </div>
                <div className="admin-info-item">
                  <p className="admin-info-label">Net Amount</p>
                  <p className="font-bold text-base sm:text-lg text-primary">{formatCurrency(payout.net_amount)}</p>
                </div>
                <div className="admin-info-item">
                  <p className="admin-info-label">Method</p>
                  <p className="font-medium text-sm">Bank Transfer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User & Wallet Info */}
          <div className="mobile-grid-2">
            <AdminInfoCard
              title={isCustomer ? "Customer" : "Merchant"}
              icon={isCustomer ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              items={[
                { label: isCustomer ? "Name" : "Business Name", value: payout.user_name || "Unknown" },
                { label: "ID", value: payout.user_id.slice(0, 12) + "...", mono: true },
              ]}
            />

            <AdminInfoCard
              title="Wallet Balance"
              icon={<Wallet className="h-4 w-4" />}
              items={[
                { 
                  label: "Available", 
                  value: (
                    <span className={hasInsufficientBalance ? "text-destructive font-bold" : "font-bold"}>
                      {formatCurrency(payout.wallet?.available_balance || 0)}
                    </span>
                  ),
                  fullWidth: true 
                },
              ]}
              footer={hasInsufficientBalance && (
                <p className="text-xs text-destructive">Insufficient for payout</p>
              )}
            />
          </div>

          {/* Warnings */}
          {hasInsufficientBalance && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Insufficient Balance</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                Available balance ({formatCurrency(payout.wallet?.available_balance || 0)}) 
                is less than requested ({formatCurrency(payout.amount)}).
              </AlertDescription>
            </Alert>
          )}

          {/* Decision Form */}
          <Card className="admin-card-compact">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm sm:text-base">Make Decision</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Approve or decline this payout request
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 space-y-4 sm:space-y-6">
              <RadioGroup 
                value={decision} 
                onValueChange={(value) => setDecision(value as "approve" | "decline")}
                className="space-y-3"
              >
                <div className={`flex items-start gap-3 p-3 sm:p-4 border rounded-lg transition-colors ${
                  decision === "approve" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""
                } ${hasInsufficientBalance ? "opacity-50" : ""}`}>
                  <RadioGroupItem 
                    value="approve" 
                    id="approve" 
                    disabled={hasInsufficientBalance}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="approve" className="flex items-center gap-2 cursor-pointer text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="font-medium">Approve Payout</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deduct {formatCurrency(payout.amount)} and process payment
                    </p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 sm:p-4 border rounded-lg transition-colors ${
                  decision === "decline" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
                }`}>
                  <RadioGroupItem value="decline" id="decline" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="decline" className="flex items-center gap-2 cursor-pointer text-sm">
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <span className="font-medium">Decline Payout</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reject request. No wallet changes.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {decision === "decline" && (
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm">
                    Reason for Decline <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide a clear reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm">Internal Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add internal notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <Separator />

              {/* Confirmation */}
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1 min-w-0">
                  <Label htmlFor="confirm" className="font-medium cursor-pointer text-sm">
                    I confirm this action
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {decision === "approve" 
                      ? "Approving will deduct funds and initiate payout."
                      : decision === "decline"
                      ? "Declining will reject this request."
                      : "Select a decision above to proceed."}
                  </p>
                </div>
              </div>

              {/* Action Buttons - Sticky on mobile */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={() => navigate(`/admin/payouts/${payoutId}`)}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 min-h-[44px] ${
                    decision === "approve" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : decision === "decline" 
                      ? "bg-destructive hover:bg-destructive/90" 
                      : ""
                  }`}
                  disabled={!canSubmit || verifying}
                  onClick={handleSubmit}
                >
                  {verifying 
                    ? "Processing..." 
                    : decision === "approve" 
                    ? "Approve" 
                    : decision === "decline" 
                    ? "Decline" 
                    : "Select Decision"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
