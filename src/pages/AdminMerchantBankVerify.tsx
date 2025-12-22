import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminMerchants } from "@/hooks/useAdminMerchants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RotateCw,
  Building,
  History,
  ShieldCheck,
  CreditCard,
  Banknote,
  FileCheck,
  Eye,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { useToast } from "@/hooks/use-toast";

const bankVerificationStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const kycStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

// Helper to mask sensitive data
const maskAccountNumber = (accountNumber: string) => {
  if (!accountNumber || accountNumber.length < 4) return "****";
  return "****" + accountNumber.slice(-4);
};

export default function AdminMerchantBankVerify() {
  const { merchant_id } = useParams<{ merchant_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { useMerchantDetails, verifyBankAccount, requestBankReupload } = useAdminMerchants();
  const { data: merchant, isLoading, error } = useMerchantDetails(merchant_id || "");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"verified" | "rejected" | "reupload" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      toast({
        title: "Select Account",
        description: "Please select a bank account to verify.",
        variant: "destructive",
      });
      return;
    }

    if (!decision) {
      toast({
        title: "Select Action",
        description: "Please select an action before submitting.",
        variant: "destructive",
      });
      return;
    }

    if ((decision === "rejected" || decision === "reupload") && !reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason.",
        variant: "destructive",
      });
      return;
    }

    if (!confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm your decision before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (decision === "reupload") {
        await requestBankReupload.mutateAsync({
          merchantId: merchant_id!,
          bankAccountId: selectedAccountId,
          reason: reason.trim(),
        });
      } else {
        await verifyBankAccount.mutateAsync({
          merchantId: merchant_id!,
          bankAccountId: selectedAccountId,
          decision,
          reason: reason.trim() || undefined,
        });
      }
      toast({
        title: "Success",
        description: "Bank account verification updated successfully.",
      });
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setSelectedAccountId(null);
    setDecision(null);
    setReason("");
    setConfirmed(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !merchant) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Merchant not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/admin/merchants")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Merchants
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const selectedAccount = merchant.bankAccounts.find((a) => a.id === selectedAccountId);
  const kycStatus = merchant.kyc?.status || "not_started";

  // Get bank proof documents
  const bankProofDocs = merchant.kycDocuments.filter(
    (doc) => doc.document_type === "cancelled_cheque" || doc.document_type === "bank_statement"
  );

  return (
    <AdminLayout>
      <Seo
        title={`Bank Verification - ${merchant.business_name} | Admin`}
        description="Verify merchant bank account details"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/merchants/${merchant_id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Bank Details Verification</h1>
              <p className="text-muted-foreground">{merchant.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={kycStatusColors[kycStatus]}>
              KYC: {kycStatus.replace(/_/g, " ").toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/merchants/${merchant_id}`}>
                <Building className="h-4 w-4 mr-2" />
                Merchant Profile
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/merchants/${merchant_id}/kyc`}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              KYC Verification
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/merchants/${merchant_id}/verification-history`}>
              <History className="h-4 w-4 mr-2" />
              Verification History
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Bank Accounts */}
          <div className="space-y-6">
            {/* Merchant Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Merchant Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium">{merchant.business_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">KYC Status</p>
                    <Badge className={kycStatusColors[kycStatus]}>
                      {kycStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Withdrawals are{" "}
                      {merchant.bankAccounts.some((a) => a.is_verified) ? (
                        <span className="text-green-600 font-medium">ENABLED</span>
                      ) : (
                        <span className="text-red-600 font-medium">BLOCKED</span>
                      )}{" "}
                      for this merchant
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Accounts List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Bank Accounts ({merchant.bankAccounts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {merchant.bankAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {merchant.bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedAccountId === account.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground/50"
                        }`}
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          setDecision(null);
                          setReason("");
                          setConfirmed(false);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{account.bank_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {account.is_default && (
                              <Badge variant="outline" className="text-xs">
                                Default
                              </Badge>
                            )}
                            <Badge
                              className={
                                bankVerificationStatusColors[
                                  account.is_verified ? "verified" : "pending"
                                ]
                              }
                            >
                              {account.is_verified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Holder</span>
                            <span className="font-medium">{account.account_holder_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Number</span>
                            <span className="font-mono">{maskAccountNumber(account.account_number)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IFSC Code</span>
                            <span className="font-mono">{account.ifsc_code}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bank accounts added</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Proof Documents */}
            {bankProofDocs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Verification Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bankProofDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <FileCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {doc.document_type === "cancelled_cheque"
                                ? "Cancelled Cheque"
                                : "Bank Statement"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {format(new Date(doc.created_at), "PPP")}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Verification Actions */}
          <div className="space-y-6">
            {selectedAccount ? (
              <Card>
                <CardHeader>
                  <CardTitle>Verify: {selectedAccount.bank_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Selected Account Details */}
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Holder</span>
                      <span className="font-medium">{selectedAccount.account_holder_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bank Name</span>
                      <span className="font-medium">{selectedAccount.bank_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-mono">{maskAccountNumber(selectedAccount.account_number)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IFSC Code</span>
                      <span className="font-mono">{selectedAccount.ifsc_code}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={decision === "verified" ? "default" : "outline"}
                      className={decision === "verified" ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => { setDecision("verified"); setConfirmed(false); }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant={decision === "rejected" ? "default" : "outline"}
                      className={decision === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                      onClick={() => { setDecision("rejected"); setConfirmed(false); }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant={decision === "reupload" ? "default" : "outline"}
                      className={decision === "reupload" ? "bg-orange-600 hover:bg-orange-700" : ""}
                      onClick={() => { setDecision("reupload"); setConfirmed(false); }}
                    >
                      <RotateCw className="h-4 w-4 mr-1" />
                      Re-Upload
                    </Button>
                  </div>

                  {decision && (
                    <>
                      {/* Reason Input */}
                      <div className="space-y-2">
                        <Label htmlFor="reason">
                          {decision === "verified" ? "Notes (optional)" : "Reason *"}
                        </Label>
                        <Textarea
                          id="reason"
                          placeholder={
                            decision === "verified"
                              ? "Add any notes about this verification..."
                              : decision === "rejected"
                              ? "Provide a detailed reason for rejection..."
                              : "Explain what proof needs to be re-uploaded..."
                          }
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Confirmation */}
                      <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50">
                        <Checkbox
                          id="confirm"
                          checked={confirmed}
                          onCheckedChange={(checked) => setConfirmed(checked === true)}
                        />
                        <Label htmlFor="confirm" className="text-sm leading-relaxed">
                          I confirm that I have reviewed the bank details and any supporting documents. This action will be logged.
                        </Label>
                      </div>

                      {/* Warning Messages */}
                      {decision === "verified" && (
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 text-sm">
                          <strong>Approving</strong> will enable withdrawals to this bank account.
                        </div>
                      )}

                      {decision === "rejected" && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                          <strong>Rejecting</strong> will block withdrawals until the merchant provides valid bank details.
                        </div>
                      )}

                      {decision === "reupload" && (
                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200 text-sm">
                          <strong>Requesting re-upload</strong> will notify the merchant to submit new bank proof documents.
                        </div>
                      )}

                      {/* Submit Buttons */}
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={
                            !decision ||
                            !confirmed ||
                            verifyBankAccount?.isPending ||
                            requestBankReupload?.isPending ||
                            ((decision === "rejected" || decision === "reupload") && !reason.trim())
                          }
                        >
                          {verifyBankAccount?.isPending || requestBankReupload?.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Submit Decision"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a Bank Account</p>
                  <p className="text-sm mt-1">
                    Click on a bank account from the list to verify it
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Withdrawal Eligibility Info */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    {kycStatus === "approved" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>KYC Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {merchant.bankAccounts.some((a) => a.is_verified) ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Bank Account Verified</span>
                  </div>
                  <Separator />
                  <p className="text-muted-foreground">
                    Both KYC and at least one bank account must be verified for the merchant to withdraw funds.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
