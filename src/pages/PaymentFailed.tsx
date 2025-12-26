import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  XCircle, 
  RefreshCw, 
  ArrowLeft, 
  AlertTriangle,
  HelpCircle,
  CreditCard
} from "lucide-react";

export default function PaymentFailed() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  const failureReason = searchParams.get("reason") || "Payment could not be completed";

  // Fetch order details
  const { data: order } = useQuery({
    queryKey: ["failed-order", orderId],
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

  // Fetch payment details
  const { data: payment } = useQuery({
    queryKey: ["failed-payment", orderId],
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

  const handleRetry = () => {
    navigate(`/payment/pay/${orderId}`);
  };

  const handleCancel = () => {
    navigate("/payment/new");
  };

  const handleSupport = () => {
    navigate("/support/create");
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4">
          <Card className="w-full max-w-md glass-card">
            <CardHeader className="text-center pb-4">
              {/* Failure Icon */}
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">Payment Failed</CardTitle>
              <CardDescription>
                Your payment could not be processed
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Failure Reason */}
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Reason</p>
                    <p className="text-sm text-muted-foreground mt-1">{failureReason}</p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              {order && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">Order Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-mono">{orderId?.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Merchant</span>
                        <span>{order.merchant_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product</span>
                        <span>{order.product_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">
                          ₹{order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Payment Gateway Info */}
              {payment?.razorpay_order_id && (
                <div className="text-xs text-muted-foreground text-center">
                  Reference: {payment.razorpay_order_id}
                </div>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3">
                {order?.status === "draft" && (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Payment
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCancel}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Start New Payment
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground"
                  onClick={handleSupport}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  If the amount was deducted from your account, it will be refunded within 5-7 business days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Back Link */}
          <Button
            variant="link"
            className="mt-6 text-muted-foreground"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}