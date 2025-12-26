import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  TrendingUp,
  Calendar,
  Loader2,
  ChevronDown,
  Download,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutReports, exportToCSV } from '@/hooks/useMerchantCheckoutReports';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function MerchantCheckoutReportsConversion() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { merchant } = useMerchantAuth();
  const merchantId = merchant?.id;
  
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });
  
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('payment_method') || 'all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { 
    conversionMetrics, 
    funnelData, 
    trendData, 
    sessionBreakdown,
    paymentMethodStats,
    isLoading 
  } = useMerchantCheckoutReports({
    merchantId,
    filters: { 
      dateRange,
      paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
    },
  });

  const handleFunnelClick = (step: string) => {
    navigate(`/merchant/checkout/sessions?step=${step}`);
  };

  const handleExport = () => {
    exportToCSV(sessionBreakdown, `conversion-report-${format(new Date(), 'yyyy-MM-dd')}`);
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
      <Seo title="Conversion Report" />
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
              <h1 className="text-2xl font-bold">Conversion Report</h1>
              <p className="text-muted-foreground">
                Analyze checkout funnel performance (Prepaid Only)
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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

                  {/* Payment Method */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Cards</SelectItem>
                        <SelectItem value="wallet">Wallets</SelectItem>
                        <SelectItem value="emi">EMI</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="space-y-4">
                {funnelData.map((step, index) => (
                  <div 
                    key={step.step}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleFunnelClick(step.step)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{step.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">{step.count.toLocaleString()}</span>
                        <Badge variant={step.percentage > 50 ? 'default' : 'secondary'}>
                          {step.percentage}%
                        </Badge>
                        {step.dropOffRate > 0 && (
                          <span className="text-destructive text-xs">
                            -{step.dropOffRate}% drop
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-10 bg-muted rounded-lg overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          index === funnelData.length - 1 ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${step.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No checkout sessions in selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="conversionRate" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)"
                        name="Conversion Rate %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Success Rate Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="paymentSuccessRate" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        name="Payment Success %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodStats.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {paymentMethodStats.map((stat) => (
                  <div key={stat.method} className="p-4 rounded-lg border bg-card">
                    <p className="font-medium mb-2">{stat.method}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">{stat.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success:</span>
                        <span className="font-medium text-green-600">{stat.successful}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate:</span>
                        <Badge variant={stat.successRate > 70 ? 'default' : 'secondary'}>
                          {stat.successRate}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No payment method data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Session Breakdown by Date</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionBreakdown.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Sessions Started</TableHead>
                        <TableHead className="text-right">Payments Initiated</TableHead>
                        <TableHead className="text-right">Payments Successful</TableHead>
                        <TableHead className="text-right">Conversion %</TableHead>
                        <TableHead className="text-right">Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionBreakdown.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell className="font-medium">{row.date}</TableCell>
                          <TableCell className="text-right">{row.sessionsStarted}</TableCell>
                          <TableCell className="text-right">{row.paymentsInitiated}</TableCell>
                          <TableCell className="text-right text-green-600">{row.paymentsSuccessful}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.conversionPercent > 20 ? 'default' : 'secondary'}>
                              {row.conversionPercent}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatTime(row.avgCheckoutTime)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {sessionBreakdown.map((row) => (
                    <div key={row.date} className="p-4 rounded-lg border bg-card">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium">{row.date}</span>
                        <Badge variant={row.conversionPercent > 20 ? 'default' : 'secondary'}>
                          {row.conversionPercent}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Started: </span>
                          <span className="font-medium">{row.sessionsStarted}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Initiated: </span>
                          <span className="font-medium">{row.paymentsInitiated}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Success: </span>
                          <span className="font-medium text-green-600">{row.paymentsSuccessful}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Time: </span>
                          <span className="font-medium">{formatTime(row.avgCheckoutTime)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No session data available for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}

function formatTime(seconds: number): string {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
