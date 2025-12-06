import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Clock, CreditCard, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRefund } from '@/hooks/useRefunds';

const RefundInitiated = () => {
  const { refundId } = useParams<{ refundId: string }>();
  const navigate = useNavigate();
  const { refund, events, isLoading, isLoadingEvents } = useRefund(refundId);

  // Auto-redirect when status changes
  useEffect(() => {
    if (refund?.status === 'success') {
      navigate(`/refund/${refundId}/success`, { replace: true });
    } else if (refund?.status === 'failed') {
      navigate(`/refund/${refundId}/failed`, { replace: true });
    }
  }, [refund?.status, refundId, navigate]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'initiated':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'initiated':
        return <Badge variant="secondary">Initiated</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Processing</Badge>;
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!refund) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Refund not found</p>
          <Button variant="link" asChild>
            <Link to="/orders">Go to Orders</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Refund In Progress</h1>
            <p className="text-muted-foreground">Your refund is being processed</p>
          </div>
        </div>

        {/* Refund Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Refund Summary
              </CardTitle>
              {getStatusBadge(refund.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Refund Amount</p>
                <p className="text-2xl font-bold text-primary">₹{refund.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{refund.order_id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-medium">{refund.orders?.merchant_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-medium capitalize">{refund.reason.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Initiated On</p>
                <p className="font-medium">{format(new Date(refund.created_at), 'PPp')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Processing</p>
                <p className="font-medium">3-5 business days</p>
              </div>
            </div>

            <Separator />

            {/* Payment Method Info */}
            {refund.payment_method && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Refund Method</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium capitalize">{refund.payment_method}</span>
                  {refund.payment_method_last4 && (
                    <span className="text-muted-foreground">•••• {refund.payment_method_last4}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Refund Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : events && events.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {events.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{event.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), 'PPp')}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No events yet</p>
            )}

            {/* Processing indicator */}
            {(refund.status === 'initiated' || refund.status === 'processing') && (
              <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Waiting for updates...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link to={`/order/${refund.order_id}`}>View Order Details</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/orders">Go to Orders</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RefundInitiated;
