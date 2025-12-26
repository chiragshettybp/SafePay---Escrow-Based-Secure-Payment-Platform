import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Store, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePublicMerchant } from "@/hooks/usePaymentLinks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/seo/Seo";

export default function PublicMerchantCheckout() {
  const { merchant_slug } = useParams<{ merchant_slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant, isLoading, error } = usePublicMerchant(merchant_slug);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    if (merchant && !isCreatingSession && !error) {
      createCheckoutSession();
    }
  }, [merchant]);

  const createCheckoutSession = async () => {
    if (!merchant) return;

    try {
      setIsCreatingSession(true);

      // Create a basic checkout session for this merchant
      const { data: session, error: sessionError } = await supabase
        .from("checkout_sessions")
        .insert({
          merchant_id: merchant.id,
          cart_total: 0,
          final_amount: 0,
          status: 'active',
          current_step: 'login',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
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
    }
  };

  if (isLoading) {
    return (
      <>
        <Seo 
          title="Loading Checkout"
          description="Preparing your secure checkout experience"
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading checkout...</p>
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
          title="Checkout Unavailable"
          description="Unable to load checkout"
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold">Checkout Unavailable</h1>
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

  if (merchant && isCreatingSession) {
    return (
      <>
        <Seo 
          title={`Checkout - ${merchant.business_name}`}
          description={`Secure checkout with ${merchant.business_name}`}
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
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
                <h1 className="text-xl font-semibold">{merchant.business_name}</h1>
              </div>

              {/* Loading Indicator */}
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Preparing secure checkout...</p>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Secure payment processing</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return null;
}
