import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, IndianRupee, Clock, CheckCircle, XCircle, AlertCircle, Building2, User } from "lucide-react";
import { useAdminPayouts, PayoutFilters } from "@/hooks/useAdminPayouts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  processing: { label: "Processing", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  paid: { label: "Paid", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: "Declined", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function AdminPayouts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<PayoutFilters>({
    status: searchParams.get("status") || "all",
    search: searchParams.get("search") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  });

  const { payouts, loading } = useAdminPayouts(filters);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = (key: keyof PayoutFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const stats = {
    total: payouts.length,
    pending: payouts.filter(p => ["processing", "pending"].includes(p.status)).length,
    approved: payouts.filter(p => ["approved", "paid"].includes(p.status)).length,
    declined: payouts.filter(p => ["declined", "failed"].includes(p.status)).length,
    totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Payouts"
          subtitle="Review and manage payout requests"
        />

        {/* Stats Cards */}
        <div className="mobile-grid-4">
          <AdminStatCard title="Total Requests" value={stats.total} />
          <AdminStatCard title="Pending Review" value={stats.pending} variant="warning" icon={<Clock className="h-4 w-4" />} />
          <AdminStatCard title="Approved/Paid" value={stats.approved} variant="success" icon={<CheckCircle className="h-4 w-4" />} />
          <AdminStatCard title="Total Amount" value={formatCurrency(stats.totalAmount)} icon={<IndianRupee className="h-4 w-4" />} />
        </div>

        {/* Filters */}
        <Card className="admin-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="admin-filters">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="From"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="w-[130px] sm:w-[140px] h-10 text-xs sm:text-sm"
                />
                <Input
                  type="date"
                  placeholder="To"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-[130px] sm:w-[140px] h-10 text-xs sm:text-sm hidden sm:block"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="hidden md:block admin-card-compact">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Payout ID</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Net</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Requested</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(7).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payout requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => {
                    const status = statusConfig[payout.status] || statusConfig.pending;
                    return (
                      <TableRow key={payout.id}>
                        <TableCell className="font-mono text-xs">
                          {payout.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{payout.user_name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {payout.user_type === 'merchant' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                              {payout.user_type}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{formatCurrency(payout.amount)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatCurrency(payout.net_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1 text-xs">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(payout.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => navigate(`/admin/payouts/${payout.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))
          ) : payouts.length === 0 ? (
            <Card className="admin-card-compact">
              <CardContent className="py-8 text-center text-muted-foreground">
                No payout requests found
              </CardContent>
            </Card>
          ) : (
            payouts.map((payout) => {
              const status = statusConfig[payout.status] || statusConfig.pending;
              return (
                <Card 
                  key={payout.id} 
                  className="admin-card-compact cursor-pointer active:bg-muted/50 transition-colors touch-highlight"
                  onClick={() => navigate(`/admin/payouts/${payout.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{payout.user_name || "Unknown"}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {payout.user_type === 'merchant' ? (
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <User className="h-3 w-3 text-muted-foreground" />
                          )}
                          <p className="text-xs text-muted-foreground capitalize">{payout.user_type}</p>
                        </div>
                      </div>
                      <Badge variant={status.variant} className="gap-1 text-[10px] flex-shrink-0">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Amount</p>
                        <p className="font-medium">{formatCurrency(payout.net_amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(payout.created_at), "dd MMM yyyy")}
                      </p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
