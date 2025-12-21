import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Building2,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { format } from "date-fns";

const transactionTypeConfig = {
  credit: { label: "Credit", icon: ArrowDownLeft, className: "text-green-600" },
  debit: { label: "Debit", icon: ArrowUpRight, className: "text-red-600" },
  refund: { label: "Refund", icon: ArrowDownLeft, className: "text-primary" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, className: "text-orange-600" },
};

const statusConfig = {
  success: { label: "Success", variant: "default" as const, icon: CheckCircle },
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  failed: { label: "Failed", variant: "destructive" as const, icon: AlertCircle },
};

export default function Wallet() {
  const navigate = useNavigate();
  const {
    wallet,
    transactions,
    bankAccounts,
    metrics,
    isLoadingWallet,
    isLoadingTransactions,
    isLoadingBankAccounts,
  } = useWallet();

  const recentTransactions = transactions?.slice(0, 5) || [];

  const formatCurrency = (amount: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Wallet</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your balance and transactions
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/wallet/transactions")}
                className="text-xs sm:text-sm"
              >
                <ExternalLink className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Transactions</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/wallet/withdraw")}
                disabled={!wallet?.balance || wallet.balance <= 0}
                className="text-xs sm:text-sm"
              >
                <ArrowUpRight className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Withdraw</span>
              </Button>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <WalletIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Available Balance</p>
                  {isLoadingWallet ? (
                    <Skeleton className="h-8 sm:h-10 w-32 sm:w-40" />
                  ) : (
                    <h2 className="text-2xl sm:text-4xl font-bold text-foreground truncate">
                      {formatCurrency(wallet?.balance || 0, wallet?.currency)}
                    </h2>
                  )}
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    Updated: {wallet?.updated_at ? format(new Date(wallet.updated_at), "PPp") : "N/A"}
                  </p>
                </div>
                <Badge variant={wallet?.status === "active" ? "default" : "secondary"} className="flex-shrink-0 text-xs">
                  {wallet?.status === "active" ? "Verified" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Refunds</p>
                  <p className="text-sm sm:text-xl font-semibold truncate">
                    {formatCurrency(metrics.totalRefundsReceived)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Withdrawn</p>
                  <p className="text-sm sm:text-xl font-semibold truncate">
                    {formatCurrency(metrics.totalWithdrawn)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Pending</p>
                  <p className="text-sm sm:text-xl font-semibold truncate">
                    {formatCurrency(metrics.pendingRefunds)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Linked Bank Accounts */}
          <Card>
            <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Bank Accounts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/wallet/bank-account")}
                className="text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {isLoadingBankAccounts ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 sm:h-20 w-full" />
                  ))}
                </div>
              ) : bankAccounts && bankAccounts.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm sm:text-base truncate">{account.bank_name}</p>
                            {account.is_default && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            ••••{account.account_number.slice(-4)} • {account.ifsc_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={
                            account.verification_status === "verified"
                              ? "default"
                              : account.verification_status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] sm:text-xs hidden sm:flex"
                        >
                          {account.verification_status === "verified" && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {account.verification_status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/wallet/bank-account?edit=${account.id}`)
                          }
                          className="text-xs"
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                    No bank accounts linked
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Add a bank account to receive refunds
                  </p>
                  <Button onClick={() => navigate("/wallet/bank-account")} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                Recent Transactions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/wallet/transactions")}
                className="text-xs sm:text-sm"
              >
                View All
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {isLoadingTransactions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 sm:h-14 w-full" />
                  ))}
                </div>
              ) : recentTransactions.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((transaction) => {
                          const typeConfig =
                            transactionTypeConfig[
                              transaction.type as keyof typeof transactionTypeConfig
                            ] || transactionTypeConfig.credit;
                          const sConfig =
                            statusConfig[
                              transaction.status as keyof typeof statusConfig
                            ] || statusConfig.pending;
                          const TypeIcon = typeConfig.icon;
                          const StatusIcon = sConfig.icon;

                          return (
                            <TableRow key={transaction.id}>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(transaction.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TypeIcon className={`h-4 w-4 ${typeConfig.className}`} />
                                  <span>{typeConfig.label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {transaction.description || "—"}
                              </TableCell>
                              <TableCell
                                className={
                                  transaction.type === "credit" ||
                                  transaction.type === "refund"
                                    ? "text-green-600 font-medium"
                                    : "text-red-600 font-medium"
                                }
                              >
                                {transaction.type === "credit" ||
                                transaction.type === "refund"
                                  ? "+"
                                  : "-"}
                                {formatCurrency(transaction.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={sConfig.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {sConfig.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2">
                    {recentTransactions.map((transaction) => {
                      const typeConfig =
                        transactionTypeConfig[
                          transaction.type as keyof typeof transactionTypeConfig
                        ] || transactionTypeConfig.credit;
                      const sConfig =
                        statusConfig[
                          transaction.status as keyof typeof statusConfig
                        ] || statusConfig.pending;
                      const TypeIcon = typeConfig.icon;

                      return (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              transaction.type === "credit" || transaction.type === "refund"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-red-100 dark:bg-red-900/30"
                            }`}>
                              <TypeIcon className={`h-4 w-4 ${typeConfig.className}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {typeConfig.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(transaction.created_at), "MMM d")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={`text-sm font-semibold ${
                                transaction.type === "credit" || transaction.type === "refund"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.type === "credit" || transaction.type === "refund"
                                ? "+"
                                : "-"}
                              {formatCurrency(transaction.amount)}
                            </p>
                            <Badge variant={sConfig.variant} className="text-[10px] mt-0.5">
                              {sConfig.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <RefreshCw className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                    No transactions yet
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Your transaction history will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Sticky Add Bank Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border lg:hidden z-40">
            <Button onClick={() => navigate("/wallet/bank-account")} className="w-full min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
