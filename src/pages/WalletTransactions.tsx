import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  RefreshCw,
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

export default function WalletTransactions() {
  const navigate = useNavigate();
  const { transactions, isLoadingTransactions } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t) => {
      const matchesSearch =
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reference_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, searchQuery, typeFilter, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/wallet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Wallet Transactions
              </h1>
              <p className="text-muted-foreground">
                View your complete transaction history
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingTransactions ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">
                    No transactions found
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Your transaction history will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => {
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
                          const isExpanded = expandedRow === transaction.id;

                          return (
                            <Collapsible
                              key={transaction.id}
                              open={isExpanded}
                              onOpenChange={() =>
                                setExpandedRow(isExpanded ? null : transaction.id)
                              }
                              asChild
                            >
                              <>
                                <TableRow className="cursor-pointer hover:bg-accent/50">
                                  <TableCell className="text-muted-foreground">
                                    {format(
                                      new Date(transaction.created_at),
                                      "MMM d, yyyy HH:mm"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <TypeIcon
                                        className={`h-4 w-4 ${typeConfig.className}`}
                                      />
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
                                  <TableCell>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <ChevronDown
                                          className={`h-4 w-4 transition-transform ${
                                            isExpanded ? "rotate-180" : ""
                                          }`}
                                        />
                                      </Button>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={6} className="py-4">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <p className="text-muted-foreground">
                                            Transaction ID
                                          </p>
                                          <p className="font-mono">
                                            {transaction.id.slice(0, 8)}...
                                          </p>
                                        </div>
                                        {transaction.reference_id && (
                                          <div>
                                            <p className="text-muted-foreground">
                                              Reference ID
                                            </p>
                                            <p className="font-mono">
                                              {transaction.reference_id.slice(0, 8)}...
                                            </p>
                                          </div>
                                        )}
                                        {transaction.reference_type && (
                                          <div>
                                            <p className="text-muted-foreground">
                                              Reference Type
                                            </p>
                                            <p className="capitalize">
                                              {transaction.reference_type}
                                            </p>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-muted-foreground">
                                            Last Updated
                                          </p>
                                          <p>
                                            {format(
                                              new Date(transaction.updated_at),
                                              "PPp"
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </>
                            </Collapsible>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredTransactions.map((transaction) => {
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
                      const isExpanded = expandedRow === transaction.id;

                      return (
                        <Collapsible
                          key={transaction.id}
                          open={isExpanded}
                          onOpenChange={() =>
                            setExpandedRow(isExpanded ? null : transaction.id)
                          }
                        >
                          <div className="border rounded-lg p-4 bg-card">
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                      transaction.type === "credit" ||
                                      transaction.type === "refund"
                                        ? "bg-green-100 dark:bg-green-900/30"
                                        : "bg-red-100 dark:bg-red-900/30"
                                    }`}
                                  >
                                    <TypeIcon
                                      className={`h-5 w-5 ${typeConfig.className}`}
                                    />
                                  </div>
                                  <div className="text-left">
                                    <p className="font-medium">{typeConfig.label}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(
                                        new Date(transaction.created_at),
                                        "MMM d, yyyy"
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p
                                    className={`font-semibold ${
                                      transaction.type === "credit" ||
                                      transaction.type === "refund"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {transaction.type === "credit" ||
                                    transaction.type === "refund"
                                      ? "+"
                                      : "-"}
                                    {formatCurrency(transaction.amount)}
                                  </p>
                                  <Badge
                                    variant={sConfig.variant}
                                    className="gap-1 mt-1"
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {sConfig.label}
                                  </Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Transaction ID
                                  </span>
                                  <span className="font-mono">
                                    {transaction.id.slice(0, 8)}...
                                  </span>
                                </div>
                                {transaction.description && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Description
                                    </span>
                                    <span>{transaction.description}</span>
                                  </div>
                                )}
                                {transaction.reference_id && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Reference
                                    </span>
                                    <span className="font-mono">
                                      {transaction.reference_id.slice(0, 8)}...
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
