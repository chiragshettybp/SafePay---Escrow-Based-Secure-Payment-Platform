import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  XCircle,
  CheckCircle,
  RefreshCcw,
  Truck,
  Calendar,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutReports } from '@/hooks/useMerchantCheckoutReports';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

export default function MerchantCheckoutReports() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const merchantId = merchant?.id;
  
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });

  const { conversionMetrics, rtoMetrics, isLoading } = useMerchantCheckoutReports({
    merchantId,
    filters: { dateRange },
  });

  // Calculate change indicators (comparing to previous period - simplified)
  const getChangeIndicator = (value: number, isGood: boolean) => {
    // For demo, we show positive/negative based on threshold
    const isPositive = isGood ? value > 50 : value < 20;
    return {
      isPositive,
      icon: isPositive ? ArrowUpRight : ArrowDownRight,
      color: isPositive ? 'text-green-600' : 'text-red-600',
    };
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
      <Seo title="Checkout Reports" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Checkout Reports</h1>
            <p className="text-muted-foreground">
              Analyze your prepaid checkout performance
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <ReportCard
            title="Total Sessions"
            value={conversionMetrics.totalSessions}
            icon={BarChart3}
            onClick={() => navigate('/merchant/checkout/sessions')}
          />
          <ReportCard
            title="Successful Payments"
            value={conversionMetrics.completedSessions}
            icon={CheckCircle}
            iconColor="text-green-500"
            onClick={() => navigate('/merchant/checkout/sessions?status=completed')}
          />
          <ReportCard
            title="Conversion Rate"
            value={`${conversionMetrics.conversionRate}%`}
            icon={TrendingUp}
            iconColor={conversionMetrics.conversionRate > 20 ? 'text-green-500' : 'text-amber-500'}
            change={getChangeIndicator(conversionMetrics.conversionRate, true)}
          />
          <ReportCard
            title="Payment Failure"
            value={`${conversionMetrics.paymentFailureRate}%`}
            icon={XCircle}
            iconColor={conversionMetrics.paymentFailureRate > 20 ? 'text-red-500' : 'text-muted-foreground'}
            change={getChangeIndicator(conversionMetrics.paymentFailureRate, false)}
          />
          <ReportCard
            title="Refund Rate"
            value={`${conversionMetrics.refundRate}%`}
            icon={RefreshCcw}
            iconColor={conversionMetrics.refundRate > 10 ? 'text-amber-500' : 'text-muted-foreground'}
          />
          <ReportCard
            title="Delivery Failure"
            value={`${conversionMetrics.deliveryFailureRate}%`}
            icon={Truck}
            iconColor={conversionMetrics.deliveryFailureRate > 10 ? 'text-red-500' : 'text-muted-foreground'}
          />
        </div>

        {/* Report Navigation */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/merchant/checkout/reports/conversion')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Conversion Report</h3>
                      <p className="text-sm text-muted-foreground">
                        Analyze checkout funnel & drop-offs
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Conversion: </span>
                      <span className="font-medium">{conversionMetrics.conversionRate}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sessions: </span>
                      <span className="font-medium">{conversionMetrics.totalSessions}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/merchant/checkout/reports/rto')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-destructive/10">
                      <TrendingDown className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">RTO / Failure Report</h3>
                      <p className="text-sm text-muted-foreground">
                        Track prepaid delivery failures & refunds
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Loss Rate: </span>
                      <span className="font-medium text-destructive">{rtoMetrics.netRevenueLoss}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Refunds: </span>
                      <span className="font-medium">{rtoMetrics.ordersRefunded}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-primary">{conversionMetrics.totalSessions}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Checkout Sessions</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-green-600">{conversionMetrics.completedSessions}</p>
                <p className="text-sm text-muted-foreground mt-1">Successful Payments</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{rtoMetrics.totalPaidOrders}</p>
                <p className="text-sm text-muted-foreground mt-1">Prepaid Orders</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-green-600">{rtoMetrics.deliveredSuccessfully}</p>
                <p className="text-sm text-muted-foreground mt-1">Delivered Successfully</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}

interface ReportCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  onClick?: () => void;
  change?: {
    isPositive: boolean;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };
}

function ReportCard({ title, value, icon: Icon, iconColor = 'text-primary', onClick, change }: ReportCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <span className="text-xs text-muted-foreground truncate">{title}</span>
          </div>
          {change && (
            <change.icon className={`h-4 w-4 ${change.color}`} />
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
