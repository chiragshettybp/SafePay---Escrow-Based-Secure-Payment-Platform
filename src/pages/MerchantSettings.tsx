import { Link } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { Badge } from "@/components/ui/badge";

export default function MerchantSettings() {
  const { isAuthenticated, isLoading, merchant, user } = useMerchantAuth();

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Merchant Settings | Safepay"
          description="Manage your Safepay merchant account settings."
          canonicalPath="/merchant/settings"
        />
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-xl">Sign in required</CardTitle>
              <CardDescription>Please sign in to access merchant settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full h-11">
                <Link to="/merchant/login">Go to Merchant Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Merchant Settings | Safepay"
        description="Manage your Safepay merchant account settings."
        canonicalPath="/merchant/settings"
      />

      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Merchant Settings</h1>
          <p className="text-sm text-muted-foreground">Account details for your merchant portal.</p>
        </header>

        <Card className="border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Basic information for this merchant account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Business name</p>
                <p className="text-sm font-medium text-foreground">{merchant?.business_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user?.email ?? merchant?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="pt-1">
                  <Badge variant={merchant?.status === "active" ? "default" : "secondary"}>
                    {merchant?.status ?? "unknown"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Merchant ID</p>
                <p className="text-sm font-medium text-foreground">{merchant?.id ?? "—"}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild className="h-11">
                <Link to="/merchant/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </MerchantLayout>
  );
}
