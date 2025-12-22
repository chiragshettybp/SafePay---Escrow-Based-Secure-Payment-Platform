import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminEscrow, EscrowFilters } from "@/hooks/useAdminEscrow";
import { Search, Filter, Wallet, Lock, Unlock, AlertTriangle, Snowflake, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function AdminEscrow() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EscrowFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { escrowAccounts, metrics, isLoading } = useAdminEscrow({ ...filters, search: searchTerm });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const MetricCard = ({ title, value, icon: Icon, className }: { title: string; value: string | number; icon: React.ElementType; className?: string }) => (
    <Card className={className}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl md:text-2xl font-bold">{typeof value === "number" ? formatCurrency(value) : value}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const FilterSheet = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Filter className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[60vh]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={filters.isFrozen?.toString() || "all"} onValueChange={(v) => setFilters({ ...filters, isFrozen: v === "all" ? undefined : v === "true" })}>
              <SelectTrigger>
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="false">Active</SelectItem>
                <SelectItem value="true">Frozen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Risk Flag</label>
            <Select value={filters.riskFlag || "all"} onValueChange={(v) => setFilters({ ...filters, riskFlag: v === "all" ? undefined : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Any risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Risk Level</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Escrow Management</h1>
          <p className="text-muted-foreground">Platform-wide visibility of all escrow funds</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <MetricCard title="Total Escrow" value={metrics?.totalEscrowBalance || 0} icon={Wallet} />
              <MetricCard title="Locked Funds" value={metrics?.totalLockedFunds || 0} icon={Lock} />
              <MetricCard title="Releasable" value={metrics?.totalReleasableFunds || 0} icon={Unlock} />
              <MetricCard title="Pending Withdrawals" value={metrics?.pendingWithdrawals || 0} icon={DollarSign} />
              <MetricCard title="Failed Payouts" value={metrics?.failedPayouts || 0} icon={AlertTriangle} className="border-destructive/50" />
              <MetricCard title="Frozen Accounts" value={metrics?.frozenAccounts || 0} icon={Snowflake} />
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <FilterSheet />
          <div className="hidden md:flex gap-2">
            <Select value={filters.isFrozen?.toString() || "all"} onValueChange={(v) => setFilters({ ...filters, isFrozen: v === "all" ? undefined : v === "true" })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="false">Active</SelectItem>
                <SelectItem value="true">Frozen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.riskFlag || "all"} onValueChange={(v) => setFilters({ ...filters, riskFlag: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                  <TableHead className="text-right">Locked</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : escrowAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No escrow accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  escrowAccounts.map((account) => (
                    <TableRow
                      key={account.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/escrow/${account.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{account.merchant?.business_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{account.merchant?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.total_balance)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.locked_balance)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.available_balance)}</TableCell>
                      <TableCell className="text-center">{account.orders_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {account.is_frozen && <Badge variant="destructive">Frozen</Badge>}
                          {account.risk_flag && (
                            <Badge variant={account.risk_flag === "high" ? "destructive" : "secondary"}>
                              {account.risk_flag} risk
                            </Badge>
                          )}
                          {!account.is_frozen && !account.risk_flag && <Badge variant="outline">Active</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(account.updated_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          ) : escrowAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No escrow accounts found
              </CardContent>
            </Card>
          ) : (
            escrowAccounts.map((account) => (
              <Card
                key={account.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/admin/escrow/${account.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{account.merchant?.business_name || "Unknown"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{account.merchant?.email}</p>
                    </div>
                    <div className="flex gap-1">
                      {account.is_frozen && <Badge variant="destructive">Frozen</Badge>}
                      {account.risk_flag && (
                        <Badge variant={account.risk_flag === "high" ? "destructive" : "secondary"}>
                          {account.risk_flag}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-mono font-medium">{formatCurrency(account.total_balance)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Locked</p>
                      <p className="font-mono font-medium">{formatCurrency(account.locked_balance)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-mono font-medium">{formatCurrency(account.available_balance)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                    <span>{account.orders_count} linked orders</span>
                    <span>{format(new Date(account.updated_at), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
