import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { useMerchantKyc, useMerchantKycDocuments } from "@/hooks/useMerchantProfile";
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Download,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const documentCategories = [
  {
    type: "business_registration",
    label: "Business Registration Certificate",
    description: "Company registration, incorporation certificate, or shop license",
    required: true,
  },
  {
    type: "gst_certificate",
    label: "GST Certificate",
    description: "GST registration certificate (if applicable)",
    required: false,
  },
  {
    type: "pan_card",
    label: "PAN Card",
    description: "Business or owner PAN card",
    required: true,
  },
  {
    type: "owner_id_front",
    label: "Owner ID (Front)",
    description: "Aadhaar, Passport, or Voter ID - front side",
    required: true,
  },
  {
    type: "owner_id_back",
    label: "Owner ID (Back)",
    description: "Aadhaar, Passport, or Voter ID - back side",
    required: true,
  },
  {
    type: "address_proof",
    label: "Address Proof",
    description: "Utility bill, rent agreement, or bank statement",
    required: true,
  },
  {
    type: "other",
    label: "Additional Documents",
    description: "Any other supporting documents",
    required: false,
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return { variant: "default" as const, icon: CheckCircle, label: "Approved" };
    case "rejected":
      return { variant: "destructive" as const, icon: XCircle, label: "Rejected" };
    default:
      return { variant: "secondary" as const, icon: Clock, label: "Pending" };
  }
};

export default function MerchantVerificationDocs() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useMerchantAuth();
  const { kyc, submitKyc, isSubmitting } = useMerchantKyc();
  const {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    isUploading,
    getDocumentsByType,
  } = useMerchantKycDocuments();

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Upload Documents | Safepay"
          description="Upload verification documents"
          canonicalPath="/merchant/verification/documents"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to upload documents.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileSelect = (type: string) => {
    fileInputRefs.current[type]?.click();
  };

  const handleFileChange = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      setUploadingType(type);
      uploadDocument(
        { file, documentType: type, kycId: kyc?.id },
        {
          onSettled: () => setUploadingType(null),
        }
      );
    }
    // Reset input
    e.target.value = "";
  };

  const handleDelete = (documentId: string) => {
    if (confirm("Are you sure you want to remove this document?")) {
      deleteDocument(documentId);
    }
  };

  const handleSubmit = () => {
    const requiredTypes = documentCategories.filter((c) => c.required).map((c) => c.type);
    const uploadedTypes = documents.map((d) => d.document_type);
    const missing = requiredTypes.filter((t) => !uploadedTypes.includes(t));

    if (missing.length > 0) {
      alert("Please upload all required documents before submitting");
      return;
    }

    submitKyc(undefined, {
      onSuccess: () => {
        navigate("/merchant/profile");
      },
    });
  };

  // Calculate progress
  const requiredCount = documentCategories.filter((c) => c.required).length;
  const uploadedRequiredCount = documentCategories
    .filter((c) => c.required)
    .filter((c) => getDocumentsByType(c.type).length > 0).length;
  const progress = (uploadedRequiredCount / requiredCount) * 100;

  const isReadOnly =
    kyc?.status === "submitted" || kyc?.status === "under_review" || kyc?.status === "verified";

  return (
    <MerchantLayout>
      <Seo
        title="Upload Documents | Safepay"
        description="Upload verification documents"
        canonicalPath="/merchant/verification/documents"
      />

      <section className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/merchant/verification">
            <ArrowLeft className="h-4 w-4" />
            Back to verification
          </Link>
        </Button>

        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Upload Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload required documents to complete verification
          </p>
        </header>

        {/* Progress */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Upload Progress</span>
              <span className="text-sm text-muted-foreground">
                {uploadedRequiredCount} of {requiredCount} required documents
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {documentCategories.map((category) => {
              const docs = getDocumentsByType(category.type);
              const hasDoc = docs.length > 0;

              return (
                <Card key={category.type} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {category.label}
                          {category.required && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                      {hasDoc && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Uploaded
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {docs.length > 0 ? (
                      <div className="space-y-2">
                        {docs.map((doc) => {
                          const statusBadge = getStatusBadge(doc.status);
                          const StatusIcon = statusBadge.icon;

                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {doc.file_type?.startsWith("image") ? (
                                  <Image className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.file_size
                                      ? `${(doc.file_size / 1024).toFixed(1)} KB`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={statusBadge.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {statusBadge.label}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8 w-8 p-0"
                                >
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                {!isReadOnly && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(doc.id)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {!isReadOnly && category.type === "other" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileSelect(category.type)}
                            disabled={uploadingType === category.type}
                            className="mt-2"
                          >
                            {uploadingType === category.type ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            Add another
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                          isReadOnly
                            ? "border-muted cursor-not-allowed opacity-50"
                            : "border-border hover:border-primary/50 cursor-pointer"
                        )}
                        onClick={() => !isReadOnly && handleFileSelect(category.type)}
                      >
                        {uploadingType === category.type ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">
                              {isReadOnly ? "No document uploaded" : "Click or drag to upload"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, JPG, PNG up to 10MB
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={(el) => (fileInputRefs.current[category.type] = el)}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(category.type, e)}
                      className="hidden"
                    />
                  </CardContent>
                </Card>
              );
            })}

            {/* Action Buttons */}
            {!isReadOnly && (
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sticky bottom-4">
                <Button variant="outline" asChild>
                  <Link to="/merchant/verification">Save & Continue Later</Link>
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || progress < 100}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit for Verification"
                  )}
                </Button>
              </div>
            )}

            {isReadOnly && kyc?.status !== "rejected" && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="text-sm">
                    Your documents are {kyc?.status === "verified" ? "verified" : "under review"}.
                    {kyc?.status !== "verified" && " We'll notify you once the review is complete."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>
    </MerchantLayout>
  );
}
