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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Wallet</h1>
              <p className="text-muted-foreground">
                Manage your balance, transactions, and bank accounts
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/wallet/transactions")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Transactions
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/wallet/withdraw")}
                disabled={!wallet?.balance || wallet.balance <= 0}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
              <Button onClick={() => navigate("/wallet/bank-account")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <WalletIcon className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  {isLoadingWallet ? (
                    <Skeleton className="h-10 w-40" />
                  ) : (
                    <h2 className="text-4xl font-bold text-foreground">
                      {formatCurrency(wallet?.balance || 0, wallet?.currency)}
                    </h2>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {wallet?.updated_at ? format(new Date(wallet.updated_at), "PPp") : "N/A"}
                  </p>
                </div>
                <Badge variant={wallet?.status === "active" ? "default" : "secondary"}>
                  {wallet?.status === "active" ? "Verified" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Refunds Received</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(metrics.totalRefundsReceived)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(metrics.totalWithdrawn)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Refunds</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(metrics.pendingRefunds)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linked Bank Accounts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Linked Bank Accounts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/wallet/bank-account")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingBankAccounts ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : bankAccounts && bankAccounts.length > 0 ? (
                <div className="space-y-3">
                  {bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.bank_name}</p>
                            {account.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ••••{account.account_number.slice(-4)} • {account.ifsc_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            account.verification_status === "verified"
                              ? "default"
                              : account.verification_status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
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
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-1">
                    No bank accounts linked
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a bank account to receive refunds directly
                  </p>
                  <Button onClick={() => navigate("/wallet/bank-account")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/wallet/transactions")}
              >
                View All
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
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
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-1">
                    No transactions yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your transaction history will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
