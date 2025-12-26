import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  ShoppingCart, 
  CheckCircle, 
  TrendingUp, 
  XCircle, 
  CreditCard, 
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Loader2,
  Settings,
  UserCheck,
  ArrowUpDown,
  Gift,
  Key,
  Webhook,
  TestTube,
  Link,
  BarChart3,
  PieChart,
  PackageX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckout, CheckoutAlert, FunnelStep } from '@/hooks/useMerchantCheckout';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

export default function MerchantCheckoutDashboard() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const merchantId = merchant?.id;
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  });

  const { metrics, funnel, alerts, isLoading } = useMerchantCheckout({
    merchantId: merchantId || undefined,
    dateRange,
  });

  const handleMetricClick = (filter: Record<string, string>) => {
    const params = new URLSearchParams(filter);
    navigate(`/merchant/checkout/sessions?${params.toString()}`);
  };

  const handleAlertAction = (alert: CheckoutAlert) => {
    if (alert.filter) {
      const params = new URLSearchParams(alert.filter);
      navigate(`/merchant/checkout/sessions?${params.toString()}`);
    }
  };

  const handleFunnelClick = (step: FunnelStep) => {
    navigate(`/merchant/checkout/sessions?step=${step.step}`);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo title="Checkout Dashboard" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Checkout Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your checkout performance and conversions
            </p>
          </div>
          
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: startOfDay(range.from), to: endOfDay(range.to) });
                  }
                }}
                numberOfMonths={2}
              />
              <div className="flex gap-2 p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfDay(subDays(new Date(), 7)),
                    to: endOfDay(new Date()),
                  })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfDay(subDays(new Date(), 30)),
                    to: endOfDay(new Date()),
                  })}
                >
                  Last 30 days
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Sessions"
            value={metrics.totalSessions}
            icon={ShoppingCart}
            onClick={() => handleMetricClick({})}
          />
          <MetricCard
            title="Completed"
            value={metrics.completedSessions}
            icon={CheckCircle}
            iconColor="text-green-500"
            onClick={() => handleMetricClick({ status: 'completed' })}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            icon={TrendingUp}
            iconColor={metrics.conversionRate > 20 ? 'text-green-500' : 'text-amber-500'}
          />
          <MetricCard
            title="Failure Rate"
            value={`${metrics.paymentFailureRate}%`}
            icon={XCircle}
            iconColor={metrics.paymentFailureRate > 20 ? 'text-red-500' : 'text-muted-foreground'}
            onClick={() => handleMetricClick({ status: 'failed' })}
          />
          <MetricCard
            title="Prepaid / COD"
            value={`${metrics.prepaidCount} / ${metrics.codCount}`}
            icon={CreditCard}
          />
          <MetricCard
            title="Avg. Time"
            value={formatTime(metrics.avgCheckoutTime)}
            icon={Clock}
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversion Funnel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {funnel.length > 0 ? (
                <div className="space-y-3">
                  {funnel.map((step, index) => (
                    <FunnelBar
                      key={step.name}
                      step={step}
                      maxCount={funnel[0].count}
                      isLast={index === funnel.length - 1}
                      onClick={() => handleFunnelClick(step)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No checkout sessions in selected period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts & Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alerts & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onAction={() => handleAlertAction(alert)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>No alerts at the moment</p>
                  <p className="text-sm">Your checkout is performing well</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/merchant/checkout/sessions')}>
                View All Sessions
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/merchant/checkout/sessions?status=failed')}>
                View Failed Checkouts
              </Button>
              <Button variant="outline" onClick={() => navigate('/merchant/checkout/sessions?status=active')}>
                View Active Sessions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Checkout Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SettingsCard
                title="Login & Identification"
                description="OTP, guest checkout, auto-login"
                icon={UserCheck}
                onClick={() => navigate('/merchant/checkout/settings/login')}
              />
              <SettingsCard
                title="Payment Method Order"
                description="Reorder & prioritize payment methods"
                icon={ArrowUpDown}
                onClick={() => navigate('/merchant/checkout/settings/payment-order')}
              />
              <SettingsCard
                title="Prepaid Nudges"
                description="Conversion incentives & messaging"
                icon={Gift}
                onClick={() => navigate('/merchant/checkout/settings/prepaid-nudges')}
              />
              <SettingsCard
                title="All Settings"
                description="View complete checkout configuration"
                icon={Settings}
                onClick={() => navigate('/merchant/checkout/settings')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checkout Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Checkout Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SettingsCard
                title="Reports Overview"
                description="View checkout analytics summary"
                icon={PieChart}
                onClick={() => navigate('/merchant/checkout/reports')}
              />
              <SettingsCard
                title="Conversion Report"
                description="Funnel analysis & drop-off metrics"
                icon={TrendingUp}
                onClick={() => navigate('/merchant/checkout/reports/conversion')}
              />
              <SettingsCard
                title="RTO / Failure Report"
                description="Prepaid failure & refund analysis"
                icon={PackageX}
                onClick={() => navigate('/merchant/checkout/reports/rto')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checkout Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Checkout Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SettingsCard
                title="API Keys"
                description="Manage API keys for checkout integration"
                icon={Key}
                onClick={() => navigate('/merchant/checkout/integration/api-keys')}
              />
              <SettingsCard
                title="Webhooks"
                description="Configure webhook endpoints"
                icon={Webhook}
                onClick={() => navigate('/merchant/checkout/integration/webhooks')}
              />
              <SettingsCard
                title="Test Integration"
                description="Run test checkout flows"
                icon={TestTube}
                onClick={() => navigate('/merchant/checkout/integration/test')}
              />
              <SettingsCard
                title="Integration Overview"
                description="View integration status & health"
                icon={Link}
                onClick={() => navigate('/merchant/checkout/integration')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-xs text-muted-foreground truncate">{title}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// Funnel Bar Component
function FunnelBar({
  step,
  maxCount,
  isLast,
  onClick,
}: {
  step: FunnelStep;
  maxCount: number;
  isLast: boolean;
  onClick: () => void;
}) {
  const width = maxCount > 0 ? (step.count / maxCount) * 100 : 0;

  return (
    <div
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{step.name}</span>
        <span className="text-sm text-muted-foreground">
          {step.count} ({step.percentage}%)
        </span>
      </div>
      <div className="h-8 bg-muted rounded-lg overflow-hidden">
        <div
          className={`h-full transition-all ${
            isLast ? 'bg-green-500' : 'bg-primary'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// Alert Card Component
function AlertCard({
  alert,
  onAction,
}: {
  alert: CheckoutAlert;
  onAction: () => void;
}) {
  const getAlertStyle = () => {
    switch (alert.type) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-950/20';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:bg-amber-950/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getAlertStyle()}`}>
      <p className="font-medium text-sm mb-1">{alert.title}</p>
      <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
      {alert.action && (
        <Button variant="link" size="sm" className="p-0 h-auto" onClick={onAction}>
          {alert.action}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

// Settings Card Component
function SettingsCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <div
      className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
