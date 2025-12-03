import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Home, 
  Download, 
  Copy, 
  Store, 
  DollarSign,
  FileText,
  Lock,
  Calendar,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function PaymentSuccess() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['payment-success', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!orderId,
  });

  const { data: payment } = useQuery({
    queryKey: ['payment-record', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .eq('customer_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!orderId,
  });

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      toast({
        title: "Copied",
        description: "Order ID copied to clipboard",
      });
    }
  };

  const handleDownloadReceipt = () => {
    // In production, this would generate/download a PDF
    toast({
      title: "Receipt",
      description: "Receipt download will be available soon",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <Card className="w-full max-w-[500px] glass-card">
              <CardContent className="pt-8 pb-6 space-y-6">
                <div className="text-center">
                  <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-8 w-64 mx-auto mb-2" />
                  <Skeleton className="h-5 w-48 mx-auto" />
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
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
                <h2 className="text-xl font-semibold mb-2">Payment Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The payment you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const escrowFee = Math.round(order.amount * 0.025 * 100) / 100;
  const totalAmount = order.amount + escrowFee;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex items-center justify-center pb-20 sm:pb-0">
          <Card className="w-full max-w-[500px] glass-card overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center mx-auto mb-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                >
                  <CheckCircle2 className="h-10 w-10 text-[hsl(var(--success))]" />
                </motion.div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                Payment Locked in Escrow
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground"
              >
                Your funds are now secured
              </motion.p>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Order ID */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground">Order ID</p>
                  <p className="font-mono text-sm">{orderId?.slice(0, 16)}...</p>
                </div>
                <Button variant="ghost" size="sm" onClick={copyOrderId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Merchant</p>
                    <p className="font-medium">{order.merchant_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="font-medium">{order.product_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold">${totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {payment?.transaction_reference && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction Reference</p>
                      <p className="font-mono text-sm">{payment.transaction_reference}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Escrow Info */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">What's Next?</p>
                    <p className="text-muted-foreground">
                      Once the merchant delivers your order, you can confirm delivery 
                      from your dashboard to release the funds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDownloadReceipt}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Payment processed on {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
