import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminDisputes, DisputeFilters } from "@/hooks/useAdminDisputes";
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
import { Eye, Filter, X, RefreshCw, AlertTriangle } from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<DisputeFilters>({
    status: searchParams.get("status") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  const { disputes, isLoading, error } = useAdminDisputes(filters);

  const updateFilters = (newFilters: Partial<DisputeFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

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
        title="Disputes | Admin"
        description="Manage and resolve platform disputes"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Disputes</h1>
            <p className="text-muted-foreground">
              Review and resolve customer disputes
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) =>
                      updateFilters({ dateFrom: e.target.value || undefined })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) =>
                      updateFilters({ dateTo: e.target.value || undefined })
                    }
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

        {/* Disputes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Disputes</span>
              <span className="text-sm font-normal text-muted-foreground">
                {disputes?.length || 0} disputes
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
                <p>Error loading disputes</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : disputes && disputes.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispute ID</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disputes.map((dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-mono text-sm">
                            {dispute.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {dispute.orders?.product_name || "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                #{dispute.order_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{dispute.customer?.full_name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {dispute.customer_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span>{dispute.merchant?.business_name || "Unknown"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="truncate max-w-[150px] block">
                              {dispute.reason}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{dispute.orders?.amount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[dispute.status] || "bg-gray-100"}>
                              {dispute.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(dispute.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
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
                  {disputes.map((dispute) => (
                    <Card
                      key={dispute.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">
                              {dispute.orders?.product_name || "Unknown Order"}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono">
                              #{dispute.id.slice(0, 8)}
                            </p>
                          </div>
                          <Badge className={statusColors[dispute.status] || "bg-gray-100"}>
                            {dispute.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {dispute.reason}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>
                            <p className="font-medium">
                              {dispute.customer?.full_name || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Merchant:</span>
                            <p className="font-medium">
                              {dispute.merchant?.business_name || "Unknown"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-lg font-bold">
                            ₹{dispute.orders?.amount?.toLocaleString() || 0}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(dispute.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No disputes found</p>
                <p className="text-sm">
                  {hasActiveFilters
                    ? "Try adjusting your filters"
                    : "Disputes will appear here when raised by customers"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
