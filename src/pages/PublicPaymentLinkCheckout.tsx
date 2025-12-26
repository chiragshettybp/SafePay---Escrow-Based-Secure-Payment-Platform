import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Store, ShieldCheck, AlertCircle, IndianRupee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePublicPaymentLink } from "@/hooks/usePaymentLinks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/seo/Seo";

export default function PublicPaymentLinkCheckout() {
  const { merchant_slug, checkout_id } = useParams<{ merchant_slug: string; checkout_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { paymentLink, merchant, isLoading, error } = usePublicPaymentLink(checkout_id);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const handleProceed = async () => {
    if (!paymentLink || !merchant) return;

    // Validate merchant slug matches
    if (merchant.slug !== merchant_slug) {
      toast({
        title: "Invalid Link",
        description: "This payment link is not valid for this merchant.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingSession(true);
      setShowDetails(false);

      // Create checkout session with payment link data
      const { data: session, error: sessionError } = await supabase
        .from("checkout_sessions")
        .insert({
          merchant_id: merchant.id,
          payment_link_id: paymentLink.id,
          cart_total: paymentLink.amount,
          final_amount: paymentLink.amount,
          cart_data: JSON.stringify([{
            id: paymentLink.id,
            name: paymentLink.title,
            price: paymentLink.amount,
            quantity: 1,
          }]),
          status: 'active',
          current_step: 'login',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          metadata: {
            payment_link_id: paymentLink.id,
            payment_link_code: paymentLink.link_code,
            success_redirect: paymentLink.success_redirect_url,
            cancel_redirect: paymentLink.cancel_redirect_url,
          },
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Redirect to checkout
      navigate(`/checkout/${session.id}`, { replace: true });
    } catch (err) {
      console.error("Error creating checkout session:", err);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
      setIsCreatingSession(false);
      setShowDetails(true);
    }
  };

  if (isLoading) {
    return (
      <>
        <Seo 
          title="Loading Payment"
          description="Preparing your secure payment experience"
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading payment details...</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo 
          title="Payment Unavailable"
          description="Unable to load payment"
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold">Payment Unavailable</h1>
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (paymentLink && merchant && showDetails) {
    return (
      <>
        <Seo 
          title={`Pay ${paymentLink.title} - ${merchant.business_name}`}
          description={`Secure payment of ₹${paymentLink.amount.toLocaleString()} to ${merchant.business_name}`}
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col gap-6">
              {/* Merchant Branding */}
              <div className="flex flex-col items-center gap-3">
                {merchant.logo_url ? (
                  <img 
                    src={merchant.logo_url} 
                    alt={merchant.business_name} 
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="h-8 w-8 text-primary" />
                  </div>
                )}
                <h2 className="text-lg font-medium text-muted-foreground">{merchant.business_name}</h2>
              </div>

              {/* Payment Details */}
              <div className="text-center space-y-2">
                <h1 className="text-xl font-semibold">{paymentLink.title}</h1>
                {paymentLink.description && (
                  <p className="text-muted-foreground text-sm">{paymentLink.description}</p>
                )}
              </div>

              {/* Amount */}
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <div className="flex items-center justify-center gap-1">
                  <IndianRupee className="h-8 w-8" />
                  <span className="text-4xl font-bold">{paymentLink.amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{paymentLink.currency}</p>
              </div>

              {/* Proceed Button */}
              <Button 
                size="lg" 
                className="w-full" 
                onClick={handleProceed}
                disabled={isCreatingSession}
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Pay"
                )}
              </Button>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Secure payment processing</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (isCreatingSession) {
    return (
      <>
        <Seo 
          title={`Checkout - ${merchant?.business_name || 'Payment'}`}
          description="Redirecting to secure checkout"
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium">Redirecting to secure checkout...</p>
                <p className="text-sm text-muted-foreground mt-1">Please wait</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return null;
}
