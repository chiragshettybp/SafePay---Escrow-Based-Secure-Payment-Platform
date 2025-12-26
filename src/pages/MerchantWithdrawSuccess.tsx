import { useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import { format } from "date-fns";
import { 
  CheckCircle, 
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  Home
} from "lucide-react";

export default function MerchantWithdrawSuccess() {
  const { payoutId } = useParams<{ payoutId: string }>();
  const navigate = useNavigate();
  const { payouts, isLoadingPayouts } = useMerchantWallet();

  const payout = payouts.find(p => p.id === payoutId);

  if (isLoadingPayouts) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Skeleton className="h-96 w-full max-w-md" />
          </div>
        </PageTransition>
      </MerchantLayout>
    );
  }

  if (!payout) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Payout Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The payout you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate("/merchant/payouts")}>
                  Go to Payouts
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Success Banner */}
            <Card className="glass-card bg-green-500/5 border-green-500/20">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Withdrawal Submitted!</h1>
                <p className="text-muted-foreground">
                  Your withdrawal request has been submitted and is being processed.
                </p>
              </CardContent>
            </Card>

            {/* Payout Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Payout Summary</CardTitle>
                <CardDescription>
                  Details of your withdrawal request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount Breakdown */}
                <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Withdrawal Amount</span>
                    <span>₹{payout.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee (2.5%)</span>
                    <span>-₹{(payout.withdrawal_fee ?? payout.fee).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span>-₹{(payout.gst ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between font-semibold">
                    <span>You'll Receive</span>
                    <span className="text-2xl text-green-500">
                      ₹{payout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <span className="text-sm font-mono">{payout.transaction_id || payout.id.slice(0, 8)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-amber-500 text-white gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Requested On</span>
                    <span className="text-sm">
                      {format(new Date(payout.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {payout.bank_account && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Destination</span>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {payout.bank_account.bank_name} •••• {payout.bank_account.account_number.slice(-4)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimated Time */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Clock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-600">Estimated Deposit Time</p>
                    <p className="text-sm text-muted-foreground">
                      1-2 business days. You'll receive a notification when the funds are deposited.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/merchant/payouts/history")}
              >
                View Payout History
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                className="w-full"
                onClick={() => navigate("/merchant/payouts")}
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Payouts
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    </MerchantLayout>
  );
}