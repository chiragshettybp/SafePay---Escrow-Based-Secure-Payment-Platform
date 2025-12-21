import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { useMerchantProfile } from "@/hooks/useMerchantProfile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, Camera, Loader2 } from "lucide-react";

const businessCategories = [
  { value: "electronics", label: "Electronics" },
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "home", label: "Home & Living" },
  { value: "beauty", label: "Beauty & Personal Care" },
  { value: "food", label: "Food & Beverages" },
  { value: "health", label: "Health & Wellness" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "books", label: "Books & Stationery" },
  { value: "automotive", label: "Automotive" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
];

export default function MerchantEditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, isLoading: authLoading, merchant, user } = useMerchantAuth();
  const { updateProfile, uploadLogo, isUpdating, isUploadingLogo } = useMerchantProfile();

  const [formData, setFormData] = useState({
    business_name: "",
    phone: "",
    category: "",
    address: "",
    gst_number: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (merchant) {
      setFormData({
        business_name: merchant.business_name || "",
        phone: merchant.phone || "",
        category: merchant.category || "",
        address: merchant.address || "",
        gst_number: merchant.gst_number || "",
      });
      setLogoPreview((merchant as any)?.logo_url || null);
    }
  }, [merchant]);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Edit Profile | Safepay"
          description="Edit your merchant profile"
          canonicalPath="/merchant/profile/edit"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to edit your profile.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, logo: "File size must be less than 5MB" }));
        return;
      }
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      uploadLogo(file);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = "Business name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Enter a valid 10-digit phone number";
    }

    if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      newErrors.gst_number = "Enter a valid GST number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    updateProfile(formData, {
      onSuccess: () => {
        navigate("/merchant/profile");
      },
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MerchantLayout>
      <Seo
        title="Edit Profile | Safepay"
        description="Edit your merchant profile"
        canonicalPath="/merchant/profile/edit"
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Edit Profile</h1>
          <p className="text-sm text-muted-foreground">Update your business information</p>
        </header>

        {authLoading ? (
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload Card */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Business Logo</CardTitle>
                <CardDescription>Upload your business logo (max 5MB)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 cursor-pointer" onClick={handleLogoClick}>
                      <AvatarImage src={logoPreview || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {formData.business_name ? getInitials(formData.business_name) : "M"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleLogoClick}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg"
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </div>
                  {errors.logo && <p className="text-sm text-destructive">{errors.logo}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={handleLogoClick} disabled={isUploadingLogo}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingLogo ? "Uploading..." : "Change Logo"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information Card */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || merchant?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="10-digit phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Business Information Card */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    name="business_name"
                    placeholder="Your business name"
                    value={formData.business_name}
                    onChange={handleChange}
                    className={errors.business_name ? "border-destructive" : ""}
                  />
                  {errors.business_name && (
                    <p className="text-sm text-destructive">{errors.business_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Business Category</Label>
                  <Select value={formData.category} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST Number (Optional)</Label>
                  <Input
                    id="gst_number"
                    name="gst_number"
                    placeholder="e.g., 22AAAAA0000A1Z5"
                    value={formData.gst_number}
                    onChange={handleChange}
                    className={errors.gst_number ? "border-destructive" : ""}
                  />
                  {errors.gst_number && (
                    <p className="text-sm text-destructive">{errors.gst_number}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Full business address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sticky bottom-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/merchant/profile">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>
    </MerchantLayout>
  );
}
