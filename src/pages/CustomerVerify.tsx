import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle, RefreshCw, Shield, Phone } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { supabase } from "@/integrations/supabase/client";

const RESEND_COOLDOWN = 60; // seconds

const CustomerVerify = () => {
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { user, profile, isEmailVerified, resendVerificationEmail, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  // Phone-based users don't need email verification - redirect to dashboard
  useEffect(() => {
    if (!isLoading && profile) {
      // If user signed up with phone (auth_provider is 'phone'), skip email verification
      if (profile.auth_provider === 'phone' || (profile.phone && !profile.email)) {
        navigate("/dashboard");
        return;
      }
      // If email is already verified, redirect
      if (isEmailVerified) {
        toast({
          title: "Email verified!",
          description: "Your email has been verified successfully.",
        });
        navigate("/dashboard");
      }
    }
  }, [isEmailVerified, isLoading, navigate, profile]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Poll for verification status (only for email users)
  useEffect(() => {
    if (!user || isEmailVerified || profile?.auth_provider === 'phone') return;

    const checkVerification = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) {
        toast({
          title: "Email verified!",
          description: "Your email has been verified successfully.",
        });
        navigate("/dashboard");
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [user, isEmailVerified, navigate, profile]);

  const handleResend = async () => {
    if (isResending || cooldown > 0) return;

    setIsResending(true);
    setError(null);

    const { error: resendError } = await resendVerificationEmail();

    if (resendError) {
      if (resendError.message.includes("rate")) {
        setError("Too many requests. Please wait before trying again.");
        setCooldown(RESEND_COOLDOWN);
      } else {
        setError(resendError.message);
      }
    } else {
      toast({
        title: "Email sent!",
        description: "A new verification email has been sent.",
      });
      setCooldown(RESEND_COOLDOWN);
    }

    setIsResending(false);
  };

  const handleRefreshStatus = async () => {
    setIsCheckingStatus(true);
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser?.email_confirmed_at) {
      toast({
        title: "Email verified!",
        description: "Your email has been verified successfully.",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Not verified yet",
        description: "Please check your email and click the verification link.",
        variant: "destructive",
      });
    }
    
    setIsCheckingStatus(false);
  };

  const handleSkipAndContinue = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageTransition>
          <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
            <div className="w-full max-w-[420px] space-y-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Session Expired</h1>
              <p className="text-muted-foreground">
                Please sign in to continue.
              </p>
              <Button asChild className="w-full h-12">
                <Link to="/customer-login">Go to Login</Link>
              </Button>
            </div>
          </main>
        </PageTransition>
      </div>
    );
  }

  // For phone-based users, show different message
  if (profile?.auth_provider === 'phone') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageTransition>
          <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
            <div className="w-full max-w-[420px] space-y-8 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <Phone className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">You're All Set!</h1>
              <p className="text-muted-foreground">
                Your account is active. You can optionally add an email later for receipts.
              </p>
              <Button asChild className="w-full h-12">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </main>
        </PageTransition>
      </div>
    );
  }

  // Get displayable email (skip pseudo-emails)
  const displayEmail = user.email?.endsWith('@phone.safepay.local') 
    ? null 
    : user.email;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageTransition>
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[420px] space-y-8">
            {/* Icon */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Verify Your Email
              </h1>
              
              {displayEmail && (
                <>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    We've sent a verification link to
                  </p>
                  <p className="text-foreground font-medium text-lg">
                    {displayEmail}
                  </p>
                </>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h3 className="font-medium text-foreground">What to do:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>You'll be automatically redirected once verified</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleRefreshStatus}
                variant="default"
                className="w-full h-12"
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    I've Verified My Email
                  </>
                )}
              </Button>

              <Button
                onClick={handleResend}
                variant="outline"
                className="w-full h-12 border-border"
                disabled={isResending || cooldown > 0}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Resend in {cooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              {/* Skip option */}
              <Button
                onClick={handleSkipAndContinue}
                variant="ghost"
                className="w-full h-10 text-muted-foreground"
              >
                Skip for now
              </Button>
            </div>

            {/* Links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Wrong account?{" "}
                <Link
                  to="/customer-signup"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Create a new account
                </Link>
              </p>
            </div>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerVerify;
