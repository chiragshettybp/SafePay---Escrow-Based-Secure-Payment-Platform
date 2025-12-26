import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  Building,
  Wallet,
  Activity,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Seo } from '@/components/seo/Seo';
import { useAdminCheckout } from '@/hooks/useAdminCheckout';

export default function AdminCheckout() {
  const navigate = useNavigate();
  const { metrics, gatewayHealth, systemAlerts, isLoading, refetch } = useAdminCheckout();

  const kpiCards = [
    {
      title: 'Total Sessions',
      value: metrics.totalSessions.toLocaleString(),
      change: metrics.sessionsChange,
      icon: ShoppingCart,
      onClick: () => navigate('/admin/checkout/sessions'),
    },
    {
      title: 'Completed Payments',
      value: metrics.completedPayments.toLocaleString(),
      change: metrics.completedChange,
      icon: CheckCircle,
      onClick: () => navigate('/admin/checkout/sessions?status=completed'),
    },
    {
      title: 'Conversion Rate',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      change: metrics.conversionChange,
      icon: TrendingUp,
      onClick: () => navigate('/admin/checkout/sessions'),
    },
    {
      title: 'Failure Rate',
      value: `${metrics.failureRate.toFixed(1)}%`,
      change: -metrics.failureChange,
      icon: XCircle,
      isNegative: true,
      onClick: () => navigate('/admin/checkout/sessions?status=failed'),
    },
    {
      title: 'Avg Duration',
      value: `${metrics.avgCheckoutDuration.toFixed(1)} min`,
      icon: Clock,
      onClick: () => navigate('/admin/checkout/sessions'),
    },
    {
      title: 'Sessions Today',
      value: metrics.sessionsToday.toLocaleString(),
      icon: Activity,
      onClick: () => navigate('/admin/checkout/sessions'),
    },
  ];

  const paymentMethods = [
    { name: 'UPI', icon: Smartphone },
    { name: 'Cards', icon: CreditCard },
    { name: 'Wallets', icon: Wallet },
    { name: 'NetBanking', icon: Building },
    { name: 'EMI', icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo title="Admin - Checkout Overview" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Checkout Overview</h1>
            <p className="text-muted-foreground">
              Platform-wide checkout health and performance (Prepaid Only)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate('/admin/checkout/sessions')}>
              View All Sessions
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  alert.severity === 'critical'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : alert.severity === 'error'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                }`}
                onClick={() => {
                  if (alert.sessionIds.length > 0) {
                    navigate(`/admin/checkout/session/${alert.sessionIds[0]}`);
                  } else {
                    navigate('/admin/checkout/sessions');
                  }
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`h-5 w-5 flex-shrink-0 ${
                        alert.severity === 'critical'
                          ? 'text-red-600'
                          : alert.severity === 'error'
                          ? 'text-orange-600'
                          : 'text-amber-600'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{alert.title}</p>
                        <Badge
                          variant={
                            alert.severity === 'critical'
                              ? 'destructive'
                              : alert.severity === 'error'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.title}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={kpi.onClick}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className="h-5 w-5 text-muted-foreground" />
                  {kpi.change !== undefined && (
                    <div
                      className={`flex items-center text-xs ${
                        (kpi.isNegative ? kpi.change < 0 : kpi.change > 0)
                          ? 'text-green-600'
                          : kpi.change < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {kpi.change > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : kpi.change < 0 ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : null}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gateway Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Gateway Health (Last 24h)
            </CardTitle>
            <CardDescription>Prepaid payment gateway performance</CardDescription>
          </CardHeader>
          <CardContent>
            {gatewayHealth.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gatewayHealth.map((gateway) => (
                  <div
                    key={gateway.gateway}
                    className={`p-4 rounded-lg border ${
                      gateway.isDegraded
                        ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium capitalize">{gateway.gateway}</span>
                      {gateway.isDegraded ? (
                        <Badge variant="destructive">Degraded</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">
                          Healthy
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-medium text-green-600">
                          {gateway.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={gateway.successRate} className="h-1.5" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Failure Rate</span>
                        <span
                          className={`font-medium ${
                            gateway.failureRate > 10 ? 'text-red-600' : 'text-muted-foreground'
                          }`}
                        >
                          {gateway.failureRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Latency</span>
                        <span className="font-medium">{gateway.avgLatency.toFixed(2)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Attempts</span>
                        <span className="font-medium">{gateway.totalAttempts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No gateway data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Active Payment Methods</CardTitle>
            <CardDescription>Prepaid-only payment options (No COD)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                >
                  <method.icon className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">{method.name}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              ✓ This platform is prepaid-only. COD is not available.
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/admin/checkout/sessions')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">All Sessions</h3>
                    <p className="text-sm text-muted-foreground">View & investigate</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/admin/checkout/sessions?status=failed')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Failed Sessions</h3>
                    <p className="text-sm text-muted-foreground">Investigate failures</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/admin/checkout/sessions?riskFlagged=true')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Risk Flagged</h3>
                    <p className="text-sm text-muted-foreground">Review flagged sessions</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}