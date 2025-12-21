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
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0">
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payouts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your earnings & withdrawals
            </p>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* Available Balance */}
            <Card className="glass-card border-green-500/20 bg-green-500/5 p-3 sm:p-0">
              <CardContent className="p-0 sm:pt-6 sm:px-6 sm:pb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Available</p>
                    <p className="text-base sm:text-2xl font-bold text-green-500 truncate">
                      ₹{(wallet?.available_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">Ready to withdraw</p>
                  </div>
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Release */}
            <Card className="glass-card border-amber-500/20 bg-amber-500/5 p-3 sm:p-0">
              <CardContent className="p-0 sm:pt-6 sm:px-6 sm:pb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Pending</p>
                    <p className="text-base sm:text-2xl font-bold text-amber-500 truncate">
                      ₹{(wallet?.pending_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">In escrow</p>
                  </div>
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Withdrawal */}
            <Card className="glass-card p-3 sm:p-0">
              <CardContent className="p-0 sm:pt-6 sm:px-6 sm:pb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Last Payout</p>
                    <p className="text-base sm:text-2xl font-bold truncate">
                      {lastPayout ? `₹${lastPayout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "-"}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">
                      {lastPayout 
                        ? format(new Date(lastPayout.processed_at || lastPayout.created_at), "MMM d")
                        : "No withdrawals"
                      }
                    </p>
                  </div>
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Paid Out */}
            <Card className="glass-card border-primary/20 bg-primary/5 p-3 sm:p-0">
              <CardContent className="p-0 sm:pt-6 sm:px-6 sm:pb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Total Paid</p>
                    <p className="text-base sm:text-2xl font-bold text-primary truncate">
                      ₹{(wallet?.total_paid_out || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">Lifetime</p>
                  </div>
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BadgeDollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bank Account & Actions */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Linked Bank Account */}
            <Card className="glass-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Bank Account
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your linked account for payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {defaultBankAccount ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{defaultBankAccount.bank_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            •••• {defaultBankAccount.account_number.slice(-4)}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {defaultBankAccount.account_holder_name}
                          </p>
                        </div>
                        <Badge 
                          className={`text-[10px] sm:text-xs flex-shrink-0 ${
                            defaultBankAccount.is_verified 
                              ? "bg-green-500 text-white" 
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {defaultBankAccount.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                      onClick={() => navigate("/merchant/payouts/bank-account")}
                    >
                      Manage Accounts
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 sm:py-6">
                    <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                      No bank account linked
                    </p>
                    <Button onClick={() => navigate("/merchant/payouts/bank-account")} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bank
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage your payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
                <Button
                  className="w-full h-11 sm:h-14 text-sm sm:text-lg"
                  disabled={!canWithdraw}
                  onClick={() => navigate("/merchant/payouts/withdraw")}
                >
                  <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Withdraw Funds
                </Button>

                {!canWithdraw && (
                  <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-amber-600">
                      {!defaultBankAccount
                        ? "Add a bank account to withdraw"
                        : !defaultBankAccount.is_verified
                        ? "Bank account pending verification"
                        : `Min. withdrawal: ₹${MINIMUM_WITHDRAWAL}`
                      }
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm"
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
            <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Latest payout transactions
                </CardDescription>
              </div>
              {payouts.length > 5 && (
                <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
                  <Link to="/merchant/payouts/history">
                    View All
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {recentPayouts.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <History className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm text-muted-foreground">No payout activity yet</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recentPayouts.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">Withdrawal</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {format(new Date(payout.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm sm:text-base">₹{payout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          <Badge className={`${statusConfig.color} text-white gap-1 text-[10px] sm:text-xs`}>
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

          {/* Mobile Sticky Withdraw Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border lg:hidden z-40">
            <Button
              className="w-full min-h-[44px]"
              disabled={!canWithdraw}
              onClick={() => navigate("/merchant/payouts/withdraw")}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw Funds
            </Button>
          </div>
        </div>
      </PageTransition>
    </MerchantLayout>
  );
}