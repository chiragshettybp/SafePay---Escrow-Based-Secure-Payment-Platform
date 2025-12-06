import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { XCircle, RefreshCw, CreditCard, Clock, AlertTriangle, MessageCircle, Edit } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRefund, useRefunds } from '@/hooks/useRefunds';
import { toast } from 'sonner';

const RefundFailed = () => {
  const { refundId } = useParams<{ refundId: string }>();
  const navigate = useNavigate();
  const { refund, events, isLoading, isLoadingEvents } = useRefund(refundId);
  const { retryRefund } = useRefunds();

  const handleRetry = async () => {
    if (!refundId || !refund?.retry_allowed) return;

    try {
      await retryRefund.mutateAsync(refundId);
      navigate(`/refund/${refundId}`, { replace: true });
    } catch (error) {
      console.error('Retry error:', error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
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
        {/* Error Banner */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-destructive mb-2">Refund Could Not Be Completed</h1>
              <p className="text-muted-foreground">
                We encountered an issue processing your refund
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Details */}
        {refund.failure_reason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failure Reason</AlertTitle>
            <AlertDescription>{refund.failure_reason}</AlertDescription>
          </Alert>
        )}

        {/* Refund Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Refund Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Refund Amount</p>
                <p className="text-2xl font-bold">₹{refund.amount.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Retry Allowed</p>
                <p className="font-medium">{refund.retry_allowed ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <Separator />

            {/* Payment Method Info */}
            {refund.payment_method && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Original Payment Method</p>
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

        {/* Available Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Available Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {refund.retry_allowed && (
              <Button 
                className="w-full justify-start" 
                onClick={handleRetry}
                disabled={retryRefund.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${retryRefund.isPending ? 'animate-spin' : ''}`} />
                {retryRefund.isPending ? 'Retrying...' : 'Retry Refund'}
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/settings/payment-methods">
                <Edit className="h-4 w-4 mr-2" />
                Update Payout Details
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/support">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
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
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-destructive/30" />
                <div className="space-y-6">
                  {events.map((event) => (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-destructive flex items-center justify-center">
                        {event.event_type === 'failed' ? (
                          <XCircle className="h-3 w-3 text-destructive" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
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
              <p className="text-muted-foreground text-center py-4">No events</p>
            )}
          </CardContent>
        </Card>

        {/* Bottom Actions */}
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

export default RefundFailed;
