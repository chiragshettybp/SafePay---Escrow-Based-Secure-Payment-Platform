import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantOrders, OrderStatus, MerchantOrder } from "@/hooks/useMerchantOrders";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Filter,
  Eye,
  Truck,
  Upload,
  MessageSquare,
  MoreHorizontal,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
} from "lucide-react";

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending Shipment", variant: "secondary" },
  escrow_locked: { label: "Payment Locked", variant: "default" },
  in_progress: { label: "In Transit", variant: "default" },
  delivered: { label: "Awaiting Confirmation", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  disputed: { label: "Disputed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  draft: { label: "Draft", variant: "secondary" },
};

const ITEMS_PER_PAGE = 10;

export default function MerchantOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { orders, isLoading, updateShipmentStatus, isUpdating } = useMerchantOrders(
    statusFilter === "all" ? null : statusFilter
  );

  // Filter orders by search query
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.product_name.toLowerCase().includes(query)
    );
  }).filter((order) => {
    // Date range filter
    if (dateRange.start && new Date(order.created_at) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(order.created_at) > new Date(dateRange.end + "T23:59:59")) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateRange.start, dateRange.end]);

  const canAddTracking = (status: OrderStatus) => {
    return ["pending", "escrow_locked"].includes(status);
  };

  const canEditTracking = (status: OrderStatus) => {
    return ["in_progress"].includes(status);
  };

  const canUploadProof = (status: OrderStatus) => {
    return ["in_progress", "delivered"].includes(status);
  };

  const OrderActions = ({ order }: { order: MerchantOrder }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/merchant/order/${order.id}`} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </Link>
        </DropdownMenuItem>
        {canAddTracking(order.status) && (
          <DropdownMenuItem asChild>
            <Link to={`/merchant/order/${order.id}/tracking/add`} className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Add Tracking
            </Link>
          </DropdownMenuItem>
        )}
        {canEditTracking(order.status) && (
          <DropdownMenuItem asChild>
            <Link to={`/merchant/order/${order.id}/tracking/edit`} className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Edit Tracking
            </Link>
          </DropdownMenuItem>
        )}
        {canUploadProof(order.status) && (
          <DropdownMenuItem asChild>
            <Link to={`/merchant/order/${order.id}/delivery-proof`} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Delivery Proof
            </Link>
          </DropdownMenuItem>
        )}
        {order.status === "disputed" && (
          <DropdownMenuItem asChild>
            <Link to={`/merchant/dispute/${order.id}`} className="flex items-center gap-2 text-destructive">
              <MessageSquare className="h-4 w-4" />
              Respond to Dispute
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <MerchantLayout>
        <Seo title="Orders | Merchant Portal" description="Manage your orders" canonicalPath="/merchant/orders" />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Orders | Merchant Portal"
        description="Manage your escrow orders, shipments, and deliveries"
        canonicalPath="/merchant/orders"
      />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage shipments and track customer confirmations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order ID or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-4">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as OrderStatus | "all")}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending Shipment</SelectItem>
                <SelectItem value="escrow_locked">Payment Locked</SelectItem>
                <SelectItem value="in_progress">In Transit</SelectItem>
                <SelectItem value="delivered">Awaiting Confirmation</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="Start date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="End date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-40"
              />
            </div>

            {(statusFilter !== "all" || dateRange.start || dateRange.end) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setDateRange({ start: "", end: "" });
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Mobile Filters */}
          <div className="md:hidden">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {(statusFilter !== "all" || dateRange.start || dateRange.end) && (
                      <Badge variant="secondary" className="ml-2">Active</Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as OrderStatus | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Shipment</SelectItem>
                    <SelectItem value="escrow_locked">Payment Locked</SelectItem>
                    <SelectItem value="in_progress">In Transit</SelectItem>
                    <SelectItem value="delivered">Awaiting Confirmation</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="Start"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="End"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>

                {(statusFilter !== "all" || dateRange.start || dateRange.end) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setStatusFilter("all");
                      setDateRange({ start: "", end: "" });
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Orders Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "Orders from customers will appear here once they make a purchase"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Delivery Deadline</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-sm truncate">{order.product_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.product_description || "No description"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{Number(order.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[order.status]?.variant || "default"}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.expected_delivery_date ? (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(order.expected_delivery_date), "MMM dd")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <OrderActions order={order} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-card border border-border rounded-xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{order.product_name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge variant={statusConfig[order.status]?.variant || "default"}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount</span>
                      <p className="font-semibold">₹{Number(order.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <p>{format(new Date(order.created_at), "MMM dd, yyyy")}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button asChild variant="outline" size="sm" className="flex-1 min-w-[100px]">
                      <Link to={`/merchant/order/${order.id}`}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        Details
                      </Link>
                    </Button>
                    {canAddTracking(order.status) && (
                      <Button asChild variant="default" size="sm" className="flex-1 min-w-[100px]">
                        <Link to={`/merchant/order/${order.id}/tracking/add`}>
                          <Truck className="h-4 w-4 mr-1.5" />
                          Add Tracking
                        </Link>
                      </Button>
                    )}
                    {canEditTracking(order.status) && (
                      <Button asChild variant="default" size="sm" className="flex-1 min-w-[100px]">
                        <Link to={`/merchant/order/${order.id}/tracking/edit`}>
                          <Truck className="h-4 w-4 mr-1.5" />
                          Edit Tracking
                        </Link>
                      </Button>
                    )}
                    {canUploadProof(order.status) && (
                      <Button asChild variant="secondary" size="sm" className="flex-1 min-w-[100px]">
                        <Link to={`/merchant/order/${order.id}/delivery-proof`}>
                          <Upload className="h-4 w-4 mr-1.5" />
                          Upload Proof
                        </Link>
                      </Button>
                    )}
                    {order.status === "disputed" && (
                      <Button asChild variant="destructive" size="sm" className="flex-1 min-w-[100px]">
                        <Link to={`/merchant/dispute/${order.id}`}>
                          <AlertCircle className="h-4 w-4 mr-1.5" />
                          Respond
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of{" "}
                  {filteredOrders.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MerchantLayout>
  );
}
