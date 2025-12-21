import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMerchantWallet, MerchantPayout } from "@/hooks/useMerchantWallet";
import { format } from "date-fns";
import {
  ArrowLeft,
  Search,
  ArrowUpRight,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  History,
  Filter
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  processing: { label: "Processing", color: "bg-amber-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: "Completed", color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: "Failed", color: "bg-destructive", icon: <XCircle className="h-3 w-3" /> },
  pending: { label: "Pending", color: "bg-blue-500", icon: <Clock className="h-3 w-3" /> },
};

export default function MerchantPayoutHistory() {
  const navigate = useNavigate();
  const { payouts, isLoadingPayouts } = useMerchantWallet();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter payouts
  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch =
      searchQuery === "" ||
      payout.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.amount.toString().includes(searchQuery);

    const matchesStatus =
      statusFilter === "all" || payout.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const totalCompleted = payouts
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + p.net_amount, 0);
  const totalProcessing = payouts
    .filter(p => p.status === "processing")
    .reduce((sum, p) => sum + p.net_amount, 0);
  const totalFailed = payouts
    .filter(p => p.status === "failed")
    .reduce((sum, p) => sum + p.net_amount, 0);

  if (isLoadingPayouts) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
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
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/merchant/payouts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payouts
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payout History</h1>
            <p className="text-muted-foreground mt-1">
              View all your payout transactions
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold text-green-500">₹{totalCompleted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processing</p>
                    <p className="text-xl font-bold text-amber-500">₹{totalProcessing.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-xl font-bold text-destructive">₹{totalFailed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, transaction ID, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transactions
              </CardTitle>
              <CardDescription>
                {filteredPayouts.length} transaction{filteredPayouts.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPayouts.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "No transactions match your filters"
                      : "No payout transactions yet"
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Net Amount</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayouts.map((payout) => {
                          const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
                          return (
                            <TableRow key={payout.id}>
                              <TableCell className="font-mono text-sm">
                                {payout.transaction_id || payout.id.slice(0, 8)}
                              </TableCell>
                              <TableCell>₹{payout.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="font-semibold">
                                ₹{payout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                {payout.bank_account ? (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      {payout.bank_account.bank_name} •••• {payout.bank_account.account_number.slice(-4)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {format(new Date(payout.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${statusConfig.color} text-white gap-1`}>
                                  {statusConfig.icon}
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredPayouts.map((payout) => {
                      const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
                      return (
                        <div
                          key={payout.id}
                          className="p-4 rounded-lg bg-muted/30 border space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {payout.transaction_id || payout.id.slice(0, 8)}
                              </span>
                            </div>
                            <Badge className={`${statusConfig.color} text-white gap-1`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">₹{payout.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(payout.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                          {payout.bank_account && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4" />
                              <span>
                                {payout.bank_account.bank_name} •••• {payout.bank_account.account_number.slice(-4)}
                              </span>
                            </div>
                          )}
                          {payout.failure_reason && (
                            <p className="text-sm text-destructive">
                              Failed: {payout.failure_reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </MerchantLayout>
  );
}