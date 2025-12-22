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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
  ZoomIn,
  RotateCw,
  Building,
  ExternalLink,
  History,
  CreditCard,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { useToast } from "@/hooks/use-toast";

const documentTypeLabels: Record<string, string> = {
  pan_card: "PAN Card",
  aadhar_card: "Aadhaar Card",
  aadhar_front: "Aadhaar Front",
  aadhar_back: "Aadhaar Back",
  gst_certificate: "GST Certificate",
  business_license: "Business License",
  address_proof: "Address Proof",
  bank_statement: "Bank Statement",
  selfie: "Selfie / Live Photo",
  cancelled_cheque: "Cancelled Cheque",
  other: "Other Document",
};

const kycStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminMerchantKyc() {
  const { merchant_id } = useParams<{ merchant_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { useMerchantDetails, verifyMerchant, requestKycReupload } = useAdminMerchants();
  const { data: merchant, isLoading, error } = useMerchantDetails(merchant_id || "");

  const [decision, setDecision] = useState<"approved" | "rejected" | "reupload" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleSubmit = async () => {
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
        await requestKycReupload.mutateAsync({
          merchantId: merchant_id!,
          reason: reason.trim(),
        });
      } else {
        await verifyMerchant.mutateAsync({
          merchantId: merchant_id!,
          decision,
          reason: reason.trim() || undefined,
        });
      }
      navigate(`/admin/merchants/${merchant_id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
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

  const kycStatus = merchant.kyc?.status || "not_started";

  return (
    <AdminLayout>
      <Seo
        title={`KYC Verification - ${merchant.business_name} | Admin`}
        description="Review and verify merchant KYC documents"
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
              <h1 className="text-2xl font-bold">KYC Verification</h1>
              <p className="text-muted-foreground">{merchant.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={kycStatusColors[kycStatus]}>
              {kycStatus.replace(/_/g, " ").toUpperCase()}
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
            <Link to={`/admin/merchants/${merchant_id}/bankdetails-verify`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Bank Details
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
          {/* Left Column: Documents */}
          <div className="space-y-6">
            {/* Document Viewer */}
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
                        className="rounded-lg border overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3 bg-muted/50">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {documentTypeLabels[doc.document_type] || doc.document_type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.file_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Image Preview */}
                        {doc.file_type?.startsWith("image/") && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="relative cursor-pointer group">
                                <img
                                  src={doc.file_url}
                                  alt={doc.document_type}
                                  className="w-full h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn className="h-8 w-8 text-white" />
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <img
                                src={doc.file_url}
                                alt={doc.document_type}
                                className="w-full h-auto max-h-[80vh] object-contain"
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        <div className="flex items-center gap-2 p-2 border-t">
                          <Button variant="ghost" size="sm" asChild className="flex-1">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="flex-1">
                            <a href={doc.file_url} download={doc.file_name}>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Info & Actions */}
          <div className="space-y-6">
            {/* Merchant Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Merchant Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant ID</p>
                    <p className="font-mono text-sm">{merchant.user_id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium">{merchant.business_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <Badge variant="outline">{merchant.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="text-sm">
                      {merchant.kyc?.created_at
                        ? format(new Date(merchant.kyc.created_at), "PPP")
                        : "Not submitted"}
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Legal Business Name</p>
                      <p className="font-medium">
                        {merchant.kyc.legal_business_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Business Type</p>
                      <p className="font-medium">
                        {merchant.kyc.business_type || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Owner Name</p>
                      <p className="font-medium">
                        {merchant.kyc.owner_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Owner Phone</p>
                      <p className="font-medium">
                        {merchant.kyc.owner_phone || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PAN Number</p>
                      <p className="font-mono">
                        {merchant.kyc.pan_number || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GST Number</p>
                      <p className="font-mono">
                        {merchant.kyc.gst_number || "—"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Registered Address</p>
                      <p className="font-medium">
                        {merchant.kyc.registered_address || "—"}
                      </p>
                    </div>
                  </div>

                  {merchant.kyc.rejection_reason && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm font-medium text-destructive">Previous Rejection:</p>
                      <p className="text-sm text-destructive/80">{merchant.kyc.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={decision === "approved" ? "default" : "outline"}
                    className={decision === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => { setDecision("approved"); setConfirmed(false); }}
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
                    <Separator />

                    {/* Reason Input */}
                    <div className="space-y-2">
                      <Label htmlFor="reason">
                        {decision === "approved" ? "Notes (optional)" : "Reason *"}
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder={
                          decision === "approved"
                            ? "Add any notes about this verification..."
                            : decision === "rejected"
                            ? "Provide a detailed reason for rejection..."
                            : "Explain what documents need to be re-uploaded..."
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
                        I confirm that I have reviewed all documents and information. This action will be logged.
                      </Label>
                    </div>

                    {/* Warning Messages */}
                    {decision === "approved" && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 text-sm">
                        <strong>Approving</strong> will activate this merchant and enable withdrawals.
                      </div>
                    )}

                    {decision === "rejected" && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
                        <strong>Rejecting</strong> will block this merchant from receiving orders until re-verification.
                      </div>
                    )}

                    {decision === "reupload" && (
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200 text-sm">
                        <strong>Requesting re-upload</strong> will notify the merchant to submit new documents.
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
                          verifyMerchant.isPending ||
                          requestKycReupload?.isPending ||
                          ((decision === "rejected" || decision === "reupload") && !reason.trim())
                        }
                      >
                        {verifyMerchant.isPending || requestKycReupload?.isPending ? (
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
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
