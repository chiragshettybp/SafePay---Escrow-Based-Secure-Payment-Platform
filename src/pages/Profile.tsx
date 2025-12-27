import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useKyc } from "@/hooks/useKyc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Wallet,
  Edit,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { kycRecord, isLoading: kycLoading, getStatusLabel, getStatusColor } = useKyc();

  const isLoading = profileLoading || kycLoading;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getKycIcon = () => {
    if (!kycRecord || kycRecord.status === "not_started") {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (kycRecord.status === "approved") {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (kycRecord.status === "rejected") {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
              </>
            ) : (
              <>
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    {profile?.full_name || "User"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {profile?.phone || "No phone set"}
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/profile/edit")}
                  className="w-full max-w-xs"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </>
            )}
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Full Name</span>
                    </div>
                    <span className="text-sm font-medium">
                      {profile?.full_name || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Phone (Primary)</span>
                    </div>
                    <span className="text-sm font-medium">
                      {profile?.phone || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Email (Optional)</span>
                    </div>
                    <span className="text-sm font-medium">
                      {profile?.email && !profile.email.endsWith('@phone.safepay.local') 
                        ? profile.email 
                        : "Not set"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">User ID</span>
                    <span className="text-sm font-mono text-xs bg-muted px-2 py-1 rounded">
                      {user?.id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Joined</span>
                    <span className="text-sm font-medium">
                      {user?.created_at
                        ? format(new Date(user.created_at), "MMM d, yyyy")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Last Login</span>
                    <span className="text-sm font-medium">
                      {user?.last_sign_in_at
                        ? format(new Date(user.last_sign_in_at), "MMM d, yyyy h:mm a")
                        : "N/A"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* KYC Status */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate("/profile/kyc")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">KYC Verification</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {isLoading ? (
                        <Skeleton className="h-5 w-20" />
                      ) : (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getStatusColor(
                            kycRecord?.status || "not_started"
                          )}`}
                        >
                          <span className="flex items-center gap-1">
                            {getKycIcon()}
                            {getStatusLabel(kycRecord?.status || "not_started")}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate("/wallet")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Wallet</h3>
                    <p className="text-xs text-muted-foreground">
                      View balance & transactions
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/settings/security")}
              >
                <span>Set Password (Optional)</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Your account is secured using your phone number. Password is optional for additional security.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
