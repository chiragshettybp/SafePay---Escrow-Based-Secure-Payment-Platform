import { useState } from "react";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { MerchantMetricsCard } from "@/components/merchant/MerchantMetricsCard";
import { MerchantOrdersTable } from "@/components/merchant/MerchantOrdersTable";
import { MerchantAlerts } from "@/components/merchant/MerchantAlerts";
import { MerchantActivityFeed } from "@/components/merchant/MerchantActivityFeed";
import { useMerchantOrders, OrderStatus } from "@/hooks/useMerchantOrders";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Truck,
  PackageCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MerchantAuthProvider } from "@/hooks/useMerchantAuth";

function MerchantDashboardContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const { merchant } = useMerchantAuth();
  const {
    orders,
    metrics,
    isLoading,
    updateShipmentStatus,
    isUpdating,
  } = useMerchantOrders(statusFilter);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.product_name.toLowerCase().includes(query)
    );
  });

  const handleMetricClick = (filter: OrderStatus | null) => {
    setStatusFilter(filter === statusFilter ? null : filter);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <MerchantLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Welcome back, {merchant?.business_name || "Merchant"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's your escrow operations overview
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MerchantMetricsCard
            title="Total Orders"
            value={metrics.totalOrders}
            icon={ShoppingBag}
            variant="primary"
            onClick={() => handleMetricClick(null)}
            isActive={statusFilter === null}
          />
          <MerchantMetricsCard
            title="Pending Shipment"
            value={metrics.pendingShipment}
            icon={Truck}
            variant="warning"
            onClick={() => handleMetricClick("pending")}
            isActive={statusFilter === "pending"}
          />
          <MerchantMetricsCard
            title="Awaiting Confirmation"
            value={metrics.awaitingConfirmation}
            icon={PackageCheck}
            variant="info"
            onClick={() => handleMetricClick("delivered")}
            isActive={statusFilter === "delivered"}
          />
          <MerchantMetricsCard
            title="Disputes"
            value={metrics.disputes}
            icon={AlertTriangle}
            variant="destructive"
            onClick={() => handleMetricClick("disputed")}
            isActive={statusFilter === "disputed"}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <MerchantMetricsCard
            title="Completed Orders"
            value={metrics.completedOrders}
            icon={CheckCircle}
            variant="success"
            onClick={() => handleMetricClick("completed")}
            isActive={statusFilter === "completed"}
          />
          <MerchantMetricsCard
            title="Refunded"
            value={metrics.refundedOrders}
            icon={RefreshCw}
            variant="destructive"
            onClick={() => handleMetricClick("refunded")}
            isActive={statusFilter === "refunded"}
          />
          <MerchantMetricsCard
            title="Total Earnings"
            value={formatCurrency(metrics.totalEarnings)}
            icon={Wallet}
            variant="success"
            subtitle="From completed orders"
          />
        </div>

        {/* Alerts Section */}
        <MerchantAlerts
          disputeCount={metrics.disputes}
          pendingShipmentCount={metrics.pendingShipment}
        />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Orders Table */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Orders Overview
                </h2>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(val) =>
                    setStatusFilter(val === "all" ? null : (val as OrderStatus))
                  }
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="escrow_locked">Escrow Locked</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4">
                <MerchantOrdersTable
                  orders={filteredOrders}
                  isLoading={isLoading}
                  onUpdateStatus={(orderId, status) => updateShipmentStatus({ orderId, status })}
                  isUpdating={isUpdating}
                />
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Recent Activity
                </h2>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                <MerchantActivityFeed orders={orders} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}

export default function MerchantDashboard() {
  return (
    <MerchantAuthProvider>
      <MerchantDashboardContent />
    </MerchantAuthProvider>
  );
}
