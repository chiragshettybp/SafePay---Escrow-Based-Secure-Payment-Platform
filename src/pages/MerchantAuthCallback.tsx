import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";

type CallbackStatus = "processing" | "success" | "error";

export default function MerchantAuthCallback() {
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    handleCallback();
  }, []);

  const ensureMerchantProfile = async (user: any) => {
    const meta = (user?.user_metadata ?? {}) as any;
    if (meta?.is_merchant !== true) return null;
    if (!user?.email) return null;

    const profile = (meta?.merchant_profile ?? {}) as any;
    const businessName =
      profile?.business_name ?? meta?.business_name ?? user.email?.split("@")[0] ?? "Merchant";

    const { error } = await merchantSupabase
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
      await merchantSupabase.auth.updateUser({
        data: {
          ...meta,
          merchant_profile_created: true,
        },
      });
    }

    return error;
  };

  const handleCallback = async () => {
    try {
      // Get the code from URL hash or search params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const code = searchParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const errorParam = searchParams.get("error") || hashParams.get("error");
      const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

      if (errorParam) {
        setStatus("error");
        setErrorMessage(errorDescription || errorParam || "Verification failed");
        return;
      }

      // Method 1: Exchange code for session (PKCE flow)
      if (code) {
        const { data, error } = await merchantSupabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error("Code exchange error:", error);
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        if (data.user) {
          await ensureMerchantProfile(data.user);
          setStatus("success");
          toast({
            title: "Email Verified!",
            description: "Your merchant account is now active.",
          });
          setTimeout(() => navigate("/merchant/dashboard"), 1500);
          return;
        }
      }

      // Method 2: Set session from tokens in hash (implicit flow)
      if (accessToken && refreshToken) {
        const { data, error } = await merchantSupabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Set session error:", error);
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        if (data.user) {
          await ensureMerchantProfile(data.user);
          setStatus("success");
          toast({
            title: "Email Verified!",
            description: "Your merchant account is now active.",
          });
          setTimeout(() => navigate("/merchant/dashboard"), 1500);
          return;
        }
      }

      // Method 3: Check if user is already verified (redirect from email link)
      const { data: { user } } = await merchantSupabase.auth.getUser();
      
      if (user?.email_confirmed_at) {
        await ensureMerchantProfile(user);
        setStatus("success");
        toast({
          title: "Email Verified!",
          description: "Your merchant account is now active.",
        });
        setTimeout(() => navigate("/merchant/dashboard"), 1500);
        return;
      }

      // No valid auth data found
      setStatus("error");
      setErrorMessage("No valid verification data found. Please try clicking the link in your email again.");
    } catch (error) {
      console.error("Callback error:", error);
      setStatus("error");
      setErrorMessage("An unexpected error occurred during verification.");
    }
  };

  if (status === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Verifying your email...</h2>
          <p className="text-muted-foreground">Please wait while we confirm your account.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
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
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
            <p className="mt-2 text-muted-foreground">{errorMessage}</p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => navigate("/merchant/verify")} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate("/merchant/login")} className="w-full">
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
