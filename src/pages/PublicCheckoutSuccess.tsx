import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Receipt, ExternalLink, MessageCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  order_id: string | null;
  razorpay_payment_id: string | null;
  payment_method: string | null;
}

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
  payment_id: string | null;
  completed_at: string | null;
}

export default function PublicCheckoutSuccess() {
  const { merchantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentId = searchParams.get('payment_id');

    if (!sessionId && !paymentId) {
      setError("Invalid payment reference");
      setIsLoading(false);
      return;
    }

    const fetchPaymentData = async () => {
      try {
        // First fetch merchant by slug
        const { data: merchantData, error: merchantError } = await supabase
          .from("merchants")
          .select("id, business_name, slug")
          .eq("slug", merchantSlug)
          .single();

        if (merchantError || !merchantData) {
          navigate(`/pay/${merchantSlug}/failed?reason=merchant_not_found`);
          return;
        }

        setMerchant(merchantData);

        // Fetch session if provided
        if (sessionId) {
          const { data: sessionData, error: sessionError } = await supabase
            .from("checkout_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

          if (sessionError || !sessionData) {
            navigate(`/pay/${merchantSlug}/failed?reason=session_not_found`);
            return;
          }

          // Validate merchant matches
          if (sessionData.merchant_id !== merchantData.id) {
            navigate(`/pay/${merchantSlug}/failed?reason=invalid_merchant`);
            return;
          }

          // Check session status
          if (sessionData.status !== 'completed') {
            navigate(`/pay/${merchantSlug}/failed?session_id=${sessionId}`);
            return;
          }

          setSession(sessionData as SessionData);

          if (sessionData.payment_id) {
            const { data: paymentData } = await supabase
              .from("payments")
              .select("*")
              .eq("id", sessionData.payment_id)
              .single();

            if (paymentData) {
              setPayment(paymentData as unknown as PaymentData);
            }
          }
        } else if (paymentId) {
          // Fetch payment directly
          const { data: paymentData, error: paymentError } = await supabase
            .from("payments")
            .select("*, orders!inner(merchant_id)")
            .eq("id", paymentId)
            .single();

          if (paymentError || !paymentData) {
            navigate(`/pay/${merchantSlug}/failed?reason=payment_not_found`);
            return;
          }

          // Validate merchant matches
          const orderMerchantId = (paymentData.orders as { merchant_id: string })?.merchant_id;
          if (orderMerchantId !== merchantData.id) {
            navigate(`/pay/${merchantSlug}/failed?reason=invalid_merchant`);
            return;
          }

          // Validate payment status
          if (paymentData.status !== 'escrow' && paymentData.status !== 'released') {
            navigate(`/pay/${merchantSlug}/failed?payment_id=${paymentId}`);
            return;
          }

          setPayment(paymentData as unknown as PaymentData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching payment data:", err);
        setError("Failed to load payment details");
        setIsLoading(false);
      }
    };

    fetchPaymentData();
  }, [merchantSlug, searchParams, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amount = payment?.amount || session?.final_amount || 0;
  const paymentRef = payment?.razorpay_payment_id || payment?.id || session?.id;
  const paymentDate = payment?.created_at || session?.completed_at;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background">
      <div className="container max-w-lg mx-auto px-4 py-8 md:py-16">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Payment Successful
          </h1>
          <p className="text-muted-foreground">
            Your payment to {merchant?.business_name} was completed successfully.
          </p>
        </div>

        {/* Payment Summary Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="text-xl font-bold text-foreground">
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
            
            {payment?.payment_method && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium capitalize">{payment.payment_method}</span>
              </div>
            )}
            
            {paymentDate && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">
                  {format(new Date(paymentDate), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>
            )}
            
            {paymentRef && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Reference ID</span>
                <span className="font-mono text-sm">{paymentRef.slice(0, 16)}...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {payment?.id && (
            <Button 
              className="w-full h-12"
              onClick={() => navigate(`/pay/receipt/${payment.id}`)}
            >
              <Receipt className="h-5 w-5 mr-2" />
              View Receipt
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => window.location.href = `mailto:support@${merchant?.slug || 'merchant'}.com`}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Contact Merchant
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

        {/* Security Notice */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          🔒 This payment was processed securely. You will receive a confirmation email shortly.
        </p>
      </div>
    </div>
  );
}