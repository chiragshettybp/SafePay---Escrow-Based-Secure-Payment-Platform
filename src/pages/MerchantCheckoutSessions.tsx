import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  Flag, 
  MessageCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  Smartphone,
  Monitor,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckout, CheckoutSession } from '@/hooks/useMerchantCheckout';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MerchantCheckoutSessions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { merchant } = useMerchantAuth();
  const merchantId = merchant?.id;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Filters from URL
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [step, setStep] = useState(searchParams.get('step') || '');
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('payment_method') || '');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { sessions, isLoading, refetch } = useMerchantCheckout({
    merchantId: merchantId || undefined,
  });

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter(session => {
      if (status && session.status !== status) return false;
      if (step && session.current_step !== step) return false;
      if (paymentMethod && session.selected_payment_method !== paymentMethod) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesId = session.id.toLowerCase().includes(searchLower);
        const matchesPhone = session.phone_number?.includes(search);
        const matchesEmail = session.email?.toLowerCase().includes(searchLower);
        if (!matchesId && !matchesPhone && !matchesEmail) return false;
      }
      if (dateRange.from && new Date(session.created_at) < dateRange.from) return false;
      if (dateRange.to && new Date(session.created_at) > dateRange.to) return false;
      return true;
    });
  }, [sessions, status, step, paymentMethod, search, dateRange]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setStatus('');
    setStep('');
    setPaymentMethod('');
    setSearch('');
    setDateRange({});
    setSearchParams(new URLSearchParams());
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/merchant/checkout/session/${sessionId}`);
  };

  const handleRetryPayment = async (session: CheckoutSession) => {
    if (session.payment_attempts >= 5) {
      toast({ title: 'Maximum retry attempts reached', variant: 'destructive' });
      return;
    }

    try {
      await supabase
        .from('checkout_sessions')
        .update({
          status: 'active',
          current_step: 'payment',
          last_payment_error: null,
        })
        .eq('id', session.id);

      toast({ title: 'Session reopened for payment retry' });
      refetch();
    } catch (error) {
      toast({ title: 'Failed to retry payment', variant: 'destructive' });
    }
  };

  const handleFlagIssue = async (session: CheckoutSession) => {
    try {
      await supabase.from('checkout_risk_flags').insert({
        session_id: session.id,
        flag_type: 'merchant_flagged',
        severity: 'medium',
        description: 'Flagged for review by merchant',
      });

      toast({ title: 'Session flagged for review' });
      refetch();
    } catch (error) {
      toast({ title: 'Failed to flag session', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      completed: { variant: 'secondary', label: 'Completed' },
      failed: { variant: 'destructive', label: 'Failed' },
      expired: { variant: 'outline', label: 'Expired' },
      abandoned: { variant: 'outline', label: 'Abandoned' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      address: 'Address',
      payment: 'Payment',
      confirmation: 'Confirmation',
    };
    return labels[step] || step;
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return '-';
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  const maskEmail = (email: string | null) => {
    if (!email) return '-';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return local.slice(0, 2) + '***@' + domain;
  };

  const activeFiltersCount = [status, step, paymentMethod, dateRange.from].filter(Boolean).length;

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
      <Seo title="Checkout Sessions" />
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Checkout Sessions</h1>
            <p className="text-muted-foreground">
              {filteredSessions.length} sessions
              {activeFiltersCount > 0 && ` (filtered)`}
            </p>
          </div>
          
          <Button onClick={() => navigate('/merchant/checkout')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Quick Filters (Desktop) */}
              {!isMobile && (
                <>
                  <Select value={status} onValueChange={(v) => { setStatus(v); updateFilter('status', v); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={step} onValueChange={(v) => { setStep(v); updateFilter('step', v); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Step" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Steps</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="address">Address</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="confirmation">Confirmation</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); updateFilter('payment_method', v); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Methods</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cod">COD</SelectItem>
                      <SelectItem value="netbanking">Net Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Filter Button (Mobile) / Date Picker */}
              {isMobile ? (
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh]">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Step</label>
                        <Select value={step} onValueChange={setStep}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Steps" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Steps</SelectItem>
                            <SelectItem value="login">Login</SelectItem>
                            <SelectItem value="address">Address</SelectItem>
                            <SelectItem value="payment">Payment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Payment Method</label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Methods" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Methods</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="cod">COD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1" onClick={clearFilters}>
                          Clear All
                        </Button>
                        <Button className="flex-1" onClick={() => setShowFilters(false)}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table / Cards */}
        {isMobile ? (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onView={() => handleViewSession(session.id)}
                onRetry={() => handleRetryPayment(session)}
                onFlag={() => handleFlagIssue(session)}
                getStatusBadge={getStatusBadge}
                getStepLabel={getStepLabel}
                maskPhone={maskPhone}
              />
            ))}
            {filteredSessions.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No sessions found matching your filters
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Failure</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-xs">
                      {session.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(session.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {maskPhone(session.phone_number)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.is_guest ? 'Guest' : maskEmail(session.email)}
                      </div>
                    </TableCell>
                    <TableCell>{getStepLabel(session.current_step)}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.selected_payment_method?.toUpperCase() || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{session.final_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {session.last_payment_error ? (
                        <span className="text-xs text-destructive truncate max-w-[150px] block">
                          {session.last_payment_error}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewSession(session.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {session.status === 'failed' && session.payment_attempts < 5 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRetryPayment(session)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFlagIssue(session)}
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No sessions found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
}

// Session Card for Mobile
function SessionCard({
  session,
  onView,
  onRetry,
  onFlag,
  getStatusBadge,
  getStepLabel,
  maskPhone,
}: {
  session: CheckoutSession;
  onView: () => void;
  onRetry: () => void;
  onFlag: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getStepLabel: (step: string) => string;
  maskPhone: (phone: string | null) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {session.id.slice(0, 8)}...
            </p>
            <p className="font-medium">₹{session.final_amount.toLocaleString()}</p>
          </div>
          {getStatusBadge(session.status)}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">User:</span>
            <span className="ml-1">{maskPhone(session.phone_number)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Step:</span>
            <span className="ml-1">{getStepLabel(session.current_step)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Payment:</span>
            <span className="ml-1">{session.selected_payment_method?.toUpperCase() || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Time:</span>
            <span className="ml-1">{format(new Date(session.created_at), 'HH:mm')}</span>
          </div>
        </div>

        {session.last_payment_error && (
          <p className="text-xs text-destructive mb-3 truncate">
            Error: {session.last_payment_error}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={onView} className="flex-1">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {session.status === 'failed' && session.payment_attempts < 5 && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onFlag}>
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
