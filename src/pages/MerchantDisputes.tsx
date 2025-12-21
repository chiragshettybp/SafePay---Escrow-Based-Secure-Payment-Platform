import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantDisputes, MerchantDisputeStatus, ISSUE_TYPES } from "@/hooks/useMerchantDisputes";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Filter,
  MessageSquare,
  Upload,
  Eye,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const statusConfig: Record<
  MerchantDisputeStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof AlertCircle }
> = {
  open: { label: "Pending Response", variant: "destructive", icon: AlertTriangle },
  under_review: { label: "Under Review", variant: "default", icon: Clock },
  resolved: { label: "Resolved", variant: "secondary", icon: CheckCircle },
  closed: { label: "Closed", variant: "outline", icon: XCircle },
};

const ITEMS_PER_PAGE = 10;

export default function MerchantDisputes() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MerchantDisputeStatus | "all">("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { disputes, isLoadingDisputes } = useMerchantDisputes(
    statusFilter === "all" ? null : statusFilter
  );

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = dispute.id.toLowerCase().includes(query);
        const matchesOrderId = dispute.order_id.toLowerCase().includes(query);
        const matchesReason = dispute.reason.toLowerCase().includes(query);
        if (!matchesId && !matchesOrderId && !matchesReason) return false;
      }

      // Date range filter
      if (dateRange.start && new Date(dispute.created_at) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(dispute.created_at) > new Date(dateRange.end + "T23:59:59")) return false;

      return true;
    });
  }, [disputes, searchQuery, dateRange]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: disputes.length,
      pending: disputes.filter((d) => d.status === "open" && !d.merchant_responded).length,
      underReview: disputes.filter((d) => d.status === "under_review").length,
      resolved: disputes.filter((d) => d.status === "resolved" || d.status === "closed").length,
    };
  }, [disputes]);

  // Pagination
  const totalPages = Math.ceil(filteredDisputes.length / ITEMS_PER_PAGE);
  const paginatedDisputes = filteredDisputes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateRange.start, dateRange.end]);

  const getIssueTypeLabel = (value: string | null) => {
    return ISSUE_TYPES.find((t) => t.value === value)?.label || value || "Unknown";
  };

  const isUrgent = (dispute: typeof disputes[0]) => {
    if (dispute.merchant_responded) return false;
    const createdAt = new Date(dispute.created_at);
    const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSince > 24; // Urgent if over 24 hours without response
  };

  // Loading skeleton
  if (isLoadingDisputes) {
    return (
      <MerchantLayout>
        <Seo title="Disputes | Merchant Portal" description="Manage customer disputes" canonicalPath="/merchant/disputes" />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
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
        title="Disputes | Merchant Portal"
        description="Manage and respond to customer disputes"
        canonicalPath="/merchant/disputes"
      />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and respond to customer disputes
            </p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Response</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{metrics.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{metrics.underReview}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{metrics.resolved}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Dispute ID, Order ID, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-4">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as MerchantDisputeStatus | "all")}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Pending Response</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
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
                  onValueChange={(val) => setStatusFilter(val as MerchantDisputeStatus | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Pending Response</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
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
        {filteredDisputes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Disputes Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "Customer disputes will appear here"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDisputes.map((dispute) => {
                    const StatusIcon = statusConfig[dispute.status]?.icon || AlertCircle;
                    const urgent = isUrgent(dispute);
                    return (
                      <TableRow
                        key={dispute.id}
                        className={`hover:bg-muted/20 ${urgent ? "bg-destructive/5" : ""}`}
                      >
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            {urgent && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            {dispute.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {dispute.order_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getIssueTypeLabel(dispute.issue_type)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusConfig[dispute.status]?.variant || "default"}
                            className="gap-1"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[dispute.status]?.label || dispute.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {dispute.status === "open" && !dispute.merchant_responded && (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/merchant/dispute/${dispute.id}/respond`)}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Respond
                              </Button>
                            )}
                            {(dispute.status === "open" || dispute.status === "under_review") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/merchant/dispute/${dispute.id}/upload`)}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Upload
                              </Button>
                            )}
                            {(dispute.status === "resolved" || dispute.status === "closed") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/merchant/dispute/${dispute.id}/result`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            {dispute.status === "under_review" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/merchant/dispute/${dispute.id}/respond`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedDisputes.map((dispute) => {
                const StatusIcon = statusConfig[dispute.status]?.icon || AlertCircle;
                const urgent = isUrgent(dispute);
                return (
                  <div
                    key={dispute.id}
                    className={`p-4 bg-card border rounded-xl space-y-4 ${
                      urgent ? "border-destructive/50 bg-destructive/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {urgent && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                          <p className="font-medium text-sm truncate">{getIssueTypeLabel(dispute.issue_type)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          #{dispute.id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge
                        variant={statusConfig[dispute.status]?.variant || "default"}
                        className="gap-1 flex-shrink-0"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[dispute.status]?.label || dispute.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Order</span>
                        <p className="font-mono text-xs">{dispute.order_id.slice(0, 8)}...</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created</span>
                        <p>{format(new Date(dispute.created_at), "MMM dd, yyyy")}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {dispute.status === "open" && !dispute.merchant_responded ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/merchant/dispute/${dispute.id}/respond`)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      ) : dispute.status === "resolved" || dispute.status === "closed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/merchant/dispute/${dispute.id}/result`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Decision
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/merchant/dispute/${dispute.id}/respond`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      )}
                      {(dispute.status === "open" || dispute.status === "under_review") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/merchant/dispute/${dispute.id}/upload`)}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredDisputes.length)} of {filteredDisputes.length}
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
