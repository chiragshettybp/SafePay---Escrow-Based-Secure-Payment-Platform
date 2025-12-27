import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { useOrders, OrderStatus } from "@/hooks/useOrders";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  RefreshCw,
  Filter,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/PageTransition";

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "disputed", label: "Disputed" },
  { value: "refunded", label: "Refunded" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [metricFilter, setMetricFilter] = useState<string | null>(null);

  const effectiveFilter = metricFilter || (statusFilter !== "all" ? statusFilter : null);
  
  const {
    orders,
    metrics,
    isLoading,
    confirmDelivery,
    isConfirming,
  } = useOrders(effectiveFilter as OrderStatus | null);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        order.merchant_name.toLowerCase().includes(query) ||
        order.product_name.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const handleMetricClick = (filter: string | null) => {
    setMetricFilter(metricFilter === filter ? null : filter);
    setStatusFilter("all");
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setMetricFilter(null);
  };

  return (
    <DashboardLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <PageTransition>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Track your escrow orders and manage transactions
              </p>
            </div>
            <Button 
              onClick={() => navigate("/payment/new")}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Total Orders"
              value={metrics.total}
              icon={ShoppingBag}
              variant="primary"
              onClick={() => handleMetricClick(null)}
              isActive={metricFilter === null && statusFilter === "all"}
            />
            <MetricsCard
              title="Pending"
              value={metrics.pending}
              icon={Clock}
              variant="warning"
              onClick={() => handleMetricClick("pending")}
              isActive={metricFilter === "pending"}
            />
            <MetricsCard
              title="Completed"
              value={metrics.completed}
              icon={CheckCircle}
              variant="success"
              onClick={() => handleMetricClick("completed")}
              isActive={metricFilter === "completed"}
            />
            <MetricsCard
              title="Refunded"
              value={metrics.refunded}
              icon={RefreshCw}
              variant="destructive"
              onClick={() => handleMetricClick("refunded")}
              isActive={metricFilter === "refunded"}
            />
          </div>

          {/* Orders Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <OrdersTable
              orders={filteredOrders}
              isLoading={isLoading}
              onConfirmDelivery={confirmDelivery}
              isConfirming={isConfirming}
            />
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
