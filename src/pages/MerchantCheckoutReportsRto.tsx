import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  TrendingDown,
  Calendar,
  Loader2,
  ArrowLeft,
  Package,
  RefreshCcw,
  Truck,
  MapPin,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutReports } from '@/hooks/useMerchantCheckoutReports';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function MerchantCheckoutReportsRto() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const merchantId = merchant?.id;
  
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });

  const { 
    rtoMetrics, 
    failureReasons,
    locationFailures,
    orders,
    isLoading 
  } = useMerchantCheckoutReports({
    merchantId,
    filters: { dateRange },
  });

  // Get failed orders for the table
  const failedOrders = orders?.filter(o => 
    ['refunded', 'delivery_failed', 'returned', 'cancelled'].includes(o.status)
  ).slice(0, 20) || [];

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
      <Seo title="RTO / Failure Report" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit gap-2"
            onClick={() => navigate('/merchant/checkout/reports')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">RTO / Failure Report</h1>
              <p className="text-muted-foreground">
                Track prepaid delivery failures, refunds & revenue loss
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
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Failure Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Paid Orders"
            value={rtoMetrics.totalPaidOrders}
            icon={Package}
          />
          <SummaryCard
            title="Delivered Successfully"
            value={rtoMetrics.deliveredSuccessfully}
            icon={Truck}
            iconColor="text-green-500"
          />
          <SummaryCard
            title="Orders Refunded"
            value={rtoMetrics.ordersRefunded}
            icon={RefreshCcw}
            iconColor="text-amber-500"
          />
          <SummaryCard
            title="Delivery Failed"
            value={rtoMetrics.deliveryFailed}
            icon={AlertTriangle}
            iconColor="text-red-500"
          />
          <SummaryCard
            title="Net Revenue Loss"
            value={`${rtoMetrics.netRevenueLoss}%`}
            icon={TrendingDown}
            iconColor="text-destructive"
            highlight
          />
        </div>

        {/* Success vs Failure Visual */}
        <Card>
          <CardHeader>
            <CardTitle>Order Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-green-600">Successful Deliveries</span>
                  <span className="text-sm font-medium">
                    {rtoMetrics.totalPaidOrders > 0 
                      ? Math.round((rtoMetrics.deliveredSuccessfully / rtoMetrics.totalPaidOrders) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={rtoMetrics.totalPaidOrders > 0 
                    ? (rtoMetrics.deliveredSuccessfully / rtoMetrics.totalPaidOrders) * 100
                    : 0} 
                  className="h-4"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <p className="text-2xl font-bold text-green-600">{rtoMetrics.deliveredSuccessfully}</p>
                <p className="text-muted-foreground">Delivered</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <p className="text-2xl font-bold text-amber-600">{rtoMetrics.ordersRefunded}</p>
                <p className="text-muted-foreground">Refunded</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <p className="text-2xl font-bold text-red-600">{rtoMetrics.deliveryFailed}</p>
                <p className="text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Failure Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Failure Reasons Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Failure Reason Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {failureReasons.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <div className="h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={failureReasons}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="count"
                          nameKey="reason"
                        >
                          {failureReasons.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {failureReasons.map((reason, index) => (
                      <div key={reason.reason} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{reason.reason}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reason.count}</span>
                          <Badge variant="secondary" className="text-xs">
                            {reason.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No failures in selected period</p>
                  <p className="text-sm">Great job! All orders delivered successfully.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Failure Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationFailures.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {locationFailures.map((location) => (
                    <div key={location.location} className="p-3 rounded-lg border bg-card">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium truncate">{location.location}</span>
                        <Badge 
                          variant={location.failureRate > 20 ? 'destructive' : 'secondary'}
                        >
                          {location.failureRate}% failure
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Total: {location.totalOrders}</span>
                        <span className="text-destructive">Failed: {location.failures}</span>
                      </div>
                      <Progress 
                        value={location.failureRate} 
                        className="h-2 mt-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No location-based failures</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Failed Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Failed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {failedOrders.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>₹{order.amount?.toLocaleString() || 0}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(order.status)}>
                              {formatStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/merchant/order/${order.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {failedOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/merchant/order/${order.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-sm">{order.id.slice(0, 8)}...</span>
                        <Badge variant={getStatusVariant(order.status)}>
                          {formatStatus(order.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">₹{order.amount?.toLocaleString() || 0}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {failedOrders.length >= 20 && (
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/merchant/orders?status=failed')}
                    >
                      View All Failed Orders
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                <p>No failed orders in selected period</p>
                <p className="text-sm">All prepaid orders delivered successfully!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  highlight?: boolean;
}

function SummaryCard({ title, value, icon: Icon, iconColor = 'text-primary', highlight }: SummaryCardProps) {
  return (
    <Card className={highlight ? 'border-destructive' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-xs text-muted-foreground truncate">{title}</span>
        </div>
        <p className={`text-2xl font-bold ${highlight ? 'text-destructive' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: string): 'destructive' | 'secondary' | 'outline' {
  switch (status) {
    case 'refunded':
      return 'secondary';
    case 'delivery_failed':
    case 'returned':
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    refunded: 'Refunded',
    delivery_failed: 'Delivery Failed',
    returned: 'Returned',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
}
