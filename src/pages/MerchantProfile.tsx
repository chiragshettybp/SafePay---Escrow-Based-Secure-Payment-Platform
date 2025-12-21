import { Link } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { useMerchantKyc } from "@/hooks/useMerchantProfile";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Shield,
  Edit,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const getKycStatusBadge = (status: string) => {
  switch (status) {
    case "verified":
      return { variant: "default" as const, icon: CheckCircle, label: "Verified", color: "text-green-500" };
    case "submitted":
    case "under_review":
      return { variant: "secondary" as const, icon: Clock, label: "Under Review", color: "text-yellow-500" };
    case "rejected":
      return { variant: "destructive" as const, icon: XCircle, label: "Rejected", color: "text-red-500" };
    case "in_progress":
      return { variant: "outline" as const, icon: AlertCircle, label: "In Progress", color: "text-blue-500" };
    default:
      return { variant: "outline" as const, icon: AlertCircle, label: "Not Started", color: "text-muted-foreground" };
  }
};

export default function MerchantProfile() {
  const { isAuthenticated, isLoading: authLoading, merchant, user } = useMerchantAuth();
  const { kyc, isLoading: kycLoading } = useMerchantKyc();

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Merchant Profile | Safepay"
          description="View and manage your merchant profile"
          canonicalPath="/merchant/profile"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to view your profile.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const kycStatus = getKycStatusBadge(kyc?.status || "not_started");
  const KycIcon = kycStatus.icon;

  return (
    <MerchantLayout>
      <Seo
        title="Merchant Profile | Safepay"
        description="View and manage your merchant profile"
        canonicalPath="/merchant/profile"
      />

      <section className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your merchant account</p>
          </div>
          <Button asChild>
            <Link to="/merchant/profile/edit">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Header Card */}
          <Card className="border-border/50 md:col-span-2">
            <CardContent className="p-6">
              {authLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={(merchant as any)?.logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {merchant?.business_name ? getInitials(merchant.business_name) : "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-bold text-foreground">
                      {merchant?.business_name || "Merchant"}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 justify-center sm:justify-start">
                        <Mail className="h-4 w-4" />
                        {user?.email || merchant?.email}
                      </span>
                      {merchant?.phone && (
                        <span className="flex items-center gap-1 justify-center sm:justify-start">
                          <Phone className="h-4 w-4" />
                          {merchant.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                      <Badge variant={merchant?.status === "active" ? "default" : "secondary"}>
                        {merchant?.status || "pending"}
                      </Badge>
                      <Badge variant={kycStatus.variant} className="gap-1">
                        <KycIcon className={`h-3 w-3 ${kycStatus.color}`} />
                        {kycStatus.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Business Information
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/merchant/profile/edit">
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {authLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Business Name</dt>
                    <dd className="font-medium">{merchant?.business_name || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium capitalize">{merchant?.category || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">GST Number</dt>
                    <dd className="font-medium">{merchant?.gst_number || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Merchant ID</dt>
                    <dd className="font-mono text-xs">{merchant?.id?.slice(0, 8) || "—"}</dd>
                  </div>
                  {merchant?.address && (
                    <div className="pt-2 border-t border-border">
                      <dt className="text-muted-foreground flex items-center gap-1 mb-1">
                        <MapPin className="h-3 w-3" />
                        Address
                      </dt>
                      <dd className="font-medium">{merchant.address}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Verification Status Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Verification Status
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {kycLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full ${kycStatus.color} bg-current/10`}>
                      <KycIcon className={`h-5 w-5 ${kycStatus.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{kycStatus.label}</p>
                      {kyc?.updated_at && (
                        <p className="text-xs text-muted-foreground">
                          Updated {format(new Date(kyc.updated_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>

                  {kyc?.status === "rejected" && kyc.rejection_reason && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                      <p className="text-sm text-muted-foreground mt-1">{kyc.rejection_reason}</p>
                    </div>
                  )}

                  <Button asChild className="w-full">
                    <Link to="/merchant/verification">
                      <FileText className="h-4 w-4 mr-2" />
                      {kyc?.status === "not_started" || !kyc
                        ? "Start Verification"
                        : kyc.status === "rejected"
                        ? "Resubmit Verification"
                        : "View Verification"}
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Links Card */}
          <Card className="border-border/50 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                  <Link to="/merchant/payouts/bank-account">
                    <Building2 className="h-5 w-5" />
                    <span className="text-xs">Bank Account</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                  <Link to="/merchant/notifications/preferences">
                    <Mail className="h-5 w-5" />
                    <span className="text-xs">Notifications</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                  <Link to="/merchant/settings">
                    <Shield className="h-5 w-5" />
                    <span className="text-xs">Security</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
                  <Link to="/merchant/payouts">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Payouts</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MerchantLayout>
  );
}
