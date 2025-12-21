import { Link, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import { format } from "date-fns";
import {
  Wallet,
  Clock,
  ArrowUpRight,
  Building2,
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  History,
  BadgeDollarSign
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  processing: { label: "Processing", color: "bg-amber-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: "Completed", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: "Failed", color: "bg-destructive", icon: <XCircle className="h-3 w-3" /> },
  pending: { label: "Pending", color: "bg-blue-500", icon: <Clock className="h-3 w-3" /> },
};

export default function MerchantPayouts() {
  const navigate = useNavigate();
  const {
    wallet,
    isLoadingWallet,
    bankAccounts,
    isLoadingBankAccounts,
    payouts,
    isLoadingPayouts,
    lastPayout,
    defaultBankAccount,
    MINIMUM_WITHDRAWAL,
  } = useMerchantWallet();

  const isLoading = isLoadingWallet || isLoadingBankAccounts || isLoadingPayouts;
  const canWithdraw = 
    wallet && 
    wallet.available_balance >= MINIMUM_WITHDRAWAL && 
    defaultBankAccount?.is_verified;

  const recentPayouts = payouts.slice(0, 5);

  if (isLoading) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        </PageTransition>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payouts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your earnings & withdrawals
            </p>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Available Balance */}
            <Card className="glass-card border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-green-500">
                      ₹{(wallet?.available_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Release */}
            <Card className="glass-card border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Release</p>
                    <p className="text-2xl font-bold text-amber-500">
                      ₹{(wallet?.pending_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">In escrow or processing</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Withdrawal */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Withdrawal</p>
                    <p className="text-2xl font-bold">
                      {lastPayout ? `₹${lastPayout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lastPayout 
                        ? format(new Date(lastPayout.processed_at || lastPayout.created_at), "MMM d, yyyy")
                        : "No withdrawals yet"
                      }
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Paid Out */}
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Paid Out</p>
                    <p className="text-2xl font-bold text-primary">
                      ₹{(wallet?.total_paid_out || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BadgeDollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bank Account & Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Linked Bank Account */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Bank Account
                </CardTitle>
                <CardDescription>
                  Your linked bank account for payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {defaultBankAccount ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{defaultBankAccount.bank_name}</p>
                          <p className="text-sm text-muted-foreground">
                            •••• {defaultBankAccount.account_number.slice(-4)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {defaultBankAccount.account_holder_name}
                          </p>
                        </div>
                        <Badge 
                          className={
                            defaultBankAccount.is_verified 
                              ? "bg-green-500 text-white" 
                              : "bg-amber-500 text-white"
                          }
                        >
                          {defaultBankAccount.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/merchant/payouts/bank-account")}
                    >
                      Manage Bank Accounts
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No bank account linked yet
                    </p>
                    <Button onClick={() => navigate("/merchant/payouts/bank-account")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bank Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Manage your payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full h-14 text-lg"
                  disabled={!canWithdraw}
                  onClick={() => navigate("/merchant/payouts/withdraw")}
                >
                  <ArrowUpRight className="h-5 w-5 mr-2" />
                  Withdraw Funds
                </Button>

                {!canWithdraw && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-600">
                      {!defaultBankAccount
                        ? "Add a bank account to withdraw funds"
                        : !defaultBankAccount.is_verified
                        ? "Your bank account is pending verification"
                        : `Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}`
                      }
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/merchant/payouts/history")}
                >
                  <History className="h-4 w-4 mr-2" />
                  View All Transactions
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payout Activity */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest payout transactions
                </CardDescription>
              </div>
              {payouts.length > 5 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/merchant/payouts/history">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentPayouts.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payout activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPayouts.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">Withdrawal</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payout.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{payout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <Badge className={`${statusConfig.color} text-white gap-1`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </MerchantLayout>
  );
}