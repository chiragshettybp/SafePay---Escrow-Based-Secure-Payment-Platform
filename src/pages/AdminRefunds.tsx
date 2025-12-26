import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminRefunds } from "@/hooks/useAdminRefunds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Seo } from "@/components/seo/Seo";
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  ArrowRight,
} from "lucide-react";

const statusColors: Record<string, string> = {
  initiated: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminRefunds() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { refunds, isLoading, metrics } = useAdminRefunds(
    statusFilter ? { status: statusFilter } : undefined
  );

  const filteredRefunds = refunds?.filter((refund) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      refund.id.toLowerCase().includes(query) ||
      refund.orders?.product_name?.toLowerCase().includes(query) ||
      refund.orders?.merchant_name?.toLowerCase().includes(query) ||
      refund.customer?.full_name?.toLowerCase().includes(query) ||
      refund.razorpay_refund_id?.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout>
      <Seo title="Refunds | Admin" description="Manage refunds and Razorpay refund requests" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Refunds</h1>
          <p className="text-muted-foreground">
            Monitor and manage all refund requests
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminStatCard
            title="Total Refunds"
            value={metrics.total}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <AdminStatCard
            title="Processing"
            value={metrics.processing}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <AdminStatCard
            title="Completed"
            value={metrics.success}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
          />
          <AdminStatCard
            title="Total Refunded"
            value={`₹${metrics.totalAmount.toLocaleString()}`}
            icon={<RefreshCw className="h-5 w-5" />}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, product, merchant, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="initiated">Initiated</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="success">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refunds List */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredRefunds && filteredRefunds.length > 0 ? (
              <div className="space-y-3">
                {filteredRefunds.map((refund) => (
                  <Link
                    key={refund.id}
                    to={`/admin/refunds/${refund.id}`}
                    className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm">
                            #{refund.id.slice(0, 8)}
                          </span>
                          <Badge className={statusColors[refund.status]}>
                            {refund.status}
                          </Badge>
                          {refund.refund_type && (
                            <Badge variant="outline" className="capitalize">
                              {refund.refund_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{refund.orders?.product_name || "Unknown Product"}</span>
                          <span>{refund.customer?.full_name || "Unknown Customer"}</span>
                          <span>{format(new Date(refund.created_at), "PP")}</span>
                        </div>
                        {refund.razorpay_refund_id && (
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            RZP: {refund.razorpay_refund_id}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            ₹{refund.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {refund.initiated_by || "system"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No refunds found</p>
                {(searchQuery || statusFilter) && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
