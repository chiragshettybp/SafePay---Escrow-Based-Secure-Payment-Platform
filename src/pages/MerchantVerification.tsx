import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { useMerchantKyc } from "@/hooks/useMerchantProfile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const businessTypes = [
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "partnership", label: "Partnership" },
  { value: "private_ltd", label: "Private Limited" },
  { value: "llp", label: "Limited Liability Partnership (LLP)" },
  { value: "others", label: "Others" },
];

const getKycStatusConfig = (status: string) => {
  switch (status) {
    case "verified":
      return { icon: CheckCircle, label: "Verified", color: "text-green-500", bg: "bg-green-500/10" };
    case "submitted":
    case "under_review":
      return { icon: Clock, label: "Under Review", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    case "rejected":
      return { icon: XCircle, label: "Rejected", color: "text-red-500", bg: "bg-red-500/10" };
    case "in_progress":
      return { icon: AlertCircle, label: "In Progress", color: "text-blue-500", bg: "bg-blue-500/10" };
    default:
      return { icon: AlertCircle, label: "Not Started", color: "text-muted-foreground", bg: "bg-muted" };
  }
};

export default function MerchantVerification() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useMerchantAuth();
  const { kyc, isLoading, saveKyc, isSaving } = useMerchantKyc();

  const [formData, setFormData] = useState({
    legal_business_name: "",
    business_type: "",
    gst_number: "",
    pan_number: "",
    registered_address: "",
    owner_name: "",
    owner_dob: "",
    owner_phone: "",
    additional_notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (kyc) {
      setFormData({
        legal_business_name: kyc.legal_business_name || "",
        business_type: kyc.business_type || "",
        gst_number: kyc.gst_number || "",
        pan_number: kyc.pan_number || "",
        registered_address: kyc.registered_address || "",
        owner_name: kyc.owner_name || "",
        owner_dob: kyc.owner_dob || "",
        owner_phone: kyc.owner_phone || "",
        additional_notes: kyc.additional_notes || "",
      });
    }
  }, [kyc]);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Business Verification | Safepay"
          description="Complete your business verification"
          canonicalPath="/merchant/verification"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to complete verification.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getKycStatusConfig(kyc?.status || "not_started");
  const StatusIcon = statusConfig.icon;
  const isReadOnly = kyc?.status === "submitted" || kyc?.status === "under_review" || kyc?.status === "verified";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.legal_business_name.trim()) {
      newErrors.legal_business_name = "Legal business name is required";
    }
    if (!formData.business_type) {
      newErrors.business_type = "Business type is required";
    }
    if (!formData.owner_name.trim()) {
      newErrors.owner_name = "Owner name is required";
    }
    if (!formData.owner_phone.trim()) {
      newErrors.owner_phone = "Owner phone is required";
    }
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      newErrors.pan_number = "Enter a valid PAN number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    saveKyc(formData, {
      onSuccess: () => {
        navigate("/merchant/verification/documents");
      },
    });
  };

  return (
    <MerchantLayout>
      <Seo
        title="Business Verification | Safepay"
        description="Complete your business verification"
        canonicalPath="/merchant/verification"
      />

      <section className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/merchant/profile">
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
        </Button>

        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Business Verification</h1>
          <p className="text-sm text-muted-foreground">Complete KYC to unlock all features</p>
        </header>

        {/* Status Banner */}
        <Card className={`border-border/50 ${statusConfig.bg}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusConfig.bg}`}>
                  <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                </div>
                <div>
                  <p className="font-semibold">{statusConfig.label}</p>
                  {kyc?.updated_at && (
                    <p className="text-xs text-muted-foreground">
                      Last updated {format(new Date(kyc.updated_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
              {(kyc?.status === "in_progress" || kyc?.status === "rejected" || !kyc) && (
                <Button asChild>
                  <Link to="/merchant/verification/documents">
                    Upload Documents
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>

            {kyc?.status === "rejected" && kyc.rejection_reason && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                <p className="text-sm text-muted-foreground mt-1">{kyc.rejection_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Details */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Business Details</CardTitle>
                <CardDescription>Legal information about your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legal_business_name">Legal Business Name *</Label>
                    <Input
                      id="legal_business_name"
                      name="legal_business_name"
                      placeholder="As per registration"
                      value={formData.legal_business_name}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className={errors.legal_business_name ? "border-destructive" : ""}
                    />
                    {errors.legal_business_name && (
                      <p className="text-sm text-destructive">{errors.legal_business_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_type">Business Type *</Label>
                    <Select
                      value={formData.business_type}
                      onValueChange={(v) => handleSelectChange("business_type", v)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className={errors.business_type ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.business_type && (
                      <p className="text-sm text-destructive">{errors.business_type}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      name="gst_number"
                      placeholder="e.g., 22AAAAA0000A1Z5"
                      value={formData.gst_number}
                      onChange={handleChange}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input
                      id="pan_number"
                      name="pan_number"
                      placeholder="e.g., ABCDE1234F"
                      value={formData.pan_number}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className={errors.pan_number ? "border-destructive" : ""}
                    />
                    {errors.pan_number && (
                      <p className="text-sm text-destructive">{errors.pan_number}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registered_address">Registered Address</Label>
                  <Textarea
                    id="registered_address"
                    name="registered_address"
                    placeholder="Full registered business address"
                    value={formData.registered_address}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Owner Details */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Owner Details</CardTitle>
                <CardDescription>Information about the business owner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Owner Full Name *</Label>
                    <Input
                      id="owner_name"
                      name="owner_name"
                      placeholder="As per ID proof"
                      value={formData.owner_name}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className={errors.owner_name ? "border-destructive" : ""}
                    />
                    {errors.owner_name && (
                      <p className="text-sm text-destructive">{errors.owner_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_dob">Date of Birth</Label>
                    <Input
                      id="owner_dob"
                      name="owner_dob"
                      type="date"
                      value={formData.owner_dob}
                      onChange={handleChange}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="owner_phone">Owner Phone Number *</Label>
                    <Input
                      id="owner_phone"
                      name="owner_phone"
                      type="tel"
                      placeholder="10-digit phone number"
                      value={formData.owner_phone}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className={errors.owner_phone ? "border-destructive" : ""}
                    />
                    {errors.owner_phone && (
                      <p className="text-sm text-destructive">{errors.owner_phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="additional_notes"
                    name="additional_notes"
                    placeholder="Any additional information"
                    value={formData.additional_notes}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!isReadOnly && (
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sticky bottom-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/merchant/profile">Cancel</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue to Documents
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {isReadOnly && kyc?.status === "verified" && (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-sm">
                    Your business verification is complete. Contact support if you need to update
                    any information.
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
