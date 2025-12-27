import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  Mail, 
  CheckCircle, 
  RefreshCw, 
  Shield,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { Seo } from "@/components/seo/Seo";
import { supabase } from "@/integrations/supabase/client";

const RESEND_COOLDOWN = 60; // seconds
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max polling

const CustomerVerify = () => {
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { user, isEmailVerified, resendVerificationEmail, isLoading, refreshSession } = useSupabaseAuth();
  const navigate = useNavigate();
  
  // Refs for cleanup and preventing concurrent operations
  const mountedRef = useRef(true);
  const pollCountRef = useRef(0);
  const isCheckingRef = useRef(false);

  // Check if email is verified and redirect
  useEffect(() => {
    if (!isLoading && isEmailVerified) {
      toast({
        title: "Email verified!",
        description: "Your email has been verified successfully.",
      });
      navigate("/");
    }
  }, [isEmailVerified, isLoading, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setCooldown(cooldown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Poll for verification status with cleanup
  const checkVerification = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current || !mountedRef.current) return false;
    isCheckingRef.current = true;
    
    try {
      pollCountRef.current += 1;
      
      // Stop polling after max attempts
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        return false;
      }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!mountedRef.current) return false;
      
      if (currentUser?.email_confirmed_at) {
        await refreshSession();
        if (mountedRef.current) {
          toast({
            title: "Email verified!",
            description: "Your email has been verified successfully.",
          });
          navigate("/");
        }
        return true;
      }
    } catch (err) {
      console.error("Verification check error:", err);
    } finally {
      isCheckingRef.current = false;
    }
    return false;
  }, [navigate, refreshSession]);

  useEffect(() => {
    mountedRef.current = true;
    pollCountRef.current = 0;
    
    if (!user || isEmailVerified) return;

    // Initial check
    checkVerification();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      if (mountedRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS) {
        checkVerification();
      }
    }, POLL_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [user, isEmailVerified, checkVerification]);

  const handleResend = async () => {
    if (isResending || cooldown > 0) return;

    setIsResending(true);
    setError(null);

    const { error: resendError } = await resendVerificationEmail();

    if (!mountedRef.current) return;

    if (resendError) {
      if (resendError.message.includes("rate") || resendError.message.includes("Rate") || resendError.message.includes("wait")) {
        setError("Too many requests. Please wait before trying again.");
        setCooldown(RESEND_COOLDOWN);
      } else {
        setError(resendError.message);
      }
    } else {
      toast({
        title: "Email sent!",
        description: "A new verification email has been sent to your inbox.",
      });
      setCooldown(RESEND_COOLDOWN);
    }

    setIsResending(false);
  };

  const handleRefreshStatus = async () => {
    if (isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    setError(null);
    
    const verified = await checkVerification();
    
    if (!mountedRef.current) return;
    
    if (!verified) {
      toast({
        title: "Not verified yet",
        description: "Please check your email and click the verification link.",
        variant: "destructive",
      });
    }
    
    setIsCheckingStatus(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not logged in, show session expired state
  if (!user) {
    return (
      <>
        <Seo 
          title="Session Expired | SecurePay"
          description="Your session has expired. Please sign in again."
        />
        <div className="min-h-screen bg-background flex flex-col">
          <PageTransition>
            <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
              <Card className="w-full max-w-[420px] border-border/50 shadow-xl">
                <CardContent className="pt-8 pb-6 space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Shield className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Session Expired</h1>
                    <p className="text-muted-foreground">
                      Please sign in to verify your email.
                    </p>
                  </div>
                  <Button asChild className="w-full h-11">
                    <Link to="/customer-login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go to Login
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </main>
          </PageTransition>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo 
        title="Verify Email | SecurePay"
        description="Verify your email address to complete registration"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <PageTransition>
          <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
            <Card className="w-full max-w-[420px] border-border/50 shadow-xl">
              <CardContent className="pt-8 pb-6 space-y-6">
                {/* Icon & Header */}
                <div className="text-center space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative">
                    <Mail className="h-10 w-10 text-primary" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Verify Your Email
                  </h1>
                  
                  <p className="text-muted-foreground text-sm sm:text-base">
                    We've sent a verification link to
                  </p>
                  
                  <p className="text-foreground font-semibold text-lg bg-muted/50 rounded-lg py-2 px-4 inline-block">
                    {user.email}
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Instructions */}
                <div className="bg-muted/30 rounded-xl p-5 space-y-3 border border-border/50">
                  <h3 className="font-medium text-foreground text-sm">Next steps:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the verification link in the email</li>
                    <li>You'll be redirected here automatically</li>
                  </ol>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={handleRefreshStatus}
                    variant="default"
                    className="w-full h-11"
                    disabled={isCheckingStatus}
                  >
                    {isCheckingStatus ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        I've Verified My Email
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleResend}
                    variant="outline"
                    className="w-full h-11"
                    disabled={isResending || cooldown > 0}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : cooldown > 0 ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend in {cooldown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                </div>

                {/* Links */}
                <div className="text-center space-y-2 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Wrong email?{" "}
                    <Link
                      to="/customer-signup"
                      className="font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Sign up with a different email
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Already verified?{" "}
                    <Link
                      to="/customer-login"
                      className="font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </PageTransition>
      </div>
    </>
  );
};

export default CustomerVerify;
