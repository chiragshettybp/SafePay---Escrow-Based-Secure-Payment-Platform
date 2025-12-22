import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminWithdrawals, WithdrawalFilters } from "@/hooks/useAdminWithdrawals";
import { Search, IndianRupee, Clock, CheckCircle, AlertTriangle, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function AdminWithdrawals() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<WithdrawalFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { withdrawals, metrics, isLoading } = useAdminWithdrawals({ ...filters, search: searchTerm });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "approved": return "default";
      case "processing": return "outline";
      case "paid": case "completed": return "default";
      case "failed": case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Withdrawals"
          subtitle="Manage merchant and customer withdrawal requests"
        />

        {/* Metrics */}
        <div className="mobile-grid-4">
          <AdminStatCard 
            title="Pending" 
            value={formatCurrency(metrics?.totalPending || 0)} 
            icon={<Clock className="h-4 w-4" />}
          />
          <AdminStatCard 
            title="Processing" 
            value={formatCurrency(metrics?.totalProcessing || 0)} 
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <AdminStatCard 
            title="Total Paid" 
            value={formatCurrency(metrics?.totalPaid || 0)} 
            icon={<CheckCircle className="h-4 w-4" />}
            variant="success"
          />
          <AdminStatCard 
            title="Failed" 
            value={formatCurrency(metrics?.totalFailed || 0)} 
            icon={<AlertTriangle className="h-4 w-4" />}
            variant="destructive"
          />
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 h-10" 
            />
          </div>
          <div className="flex gap-2">
            <Select value={filters.userType || "all"} onValueChange={(v) => setFilters({ ...filters, userType: v === "all" ? undefined : v as "merchant" | "customer" })}>
              <SelectTrigger className="w-[120px] sm:w-[130px] h-10 text-xs sm:text-sm">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="merchant">Merchants</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-[110px] sm:w-[130px] h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block admin-card-compact">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No withdrawals found
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((w) => (
                  <TableRow 
                    key={w.id} 
                    className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => navigate(`/admin/withdrawals/${w.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium text-sm">{w.user_name || "Unknown"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.user_type === "merchant" ? "default" : "secondary"} className="text-xs">
                        {w.user_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(w.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(w.status)} className="text-xs capitalize">
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(w.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : withdrawals.length === 0 ? (
            <Card className="admin-card-compact">
              <CardContent className="py-8 text-center text-muted-foreground">
                No withdrawals found
              </CardContent>
            </Card>
          ) : (
            withdrawals.map((w) => (
              <Card 
                key={w.id} 
                className="admin-card-compact cursor-pointer active:bg-muted/50 transition-colors touch-highlight"
                onClick={() => navigate(`/admin/withdrawals/${w.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{w.user_name || "Unknown"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {w.user_type === "merchant" ? (
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{w.user_type}</span>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(w.status)} className="text-[10px] capitalize flex-shrink-0">
                      {w.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-semibold text-sm">{formatCurrency(w.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(w.created_at), "MMM d, yyyy")}
                    </p>
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
