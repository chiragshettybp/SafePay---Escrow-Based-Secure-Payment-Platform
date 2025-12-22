import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  ArrowLeft,
  FileCheck,
  FileX,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { useToast } from "@/hooks/use-toast";

const documentTypeLabels: Record<string, string> = {
  pan_card: "PAN Card",
  aadhar_card: "Aadhaar Card",
  gst_certificate: "GST Certificate",
  business_license: "Business License",
  address_proof: "Address Proof",
  bank_statement: "Bank Statement",
  other: "Other Document",
};

export default function AdminMerchantVerification() {
  const { merchant_id } = useParams<{ merchant_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { useMerchantDetails, verifyMerchant } = useAdminMerchants();
  const { data: merchant, isLoading, error } = useMerchantDetails(merchant_id || "");

  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async () => {
    if (!decision) {
      toast({
        title: "Select Decision",
        description: "Please select approve or reject before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (decision === "rejected" && !reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
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
      await verifyMerchant.mutateAsync({
        merchantId: merchant_id!,
        decision,
        reason: reason.trim() || undefined,
      });
      navigate(`/admin/merchants/${merchant_id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
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

  return (
    <AdminLayout>
      <Seo
        title={`Verify ${merchant.business_name} | Admin`}
        description="Review and verify merchant KYC documents"
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/merchants/${merchant_id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">KYC Verification</h1>
            <p className="text-muted-foreground">{merchant.business_name}</p>
          </div>
        </div>

        {/* Context Card */}
        <Card>
          <CardHeader>
            <CardTitle>Merchant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Merchant ID</p>
                <p className="font-mono text-sm">{merchant.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{merchant.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <Badge
                  className={
                    merchant.kyc?.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : merchant.kyc?.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {merchant.kyc?.status || "Not Started"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {merchant.kyc?.created_at
                    ? format(new Date(merchant.kyc.created_at), "PPP")
                    : "Not submitted"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Legal Business Name</p>
                <p className="font-medium">
                  {merchant.kyc?.legal_business_name || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner Name</p>
                <p className="font-medium">
                  {merchant.kyc?.owner_name || "Not provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC Details */}
        {merchant.kyc && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p className="font-medium">
                    {merchant.kyc.business_type || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PAN Number</p>
                  <p className="font-mono">
                    {merchant.kyc.pan_number || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST Number</p>
                  <p className="font-mono">
                    {merchant.kyc.gst_number || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owner Phone</p>
                  <p className="font-medium">
                    {merchant.kyc.owner_phone || "Not provided"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Registered Address</p>
                  <p className="font-medium">
                    {merchant.kyc.registered_address || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {merchant.kycDocuments.length > 0 ? (
              <div className="space-y-4">
                {merchant.kycDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {documentTypeLabels[doc.document_type] || doc.document_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {format(new Date(doc.created_at), "PPP")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{doc.status}</Badge>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decision */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={decision === "approved" ? "default" : "outline"}
                className={
                  decision === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
                onClick={() => setDecision("approved")}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant={decision === "rejected" ? "default" : "outline"}
                className={
                  decision === "rejected"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
                }
                onClick={() => setDecision("rejected")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                {decision === "rejected" ? "Rejection Reason *" : "Notes (optional)"}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  decision === "rejected"
                    ? "Provide a detailed reason for rejection..."
                    : "Add any notes about this verification..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            {/* Confirmation */}
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <Label htmlFor="confirm" className="text-sm">
                I confirm that I have reviewed all documents and information, and
                this decision is final.
              </Label>
            </div>

            {/* Warning */}
            {decision === "approved" && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200">
                <p className="text-sm">
                  <strong>Approving</strong> will activate this merchant account
                  and allow them to receive orders.
                </p>
              </div>
            )}

            {decision === "rejected" && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200">
                <p className="text-sm">
                  <strong>Rejecting</strong> will require the merchant to
                  resubmit their KYC documents.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/merchants/${merchant_id}`)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !decision ||
                  !confirmed ||
                  verifyMerchant.isPending ||
                  (decision === "rejected" && !reason.trim())
                }
              >
                {verifyMerchant.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit Decision"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
