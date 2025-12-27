import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form data when profile loads
  if (profile && !isInitialized) {
    setFormData({
      full_name: profile.full_name || "",
      email: profile.email && !profile.email.endsWith('@phone.safepay.local') ? profile.email : "",
    });
    setIsInitialized(true);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync(formData);
    navigate("/profile");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar.mutateAsync(file);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isSubmitting = updateProfile.isPending || uploadAvatar.isPending;

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
            <h1 className="text-lg font-semibold">Edit Profile</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6 max-w-lg mx-auto">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <Skeleton className="h-24 w-24 rounded-full" />
            ) : (
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(formData.full_name || profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploadAvatar.isPending}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                >
                  {uploadAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Tap to change profile picture
            </p>
          </div>

          {/* Form Fields */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="h-12"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Primary)</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input
                    id="phone"
                    value={profile?.phone || ""}
                    disabled
                    className="h-12 bg-muted"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Phone number is your primary login method and cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    placeholder="For receipts & notifications (optional)"
                    className="h-12"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Email is optional and used only for receipts and communication.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button - Sticky on mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:static md:p-0 md:border-0">
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>

          {/* Spacer for sticky button */}
          <div className="h-20 md:hidden" />
        </form>
      </div>
    </DashboardLayout>
  );
}
