import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/seo/Seo";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  escrow_locked: { label: "Escrow Locked", variant: "default", icon: ShoppingCart },
  in_progress: { label: "In Progress", variant: "default", icon: Clock },
  delivered: { label: "Delivered", variant: "outline", icon: Truck },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  disputed: { label: "Disputed", variant: "destructive", icon: AlertTriangle },
  refunded: { label: "Refunded", variant: "secondary", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "secondary", icon: XCircle },
  draft: { label: "Draft", variant: "outline", icon: Clock },
};

const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  completed: { label: "Paid", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
  escrow: { label: "In Escrow", variant: "default" },
};

const shipmentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_shipped: { label: "Not Shipped", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  in_transit: { label: "In Transit", variant: "default" },
  out_for_delivery: { label: "Out for Delivery", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const {
    isLoading,
    orders,
    stats,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    page,
    setPage,
    totalPages,
    refetch,
  } = useAdminOrders();

  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput });
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchInput("");
  };

  const handleStatusFilter = (status: string) => {
    setFilters({ ...filters, status: status === "all" ? undefined : status });
  };

  return (
    <>
      <Seo
        title="Admin Orders"
        description="Manage all orders across the marketplace"
        noIndex={true}
      />
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Orders Management</h1>
              <p className="text-muted-foreground">
                View and manage all orders across the platform
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("all")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("pending")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("in_progress")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("delivered")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.delivered}</div>
                <div className="text-xs text-muted-foreground">Delivered</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("completed")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("disputed")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-destructive">{stats.disputed}</div>
                <div className="text-xs text-muted-foreground">Disputed</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("refunded")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.refunded}</div>
                <div className="text-xs text-muted-foreground">Refunded</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusFilter("cancelled")}>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.cancelled}</div>
                <div className="text-xs text-muted-foreground">Cancelled</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Order ID, Product, Merchant..."
                      className="pl-10"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>
                <div className="flex gap-2">
                  <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="escrow_locked">Escrow Locked</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-[150px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="highest">Highest Value</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4" />
                  </Button>
                  {(filters.status || filters.search) && (
                    <Button variant="ghost" onClick={handleClearFilters}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date From</label>
                    <Input
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date To</label>
                    <Input
                      type="date"
                      value={filters.dateTo || ""}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Amount (₹)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.amountMin || ""}
                      onChange={(e) => setFilters({ ...filters, amountMin: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Amount (₹)</label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={filters.amountMax || ""}
                      onChange={(e) => setFilters({ ...filters, amountMax: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No orders found</h3>
                  <p className="text-muted-foreground">
                    {filters.status || filters.search
                      ? "Try adjusting your filters"
                      : "Orders will appear here once created"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Merchant</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Order Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Shipment</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const status = statusConfig[order.status] || statusConfig.pending;
                          const StatusIcon = status.icon;
                          const paymentStatus = paymentStatusConfig[order.payment_status || "pending"] || paymentStatusConfig.pending;
                          const shipmentStatus = shipmentStatusConfig[order.shipment_status || "not_shipped"] || shipmentStatusConfig.not_shipped;

                          return (
                            <TableRow
                              key={order.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                            >
                              <TableCell className="font-mono text-sm">
                                {order.id.slice(0, 8)}...
                              </TableCell>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {order.product_name}
                              </TableCell>
                              <TableCell>{order.customer_name}</TableCell>
                              <TableCell>{order.merchant_business_name}</TableCell>
                              <TableCell className="text-right font-medium">
                                ₹{Number(order.amount).toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell>
                                <Badge variant={status.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={paymentStatus.variant}>
                                  {paymentStatus.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={shipmentStatus.variant}>
                                  {shipmentStatus.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(order.created_at), "MMM d, yyyy")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {orders.map((order) => {
                      const status = statusConfig[order.status] || statusConfig.pending;
                      const StatusIcon = status.icon;
                      const paymentStatus = paymentStatusConfig[order.payment_status || "pending"] || paymentStatusConfig.pending;

                      return (
                        <Card
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-medium">{order.product_name}</p>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {order.id.slice(0, 8)}...
                                </p>
                              </div>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Customer:</span>
                                <p className="font-medium">{order.customer_name}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Merchant:</span>
                                <p className="font-medium">{order.merchant_business_name}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Amount:</span>
                                <p className="font-medium">₹{Number(order.amount).toLocaleString("en-IN")}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Payment:</span>
                                <Badge variant={paymentStatus.variant} className="ml-1">
                                  {paymentStatus.label}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                              {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}
