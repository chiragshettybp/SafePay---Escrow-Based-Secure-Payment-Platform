import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import { 
  ArrowLeft, 
  Edit2, 
  CreditCard, 
  Loader2, 
  Store, 
  FileText,
  Info,
  Shield,
  Lock
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function PaymentReview() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { useDraftOrder, deleteDraft } = usePaymentFlow();
  const { data: order, isLoading, error } = useDraftOrder(orderId || "");
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleEdit = () => {
    if (orderId) {
      deleteDraft(orderId);
    }
    navigate("/payment/new");
  };

  // Redirect to Razorpay payment page instead of direct confirm
  const handleProceedToPay = () => {
    if (!orderId || !agreedToTerms) return;
    setIsRedirecting(true);
    navigate(`/payment/pay/${orderId}`);
  };

  // Escrow fee: 1% platform fee + 18% GST on fee
  const ESCROW_FEE_PERCENT = 1;
  const GST_PERCENT = 18;
  const platformFee = order ? order.amount * (ESCROW_FEE_PERCENT / 100) : 0;
  const gstOnFee = platformFee * (GST_PERCENT / 100);
  const totalEscrowFee = Math.round((platformFee + gstOnFee) * 100) / 100;
  const totalAmount = order ? order.amount + totalEscrowFee : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[calc(100vh-120px)] flex flex-col">
            <div className="mb-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="flex-1 flex items-start justify-center">
              <Card className="w-full max-w-[500px] glass-card">
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (error || !order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center">
            <Card className="w-full max-w-[400px] glass-card text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <Info className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The payment you're looking for doesn't exist or has expired.
                </p>
                <Button onClick={() => navigate("/payment/new")} className="w-full">
                  Start New Payment
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
              onClick={() => navigate("/payment/new")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Review Payment</h1>
            <p className="text-muted-foreground mt-1">
              Confirm your payment details before locking escrow
            </p>
          </div>

          {/* Review Card */}
          <div className="flex-1 flex items-start justify-center pb-24 sm:pb-0">
            <Card className="w-full max-w-[500px] glass-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Payment Summary
                  </CardTitle>
                  <CardDescription>
                    Review all details before confirming
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Merchant Info */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant</p>
                    <p className="font-medium">{order.merchant_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {order.merchant_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Payment Description */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{order.product_name}</p>
                    {order.product_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.product_description}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Amount Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment Amount</span>
                    <span className="font-medium">₹{order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Platform Fee ({ESCROW_FEE_PERCENT}%)</span>
                    <span className="font-medium">₹{platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">GST on Fee ({GST_PERCENT}%)</span>
                    <span className="font-medium">₹{gstOnFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Escrow Terms */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary mb-1">Escrow Protection</p>
                      <p className="text-muted-foreground">
                        Funds will be held securely until you confirm delivery. 
                        The merchant receives payment only after your approval.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    I understand that this payment will be locked in escrow and released 
                    to the merchant only upon my confirmation of delivery.
                  </Label>
                </div>

                {/* Proceed to Pay Button (Desktop) */}
                <div className="hidden sm:block pt-2">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!agreedToTerms || isRedirecting}
                    onClick={handleProceedToPay}
                  >
                    {isRedirecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Proceed to Pay
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Created on {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border sm:hidden">
            <Button
              className="w-full"
              size="lg"
              disabled={!agreedToTerms || isRedirecting}
              onClick={handleProceedToPay}
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Redirecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Pay
                </>
              )}
            </Button>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
