import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Phone, CheckCircle } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { PageTransition } from "@/components/layout/PageTransition";

const CustomerVerify = () => {
  const { user, profile, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  // Phone-based users don't need verification - redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      // All phone-based users go directly to dashboard
      navigate("/dashboard");
    }
  }, [isLoading, user, navigate]);

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

  // Account verified message for phone users
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageTransition>
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[420px] space-y-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
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
};

export default CustomerVerify;
