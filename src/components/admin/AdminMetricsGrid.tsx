import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Store,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Package,
  TrendingUp,
  Clock,
  Headphones,
  FileCheck,
} from "lucide-react";
import type { DashboardMetrics } from "@/hooks/useAdminDashboard";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
  href?: string;
  isLoading?: boolean;
  format?: "number" | "currency";
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  isLoading,
  format = "number",
}: MetricCardProps) {
  const navigate = useNavigate();

  const formattedValue =
    format === "currency"
      ? `₹${Number(value).toLocaleString("en-IN")}`
      : typeof value === "number"
      ? value.toLocaleString()
      : value;

  return (
    <Card
      className={href ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
      onClick={href ? () => navigate(href) : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{formattedValue}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.isPositive ? "text-green-600" : "text-destructive"
                }`}
              >
                {trend.isPositive ? "+" : "-"}
                {trend.value}% from last period
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface AdminMetricsGridProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
}

export function AdminMetricsGrid({ metrics, isLoading }: AdminMetricsGridProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <MetricCard
        title="Total Customers"
        value={metrics.totalCustomers}
        icon={Users}
        href="/admin/customers"
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Merchants"
        value={metrics.totalMerchants}
        subtitle={`${metrics.activeMerchants} active`}
        icon={Store}
        href="/admin/merchants"
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Orders"
        value={metrics.totalOrders}
        subtitle={`${metrics.ordersToday} today`}
        icon={ShoppingCart}
        href="/admin/orders"
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Revenue"
        value={metrics.totalRevenue}
        format="currency"
        icon={TrendingUp}
        href="/admin/payments"
        isLoading={isLoading}
      />
      <MetricCard
        title="Escrow Balance"
        value={metrics.escrowBalance}
        format="currency"
        icon={Wallet}
        href="/admin/payments"
        isLoading={isLoading}
      />
      <MetricCard
        title="Pending Payouts"
        value={metrics.pendingWithdrawals}
        subtitle={`₹${metrics.pendingPayoutsAmount?.toLocaleString("en-IN") || 0} total`}
        icon={Clock}
        href="/admin/payouts"
        isLoading={isLoading}
      />
      <MetricCard
        title="Open Disputes"
        value={metrics.openDisputes}
        icon={AlertTriangle}
        href="/admin/disputes"
        isLoading={isLoading}
      />
      <MetricCard
        title="Active Shipments"
        value={metrics.activeShipments}
        icon={Package}
        href="/admin/shipments"
        isLoading={isLoading}
      />
      <MetricCard
        title="Support Tickets"
        value={metrics.openSupportTickets}
        icon={Headphones}
        href="/admin/support"
        isLoading={isLoading}
      />
      <MetricCard
        title="Pending KYC"
        value={metrics.pendingKyc}
        icon={FileCheck}
        href="/admin/merchants?filter=pending_kyc"
        isLoading={isLoading}
      />
    </div>
  );
}

export default AdminMetricsGrid;
