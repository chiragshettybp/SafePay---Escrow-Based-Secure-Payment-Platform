import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminMerchants, MerchantFilters } from "@/hooks/useAdminMerchants";
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
import { Eye, Filter, X, RefreshCw, Store, Search } from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending_verification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  suspended: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  banned: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const kycStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminMerchants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<MerchantFilters>({
    status: searchParams.get("status") || undefined,
    kycStatus: searchParams.get("kycStatus") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    search: searchParams.get("search") || undefined,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || "");

  const { merchants, isLoading, error } = useAdminMerchants(filters);

  const updateFilters = (newFilters: Partial<MerchantFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    const params = new URLSearchParams();
    if (updated.status) params.set("status", updated.status);
    if (updated.kycStatus) params.set("kycStatus", updated.kycStatus);
    if (updated.dateFrom) params.set("dateFrom", updated.dateFrom);
    if (updated.dateTo) params.set("dateTo", updated.dateTo);
    if (updated.search) params.set("search", updated.search);
    setSearchParams(params);
  };

  const handleSearch = () => {
    updateFilters({ search: searchInput || undefined });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters =
    filters.status || filters.kycStatus || filters.dateFrom || filters.dateTo || filters.search;

  return (
    <AdminLayout>
      <Seo
        title="Merchants | Admin"
        description="Manage all merchants on the platform"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merchants</h1>
            <p className="text-muted-foreground">
              Manage merchant accounts and verifications
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-64"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
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
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Status</label>
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">KYC Status</label>
                  <Select
                    value={filters.kycStatus || "all"}
                    onValueChange={(value) =>
                      updateFilters({ kycStatus: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All KYC statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All KYC statuses</SelectItem>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
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

        {/* Merchants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Merchants</span>
              <span className="text-sm font-normal text-muted-foreground">
                {merchants?.length || 0} merchants
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
                <p>Error loading merchants</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : merchants && merchants.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>KYC Status</TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants.map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {merchant.business_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {merchant.category || "Uncategorized"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{merchant.email}</span>
                              <span className="text-xs text-muted-foreground">
                                {merchant.phone || "No phone"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                kycStatusColors[merchant.kyc?.status || "not_started"] ||
                                "bg-gray-100"
                              }
                            >
                              {(merchant.kyc?.status || "not_started").replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={statusColors[merchant.status] || "bg-gray-100"}
                            >
                              {merchant.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {merchant.total_orders || 0}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{(merchant.total_revenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(merchant.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/admin/merchants/${merchant.user_id}`)
                              }
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
                  {merchants.map((merchant) => (
                    <Card
                      key={merchant.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/merchants/${merchant.user_id}`)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{merchant.business_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {merchant.email}
                            </p>
                          </div>
                          <Badge
                            className={statusColors[merchant.status] || "bg-gray-100"}
                          >
                            {merchant.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className={
                              kycStatusColors[merchant.kyc?.status || "not_started"]
                            }
                          >
                            KYC: {(merchant.kyc?.status || "not_started").replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Orders:</span>
                            <p className="font-medium">{merchant.total_orders || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Revenue:</span>
                            <p className="font-medium">
                              ₹{(merchant.total_revenue || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-sm text-muted-foreground">
                            Joined {format(new Date(merchant.created_at), "MMM d, yyyy")}
                          </span>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No merchants found</p>
                <p className="text-sm">
                  {hasActiveFilters
                    ? "Try adjusting your filters"
                    : "Merchants will appear here once they sign up"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
