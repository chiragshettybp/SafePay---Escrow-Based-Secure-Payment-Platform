import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw, CreditCard, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface MerchantData {
  id: string;
  business_name: string;
  slug: string;
}

interface SessionData {
  id: string;
  merchant_id: string;
  final_amount: number;
  status: string;
  last_payment_error: string | null;
  payment_attempts: number;
  created_at: string;
}

const MAX_RETRY_ATTEMPTS = 3;

export default function PublicCheckoutFailed() {
  const { merchantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [failureReason, setFailureReason] = useState<string>("Payment could not be completed");

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const reason = searchParams.get('reason');

    if (reason) {
      const reasonMessages: Record<string, string> = {
        merchant_not_found: "Merchant not found",
        session_not_found: "Checkout session not found",
        invalid_merchant: "Invalid merchant reference",
        payment_declined: "Payment was declined",
        insufficient_funds: "Insufficient funds",
        card_expired: "Card has expired",
        network_error: "Network error occurred",
      };
      setFailureReason(reasonMessages[reason] || "Payment could not be completed");
    }

    const fetchData = async () => {
      try {
        // Fetch merchant by slug
        const { data: merchantData, error: merchantError } = await supabase
          .from("merchants")
          .select("id, business_name, slug")
          .eq("slug", merchantSlug)
          .single();

        if (merchantError) {
          console.error("Merchant fetch error:", merchantError);
        } else {
          setMerchant(merchantData);
        }

        // Fetch session if provided
        if (sessionId) {
          const { data: sessionData } = await supabase
            .from("checkout_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

          if (sessionData) {
            setSession(sessionData as SessionData);
            if (sessionData.last_payment_error) {
              setFailureReason(sessionData.last_payment_error);
            }
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [merchantSlug, searchParams]);

  const handleRetryPayment = async () => {
    if (!session) {
      toast({
        title: "Error",
        description: "No active checkout session to retry",
        variant: "destructive",
      });
      return;
    }

    if (session.payment_attempts >= MAX_RETRY_ATTEMPTS) {
      toast({
        title: "Retry limit reached",
        description: "Please request a new payment link from the merchant",
        variant: "destructive",
      });
      return;
    }

    setIsRetrying(true);

    try {
      // Update session for retry
      const { error } = await supabase
        .from("checkout_sessions")
        .update({
          status: 'active',
          current_step: 'payment',
          payment_attempts: (session.payment_attempts || 0) + 1,
          last_payment_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (error) throw error;

      // Redirect back to checkout
      navigate(`/checkout/${session.id}`);
    } catch (err) {
      console.error("Error retrying payment:", err);
      toast({
        title: "Retry failed",
        description: "Unable to retry payment. Please try again.",
        variant: "destructive",
      });
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const canRetry = session && session.payment_attempts < MAX_RETRY_ATTEMPTS;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-background dark:from-red-950/20 dark:to-background">
      <div className="container max-w-lg mx-auto px-4 py-8 md:py-16">
        {/* Failure Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Payment Failed
          </h1>
          <p className="text-muted-foreground">
            {failureReason}
          </p>
        </div>

        {/* Failure Details Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              What happened?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Your payment could not be processed. This can happen due to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Insufficient funds in your account</li>
              <li>Card declined by your bank</li>
              <li>Network connectivity issues</li>
              <li>Payment timeout</li>
            </ul>

            {session && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Amount</span>
                  <span className="font-medium">₹{session.final_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Attempt</span>
                  <span className="font-medium">{session.payment_attempts} of {MAX_RETRY_ATTEMPTS}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Time</span>
                  <span className="font-medium">
                    {format(new Date(session.created_at), "dd MMM, hh:mm a")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {canRetry && (
            <Button 
              className="w-full h-12"
              onClick={handleRetryPayment}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-2" />
              )}
              Retry Payment
            </Button>
          )}
          
          {session && (
            <Button 
              variant="outline" 
              className="w-full h-12"
              onClick={() => navigate(`/checkout/${session.id}`)}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Choose Another Payment Method
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full h-12"
            onClick={() => window.close()}
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Return to {merchant?.business_name || 'Merchant'}
          </Button>
        </div>

        {/* Help Notice */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          If the problem persists, please contact {merchant?.business_name || 'the merchant'} for assistance.
        </p>
      </div>
    </div>
  );
}