import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { OrderMetrics } from "@/components/orders/OrderMetrics";
import { useOrders, OrderStatus } from "@/hooks/useOrders";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/layout/PageTransition";

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "escrow_locked", label: "Escrow Locked" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "disputed", label: "Disputed" },
  { value: "refunded", label: "Refunded" },
];

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    orders,
    metrics,
    isLoading,
    confirmDelivery,
    isConfirming,
  } = useOrders(statusFilter !== "all" ? statusFilter as OrderStatus : null);

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

  return (
    <DashboardLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <PageTransition>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
              <p className="text-muted-foreground mt-1">
                View and manage all your escrow orders
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          {/* Metrics Cards */}
          <OrderMetrics metrics={metrics} isLoading={isLoading} />

          {/* Orders Table */}
          <OrdersTable
            orders={filteredOrders}
            isLoading={isLoading}
            onConfirmDelivery={confirmDelivery}
            isConfirming={isConfirming}
          />
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
