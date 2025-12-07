import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useKyc } from "@/hooks/useKyc";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  X,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

type DocumentType = "id_front" | "id_back" | "selfie" | "address_proof";

interface UploadBoxProps {
  label: string;
  type: DocumentType;
  currentUrl: string | null;
  onUpload: (file: File, type: DocumentType) => void;
  isUploading: boolean;
  disabled?: boolean;
}

function UploadBox({
  label,
  type,
  currentUrl,
  onUpload,
  isUploading,
  disabled,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, type);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          disabled
            ? "bg-muted cursor-not-allowed"
            : currentUrl
            ? "border-green-300 bg-green-50"
            : "border-border hover:border-primary hover:bg-accent/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        {isUploading ? (
          <div className="py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
          </div>
        ) : currentUrl ? (
          <div className="py-4">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
            <p className="text-sm text-green-600 mt-2">Uploaded</p>
            <p className="text-xs text-muted-foreground mt-1">Tap to replace</p>
          </div>
        ) : (
          <div className="py-4">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">
              Tap to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG or PDF
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Kyc() {
  const navigate = useNavigate();
  const {
    kycRecord,
    isLoading,
    updateKyc,
    uploadDocument,
    submitKyc,
    getStatusLabel,
    getStatusColor,
  } = useKyc();

  const [formData, setFormData] = useState({
    full_legal_name: "",
    date_of_birth: "",
    address: "",
    pincode: "",
    country: "",
    id_number: "",
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);

  // Initialize form data when KYC record loads
  if (kycRecord && !isInitialized) {
    setFormData({
      full_legal_name: kycRecord.full_legal_name || "",
      date_of_birth: kycRecord.date_of_birth || "",
      address: kycRecord.address || "",
      pincode: kycRecord.pincode || "",
      country: kycRecord.country || "",
      id_number: kycRecord.id_number || "",
    });
    setIsInitialized(true);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveField = async (field: string) => {
    await updateKyc.mutateAsync({ [field]: formData[field as keyof typeof formData] });
  };

  const handleUpload = async (file: File, type: DocumentType) => {
    setUploadingType(type);
    await uploadDocument.mutateAsync({ file, type });
    setUploadingType(null);
  };

  const handleSubmit = async () => {
    // First save all form data
    await updateKyc.mutateAsync({
      ...formData,
      status: "incomplete",
    });
    // Then submit for review
    await submitKyc.mutateAsync();
    navigate("/profile");
  };

  const isSubmitted = kycRecord?.status === "submitted" || kycRecord?.status === "pending_review";
  const isApproved = kycRecord?.status === "approved";
  const isRejected = kycRecord?.status === "rejected";

  const canSubmit =
    formData.full_legal_name &&
    formData.date_of_birth &&
    formData.id_number &&
    (kycRecord?.id_front_url || false) &&
    !isSubmitted &&
    !isApproved;

  const getStatusIcon = () => {
    if (isApproved) return <CheckCircle className="h-5 w-5" />;
    if (isRejected) return <AlertCircle className="h-5 w-5" />;
    if (isSubmitted) return <Clock className="h-5 w-5" />;
    return <Shield className="h-5 w-5" />;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">KYC Verification</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
          {/* Status Banner */}
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <Card
              className={`${
                isApproved
                  ? "bg-green-50 border-green-200"
                  : isRejected
                  ? "bg-red-50 border-red-200"
                  : isSubmitted
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-muted/50"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isApproved
                        ? "bg-green-100 text-green-600"
                        : isRejected
                        ? "bg-red-100 text-red-600"
                        : isSubmitted
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getStatusIcon()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={getStatusColor(kycRecord?.status || "not_started")}
                      >
                        {getStatusLabel(kycRecord?.status || "not_started")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isApproved
                        ? "Your identity has been verified."
                        : isRejected
                        ? kycRecord?.rejection_reason || "Your submission was rejected. Please resubmit."
                        : isSubmitted
                        ? "Your documents are under review."
                        : "Complete the form below to verify your identity."}
                    </p>
                    {kycRecord?.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed: {format(new Date(kycRecord.reviewed_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Upload Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Identity Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadBox
                label="Government ID (Front) *"
                type="id_front"
                currentUrl={kycRecord?.id_front_url || null}
                onUpload={handleUpload}
                isUploading={uploadingType === "id_front"}
                disabled={isSubmitted || isApproved}
              />
              <UploadBox
                label="Government ID (Back)"
                type="id_back"
                currentUrl={kycRecord?.id_back_url || null}
                onUpload={handleUpload}
                isUploading={uploadingType === "id_back"}
                disabled={isSubmitted || isApproved}
              />
              <UploadBox
                label="Selfie (Optional)"
                type="selfie"
                currentUrl={kycRecord?.selfie_url || null}
                onUpload={handleUpload}
                isUploading={uploadingType === "selfie"}
                disabled={isSubmitted || isApproved}
              />
              <UploadBox
                label="Address Proof (Optional)"
                type="address_proof"
                currentUrl={kycRecord?.address_proof_url || null}
                onUpload={handleUpload}
                isUploading={uploadingType === "address_proof"}
                disabled={isSubmitted || isApproved}
              />
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_legal_name">Full Legal Name *</Label>
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Input
                    id="full_legal_name"
                    name="full_legal_name"
                    value={formData.full_legal_name}
                    onChange={handleChange}
                    onBlur={() => handleSaveField("full_legal_name")}
                    placeholder="As shown on your ID"
                    className="h-12"
                    disabled={isSubmitted || isApproved}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    onBlur={() => handleSaveField("date_of_birth")}
                    className="h-12"
                    disabled={isSubmitted || isApproved}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number *</Label>
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Input
                    id="id_number"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleChange}
                    onBlur={() => handleSaveField("id_number")}
                    placeholder="Passport/License/Aadhaar number"
                    className="h-12"
                    disabled={isSubmitted || isApproved}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={() => handleSaveField("address")}
                    placeholder="Your residential address"
                    className="h-12"
                    disabled={isSubmitted || isApproved}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  {isLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <Input
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      onBlur={() => handleSaveField("pincode")}
                      placeholder="123456"
                      className="h-12"
                      disabled={isSubmitted || isApproved}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  {isLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      onBlur={() => handleSaveField("country")}
                      placeholder="India"
                      className="h-12"
                      disabled={isSubmitted || isApproved}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          {!isApproved && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:static md:p-0 md:border-0">
              <Button
                onClick={handleSubmit}
                className="w-full h-12"
                disabled={!canSubmit || submitKyc.isPending || updateKyc.isPending}
              >
                {submitKyc.isPending || updateKyc.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : isSubmitted ? (
                  "Under Review"
                ) : isRejected ? (
                  "Resubmit KYC"
                ) : (
                  "Submit for Verification"
                )}
              </Button>
              {!canSubmit && !isSubmitted && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Complete all required fields (*) and upload ID front
                </p>
              )}
            </div>
          )}

          {/* Spacer for sticky button */}
          <div className="h-20 md:hidden" />
        </div>
      </div>
    </DashboardLayout>
  );
}
