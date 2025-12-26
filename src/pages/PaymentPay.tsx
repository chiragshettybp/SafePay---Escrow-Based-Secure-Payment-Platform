import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Shield, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Lock,
  RefreshCw
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayInitResponse {
  success: boolean;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  orderId: string;
  paymentId: string;
  key_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  merchant_name: string;
  product_name: string;
}

export default function PaymentPay() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const razorpayInstance = useRef<any>(null);
  const hasInitialized = useRef(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load payment gateway. Please refresh the page.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Fetch order details
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ["order-for-payment", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("customer_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user?.id,
  });

  // Fetch payment record
  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment-for-order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Initiate Razorpay payment
  const initiatePayment = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired");

      const response = await fetch(
        `https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/initiate-razorpay-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ",
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }
      return data as RazorpayInitResponse;
    },
  });

  // Verify payment
  const verifyPayment = useMutation({
    mutationFn: async (params: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired");

      const response = await fetch(
        `https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/verify-razorpay-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ",
          },
          body: JSON.stringify({
            orderId,
            ...params,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Payment verification failed");
      }
      return data;
    },
    onSuccess: async () => {
      // Now call confirm-payment to lock escrow
      await confirmEscrow();
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      navigate(`/payment/failed/${orderId}?reason=${encodeURIComponent(error.message)}`);
    },
  });

  // Confirm escrow (existing flow)
  const confirmEscrow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired");

      const response = await fetch(
        `https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/confirm-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ",
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to lock escrow");
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      navigate(`/payment/success/${orderId}`);
    } catch (error) {
      setIsProcessing(false);
      const message = error instanceof Error ? error.message : "Failed to complete payment";
      navigate(`/payment/failed/${orderId}?reason=${encodeURIComponent(message)}`);
    }
  };

  // Open Razorpay checkout
  const openRazorpayCheckout = async () => {
    if (!razorpayLoaded || !window.Razorpay) {
      toast({
        title: "Please wait",
        description: "Payment gateway is loading...",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const initData = await initiatePayment.mutateAsync();

      const options = {
        key: initData.key_id,
        amount: initData.amount,
        currency: initData.currency,
        name: "SafePay Escrow",
        description: `Payment for ${initData.product_name}`,
        order_id: initData.razorpay_order_id,
        prefill: initData.prefill,
        notes: {
          order_id: orderId,
          merchant: initData.merchant_name,
        },
        theme: {
          color: "#6366f1",
        },
        handler: async (response: any) => {
          console.log("Razorpay payment success:", response);
          await verifyPayment.mutateAsync({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment. You can try again.",
            });
          },
          escape: false,
          backdropclose: false,
        },
      };

      razorpayInstance.current = new window.Razorpay(options);
      razorpayInstance.current.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response);
        setIsProcessing(false);
        const reason = response.error?.description || response.error?.reason || "Payment failed";
        navigate(`/payment/failed/${orderId}?reason=${encodeURIComponent(reason)}`);
      });

      razorpayInstance.current.open();
    } catch (error) {
      setIsProcessing(false);
      const message = error instanceof Error ? error.message : "Failed to initiate payment";
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Check if payment already verified/completed
  useEffect(() => {
    if (payment?.gateway_status === "verified" && order?.status === "escrow_locked") {
      navigate(`/payment/success/${orderId}`);
    } else if (payment?.gateway_status === "verified" && order?.status === "draft") {
      // Payment verified but escrow not locked - complete the flow
      confirmEscrow();
    }
  }, [payment, order, orderId, navigate]);

  // Calculate amounts for display
  const ESCROW_FEE_PERCENT = 1;
  const GST_PERCENT = 18;
  const platformFee = order ? order.amount * (ESCROW_FEE_PERCENT / 100) : 0;
  const gstOnFee = platformFee * (GST_PERCENT / 100);
  const totalAmount = order ? order.amount + platformFee + gstOnFee : 0;

  if (orderLoading || paymentLoading) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (orderError || !order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <Card className="w-full max-w-md text-center">
              <CardContent className="pt-6">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The order you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate("/payment/new")}>
                  Create New Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (order.status !== "draft") {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <Card className="w-full max-w-md text-center">
              <CardContent className="pt-6">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Order Already Processed</h2>
                <p className="text-muted-foreground mb-4">
                  This order has already been processed with status: {order.status}
                </p>
                <Button onClick={() => navigate("/orders")}>
                  View Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/payment/review/${orderId}`)}
              disabled={isProcessing}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Review
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Complete Payment</h1>
            <p className="text-muted-foreground mt-1">
              Pay securely with Razorpay
            </p>
          </div>

          {/* Payment Card */}
          <div className="flex-1 flex items-start justify-center pb-24 sm:pb-0">
            <Card className="w-full max-w-md glass-card">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  {order.product_name} • {order.merchant_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Breakdown */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Amount</span>
                    <span>₹{order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee (1%)</span>
                    <span>₹{platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span>₹{gstOnFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary text-lg">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Security Note */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Shield className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-600 dark:text-green-400">Secure Payment</p>
                    <p className="text-muted-foreground">
                      Your payment is protected by Razorpay's secure payment gateway.
                    </p>
                  </div>
                </div>

                {/* Escrow Info */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">Escrow Protection</p>
                    <p className="text-muted-foreground">
                      Funds will be held in escrow until you confirm delivery.
                    </p>
                  </div>
                </div>

                {/* Pay Button (Desktop) */}
                <div className="hidden sm:block">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={openRazorpayCheckout}
                    disabled={isProcessing || !razorpayLoaded}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : !razorpayLoaded ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  By proceeding, you agree to our Terms of Service
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border sm:hidden">
            <Button
              className="w-full"
              size="lg"
              onClick={openRazorpayCheckout}
              disabled={isProcessing || !razorpayLoaded}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : !razorpayLoaded ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </>
              )}
            </Button>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}