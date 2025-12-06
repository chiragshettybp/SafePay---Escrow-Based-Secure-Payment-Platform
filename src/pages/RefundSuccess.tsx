import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, Download, ArrowRight, CreditCard, Clock, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRefund } from '@/hooks/useRefunds';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

const RefundSuccess = () => {
  const { refundId } = useParams<{ refundId: string }>();
  const { refund, events, isLoading, isLoadingEvents } = useRefund(refundId);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    if (!refund?.receipt_url) {
      toast.error('Receipt not available yet');
      return;
    }

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('refund-receipts')
        .download(refund.receipt_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `refund_receipt_${refundId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    } finally {
      setIsDownloading(false);
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
        {/* Success Banner */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Refund Successful!</h1>
              <p className="text-muted-foreground">
                Your refund has been processed and credited to your account
              </p>
            </div>
          </CardContent>
        </Card>

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
              <div className="bg-primary/5 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Refund Amount</p>
                <p className="text-3xl font-bold text-primary">₹{refund.amount.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Credited To</p>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium capitalize">{refund.payment_method || 'Original Payment Method'}</span>
                  {refund.payment_method_last4 && (
                    <span className="text-muted-foreground">•••• {refund.payment_method_last4}</span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {refund.transaction_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{refund.transaction_id}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{refund.order_id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-medium">{refund.orders?.merchant_name || 'N/A'}</p>
              </div>
              {refund.credited_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Credited On</p>
                  <p className="font-medium">{format(new Date(refund.credited_at), 'PPp')}</p>
                </div>
              )}
            </div>

            {/* Download Receipt */}
            {refund.receipt_url && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Refund Receipt</p>
                      <p className="text-sm text-muted-foreground">Download your official receipt</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReceipt}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>Downloading...</>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </>
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
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-green-500/30" />
                <div className="space-y-6">
                  {events.map((event) => (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-green-500 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-green-500" />
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link to={`/order/${refund.order_id}`}>View Order Details</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/orders">
              Go to Orders
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RefundSuccess;
