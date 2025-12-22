import { Seo } from "@/components/seo/Seo";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminMetricsGrid } from "@/components/admin/AdminMetricsGrid";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminAlerts } from "@/components/admin/AdminAlerts";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { AdminSummaryTables } from "@/components/admin/AdminSummaryTables";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

export default function AdminDashboard() {
  const {
    isLoading,
    metrics,
    recentActivity,
    alerts,
    chartData,
    dateRange,
    setDateRange,
  } = useAdminDashboard();

  return (
    <>
      <Seo
        title="Admin Dashboard"
        description="Admin control panel - Monitor and manage your marketplace"
        noIndex={true}
      />
      <AdminLayout
        alerts={{
          pendingKyc: metrics.pendingKyc,
          openDisputes: metrics.openDisputes,
          pendingWithdrawals: metrics.pendingWithdrawals,
          openTickets: metrics.openSupportTickets,
        }}
      >
        <div className="space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Dashboard Overview</h1>
              <p className="admin-page-subtitle">
                Real-time overview of your marketplace performance
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <AdminMetricsGrid metrics={metrics} isLoading={isLoading} />

          {/* Charts */}
          <AdminCharts
            chartData={chartData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isLoading={isLoading}
          />

          {/* Alerts, Activity & Quick Actions */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
            <AdminAlerts alerts={alerts} />
            <AdminActivityFeed activities={recentActivity} isLoading={isLoading} />
            <AdminQuickActions
              pendingKyc={metrics.pendingKyc}
              pendingWithdrawals={metrics.pendingWithdrawals}
              openDisputes={metrics.openDisputes}
            />
          </div>

          {/* Summary Tables */}
          <AdminSummaryTables />
        </div>
      </AdminLayout>
    </>
  );
}
