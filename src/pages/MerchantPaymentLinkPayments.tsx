import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Copy, ExternalLink, Receipt, Eye, RefreshCw, 
  Loader2, Filter, Calendar, CreditCard, Search, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PaymentLink {
  id: string;
  title: string;
  amount: number;
  status: string;
  link_code: string;
  total_payments: number;
  total_collected: number;
  created_at: string;
  expires_at: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  razorpay_payment_id: string | null;
  order_id: string | null;
  customer_phone?: string;
  customer_email?: string;
}

interface CheckoutSession {
  id: string;
  final_amount: number;
  status: string;
  phone_number: string | null;
  email: string | null;
  selected_payment_method: string | null;
  completed_at: string | null;
  created_at: string;
  payment_id: string | null;
}

export default function MerchantPaymentLinkPayments() {
  const { linkId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant, isLoading: authLoading } = useMerchantAuth();

  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Mask phone number
  const maskPhone = (phone: string | null): string => {
    if (!phone || phone.length < 4) return '****';
    return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
  };

  const fetchData = useCallback(async () => {
    if (!merchant?.id || !linkId) return;

    try {
      setIsLoading(true);

      // Fetch payment link using merchantSupabase
      const { data: linkData, error: linkError } = await merchantSupabase
        .from("payment_links")
        .select("*")
        .eq("id", linkId)
        .eq("merchant_id", merchant.id)
        .single();

      if (linkError || !linkData) {
        toast({
          title: "Error",
          description: "Payment link not found",
          variant: "destructive",
        });
        navigate("/merchant/checkout/payment-links");
        return;
      }

      setPaymentLink(linkData as PaymentLink);

      // Fetch checkout sessions for this payment link using merchantSupabase
      let query = merchantSupabase
        .from("checkout_sessions")
        .select("*")
        .eq("payment_link_id", linkId)
        .order("created_at", { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq("status", statusFilter as "abandoned" | "active" | "completed" | "expired" | "failed");
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
      } else {
        setSessions((sessionsData || []) as CheckoutSession[]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setIsLoading(false);
    }
  }, [merchant?.id, linkId, statusFilter, navigate, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (searchQuery) params.set('q', searchQuery);
    setSearchParams(params);
  }, [statusFilter, searchQuery, setSearchParams]);

  // Realtime subscription
  useEffect(() => {
    if (!linkId) return;

    const channel = merchantSupabase
      .channel('payment-link-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `payment_link_id=eq.${linkId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [linkId, fetchData]);

  const handleCopyLink = async () => {
    if (!paymentLink || !merchant?.slug) return;
    const publicUrl = `${window.location.origin}/pay/${merchant.slug}/${paymentLink.link_code}`;
    await navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Copied",
      description: "Payment link copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      paid: 'default',
      active: 'secondary',
      pending: 'secondary',
      failed: 'destructive',
      expired: 'outline',
      abandoned: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.phone_number?.toLowerCase().includes(query) ||
      session.email?.toLowerCase().includes(query) ||
      session.id.toLowerCase().includes(query)
    );
  });

  const completedPayments = sessions.filter(s => s.status === 'completed' || s.status === 'paid');
  const totalCollected = completedPayments.reduce((sum, s) => sum + s.final_amount, 0);

  if (authLoading || isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/merchant/checkout/payment-links/${linkId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Payments</h1>
              <p className="text-sm text-muted-foreground">{paymentLink?.title}</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Payment Link Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Payment Link Summary</span>
              <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Link Amount</p>
                <p className="text-xl font-bold">₹{paymentLink?.amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-xl font-bold">{completedPayments.length}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-green-600">₹{totalCollected.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                {paymentLink && getStatusBadge(paymentLink.status)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone, email, or session ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table - Desktop */}
        <Card className="hidden md:block">
          <CardContent className="pt-6">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(session.created_at), "dd MMM, hh:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{maskPhone(session.phone_number)}</p>
                          {session.email && (
                            <p className="text-muted-foreground text-xs">{session.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{session.final_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{session.selected_payment_method || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {session.payment_id && (session.status === 'completed' || session.status === 'paid') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(`/pay/receipt/${session.payment_id}`, '_blank')}
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/merchant/checkout/session/${session.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payments Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments found</p>
              </CardContent>
            </Card>
          ) : (
            filteredSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium">₹{session.final_amount.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.created_at), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span>{maskPhone(session.phone_number)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="capitalize">{session.selected_payment_method || '-'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/merchant/checkout/session/${session.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {session.payment_id && (session.status === 'completed' || session.status === 'paid') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.open(`/pay/receipt/${session.payment_id}`, '_blank')}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MerchantLayout>
  );
}