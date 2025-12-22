import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPayments, PaymentFilters } from "@/hooks/useAdminPayments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Search, Filter, X, RefreshCw } from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  locked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_escrow: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  released: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function AdminPayments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<PaymentFilters>({
    status: searchParams.get("status") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  const { payments, isLoading, error } = useAdminPayments(filters);

  const updateFilters = (newFilters: Partial<PaymentFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    // Update URL params
    const params = new URLSearchParams();
    if (updated.status) params.set("status", updated.status);
    if (updated.dateFrom) params.set("dateFrom", updated.dateFrom);
    if (updated.dateTo) params.set("dateTo", updated.dateTo);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo;

  return (
    <AdminLayout>
      <Seo 
        title="Payments | Admin"
        description="Manage all escrow payments on the platform"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">
              Monitor and manage all escrow payments
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      updateFilters({ status: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="locked">In Escrow</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
                  />
                </div>

                <div className="flex items-end">
                  <Button variant="ghost" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Payments</span>
              <span className="text-sm font-normal text-muted-foreground">
                {payments?.length || 0} payments
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Error loading payments</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : payments && payments.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">
                            {payment.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {payment.orders?.product_name || "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                #{payment.order_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{payment.customer?.full_name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {payment.customer_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{payment.merchant?.business_name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {payment.merchant_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[payment.status] || "bg-gray-100"}>
                              {payment.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(payment.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/payments/${payment.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {payments.map((payment) => (
                    <Card
                      key={payment.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/payments/${payment.id}`)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">
                              {payment.orders?.product_name || "Unknown Order"}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono">
                              #{payment.id.slice(0, 8)}
                            </p>
                          </div>
                          <Badge className={statusColors[payment.status] || "bg-gray-100"}>
                            {payment.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>
                            <p className="font-medium">
                              {payment.customer?.full_name || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Merchant:</span>
                            <p className="font-medium">
                              {payment.merchant?.business_name || "Unknown"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-lg font-bold">
                            ₹{payment.amount.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(payment.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No payments found</p>
                <p className="text-sm">
                  {hasActiveFilters
                    ? "Try adjusting your filters"
                    : "Payments will appear here once orders are placed"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
