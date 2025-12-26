import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MessageCircle, ExternalLink, Loader2, Link2 } from "lucide-react";
import { format } from "date-fns";

interface MerchantData {
  id: string;
  business_name: string;
  slug: string;
}

interface ExpiredData {
  type: 'session' | 'link';
  expired_at: string | null;
  title?: string;
  amount?: number;
}

export default function PublicCheckoutExpired() {
  const { merchantSlug } = useParams();
  const [searchParams] = useSearchParams();
  
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [expiredData, setExpiredData] = useState<ExpiredData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const linkCode = searchParams.get('link_code');

    const fetchData = async () => {
      try {
        // Fetch merchant by slug
        const { data: merchantData } = await supabase
          .from("merchants")
          .select("id, business_name, slug")
          .eq("slug", merchantSlug)
          .single();

        if (merchantData) {
          setMerchant(merchantData);
        }

        // Fetch expired session or link
        if (sessionId) {
          const { data: sessionData } = await supabase
            .from("checkout_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

          if (sessionData) {
            setExpiredData({
              type: 'session',
              expired_at: sessionData.expires_at,
              amount: sessionData.final_amount,
            });
          }
        } else if (linkCode) {
          const { data: linkData } = await supabase
            .from("payment_links")
            .select("*")
            .eq("link_code", linkCode)
            .single();

          if (linkData) {
            setExpiredData({
              type: 'link',
              expired_at: linkData.expires_at,
              title: linkData.title,
              amount: linkData.amount,
            });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background dark:from-amber-950/20 dark:to-background">
      <div className="container max-w-lg mx-auto px-4 py-8 md:py-16">
        {/* Expired Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Clock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {expiredData?.type === 'link' ? 'Payment Link Expired' : 'Checkout Session Expired'}
          </h1>
          <p className="text-muted-foreground">
            This {expiredData?.type === 'link' ? 'payment link' : 'checkout session'} is no longer valid.
          </p>
        </div>

        {/* Expiry Details Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {merchant && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Merchant</span>
                <span className="font-medium">{merchant.business_name}</span>
              </div>
            )}
            
            {expiredData?.title && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Payment For</span>
                <span className="font-medium">{expiredData.title}</span>
              </div>
            )}
            
            {expiredData?.amount && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">₹{expiredData.amount.toLocaleString('en-IN')}</span>
              </div>
            )}
            
            {expiredData?.expired_at && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Expired On</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {format(new Date(expiredData.expired_at), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What to do next */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">What to do next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                Contact {merchant?.business_name || 'the merchant'} to request a new payment link
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                Complete your payment using the new link within the given timeframe
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                If you've already paid, check your email for a receipt
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full h-12"
            onClick={() => window.location.href = `mailto:support@${merchant?.slug || 'merchant'}.com`}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Contact {merchant?.business_name || 'Merchant'}
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full h-12"
            onClick={() => window.close()}
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Close Window
          </Button>
        </div>

        {/* Info Notice */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Payment links expire for security reasons. Request a new link from the merchant to complete your payment.
        </p>
      </div>
    </div>
  );
}