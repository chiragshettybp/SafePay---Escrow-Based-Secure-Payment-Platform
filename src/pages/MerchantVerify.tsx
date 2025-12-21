import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Mail, Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantVerify() {
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const location = useLocation();
  const emailFromQuery = new URLSearchParams(location.search).get("email");
  const [userEmail, setUserEmail] = useState<string | null>(emailFromQuery);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkVerificationStatus();

    // Poll for verification status every 5 seconds
    const pollInterval = setInterval(() => {
      checkVerificationStatus();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const ensureMerchantProfile = async (user: any) => {
    const meta = (user?.user_metadata ?? {}) as any;
    if (meta?.is_merchant !== true) return;
    if (!user?.email) return;

    const profile = (meta?.merchant_profile ?? {}) as any;
    const businessName =
      profile?.business_name ?? meta?.business_name ?? user.email?.split("@")[0] ?? "Merchant";

    const { error } = await supabase
      .from("merchants")
      .upsert(
        {
          user_id: user.id,
          business_name: businessName,
          email: user.email,
          phone: profile?.phone ?? meta?.phone ?? null,
          category: profile?.category ?? null,
          gst_number: profile?.gst_number ?? null,
          address: profile?.address ?? null,
          status: "active",
        },
        { onConflict: "user_id" }
      );

    if (!error) {
      await supabase.auth.updateUser({
        data: {
          ...meta,
          merchant_profile_created: true,
        },
      });
    }

    return error;
  };

  const checkVerificationStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserEmail(user.email || emailFromQuery || null);

      if (user.email_confirmed_at) {
        setIsVerified(true);

        const merchantProfileError = await ensureMerchantProfile(user);
        if (merchantProfileError) {
          toast({
            title: "Verified, but setup incomplete",
            description:
              "Your email is verified, but we couldn't finish setting up your merchant profile. Please try logging in again.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Email Verified!",
          description: "Your merchant account is now active.",
        });

        setTimeout(() => {
          navigate("/merchant/dashboard");
        }, 1200);
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email || emailFromQuery || userEmail;

      if (!email) {
        toast({
          title: "Error",
          description: "No email address found. Please go back and sign up again.",
          variant: "destructive",
        });
        return;
      }

      const redirectUrl = `${window.location.origin}/merchant/verify?email=${encodeURIComponent(email)}`;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          title: "Failed to Resend",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email Sent!",
        description:
          "Verification email has been sent again. Check spam/junk if you don't see it within 1-2 minutes.",
      });

      setResendCooldown(60);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Email Verified!</h2>
              <p className="mt-2 text-muted-foreground">
                Your merchant account is now active. Redirecting to dashboard...
              </p>
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Verify Your Email</CardTitle>
              <CardDescription className="mt-2">
                We've sent a verification link to your email
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {userEmail && (
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Verification sent to:</p>
                <p className="font-medium mt-1 text-foreground break-all">{userEmail}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <p className="text-muted-foreground">Check your email inbox (and spam folder)</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <p className="text-muted-foreground">Click the verification link in the email</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <p className="text-muted-foreground">You'll be redirected to your dashboard automatically</p>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                onClick={handleResend}
                variant="outline"
                className="w-full h-11"
                disabled={isResending || resendCooldown > 0}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Link to="/merchant/login" className="block">
                <Button variant="ghost" className="w-full h-11">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-center text-muted-foreground">
                Having trouble? Contact{" "}
                <a href="mailto:support@safepay.com" className="text-primary hover:underline">
                  support@safepay.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
