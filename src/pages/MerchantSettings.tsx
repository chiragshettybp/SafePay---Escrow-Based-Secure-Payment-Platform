import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MailCheck, MailWarning } from "lucide-react";
import { Seo } from "@/components/seo/Seo";

export default function MerchantSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, isAuthenticated, user, isEmailVerified, resendVerificationEmail } = useMerchantAuth();
  const [isWorking, setIsWorking] = useState(false);

  const code = useMemo(() => searchParams.get("code"), [searchParams]);

  useEffect(() => {
    if (!code) return;

    setIsWorking(true);
    (async () => {
      const { error } = await merchantSupabase.auth.exchangeCodeForSession(code);

      if (error) {
        toast({
          title: "Email confirmation failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email confirmed",
          description: "Your email has been confirmed successfully.",
        });
      }

      navigate("/merchant/settings", { replace: true });
      setIsWorking(false);
    })();
  }, [code, navigate, toast]);

  const handleResend = async () => {
    setIsWorking(true);
    const { error } = await resendVerificationEmail();

    if (error) {
      toast({
        title: "Could not send email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verification email sent",
        description: "Check your inbox and click the link to confirm.",
      });
    }

    setIsWorking(false);
  };

  // Allow this page to act as the email confirmation landing page.
  if (!isAuthenticated && code) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Confirm Email | Merchant Settings"
          description="Confirm your merchant email to secure your account."
          canonicalPath="/merchant/settings"
        />
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Confirming your email</CardTitle>
                <CardDescription className="mt-1">One moment while we complete verification.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Merchant Settings | Safepay"
          description="Manage your merchant account settings, including optional email confirmation."
          canonicalPath="/merchant/settings"
        />
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <MailWarning className="w-7 h-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Sign in required</CardTitle>
                <CardDescription className="mt-1">Please sign in to access merchant settings.</CardDescription>
              </div>
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
        description="Manage your merchant account settings, including optional email confirmation."
        canonicalPath="/merchant/settings"
      />

      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Merchant Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and security preferences.</p>
        </header>

        <Card className="border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Email confirmation (optional)</CardTitle>
            <CardDescription>
              Confirming your email helps secure your merchant account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {isEmailVerified ? (
                  <MailCheck className="h-5 w-5 text-primary" />
                ) : (
                  <MailWarning className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isEmailVerified ? "Email confirmed" : "Email not confirmed"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.email ?? ""}
                </p>
              </div>
            </div>

            {!isEmailVerified && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="h-11" onClick={handleResend} disabled={isWorking}>
                  {isWorking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send confirmation email"
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={() => navigate("/merchant/dashboard")}
                >
                  Back to dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </MerchantLayout>
  );
}
