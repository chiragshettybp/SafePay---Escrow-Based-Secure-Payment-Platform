import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Download, Printer, Share2, Loader2, CheckCircle, Copy } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  order_id: string | null;
  razorpay_payment_id: string | null;
}

interface OrderData {
  id: string;
  product_name: string;
  merchant_id: string;
}

interface MerchantData {
  id: string;
  business_name: string;
  email: string;
  phone: string | null;
  address: string | null;
}

interface CustomerData {
  name: string;
  phone: string;
  email: string;
}

export default function PublicPaymentReceipt() {
  const { paymentId } = useParams();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mask sensitive data
  const maskPhone = (phone: string): string => {
    if (!phone || phone.length < 4) return '****';
    return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
  };

  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return '****@****.***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : '***';
    return `${maskedLocal}@${domain}`;
  };

  useEffect(() => {
    if (!paymentId) {
      setError("Invalid payment reference");
      setIsLoading(false);
      return;
    }

    const fetchReceipt = async () => {
      try {
        // Fetch payment
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", paymentId)
          .single();

        if (paymentError || !paymentData) {
          setError("Payment not found");
          setIsLoading(false);
          return;
        }

        // Validate payment status
        if (paymentData.status !== 'escrow' && paymentData.status !== 'released') {
          setError("Receipt not available for this payment");
          setIsLoading(false);
          return;
        }

        setPayment(paymentData as unknown as PaymentData);

        // Fetch order if linked
        if (paymentData.order_id) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("id, product_name, merchant_id, customer_id")
            .eq("id", paymentData.order_id)
            .single();

          if (orderData) {
            setOrder(orderData as OrderData);

            // Fetch merchant
            const { data: merchantData } = await supabase
              .from("merchants")
              .select("id, business_name, email, phone, address")
              .eq("user_id", orderData.merchant_id)
              .single();

            if (merchantData) {
              setMerchant(merchantData);
            }

            // Fetch customer profile for name (masked)
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("id", orderData.customer_id)
              .single();

            if (profileData) {
              setCustomer({
                name: (profileData as { full_name: string | null; phone: string | null }).full_name || 'Customer',
                phone: (profileData as { full_name: string | null; phone: string | null }).phone || '',
                email: '',
              });
            }
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching receipt:", err);
        setError("Failed to load receipt");
        setIsLoading(false);
      }
    };

    fetchReceipt();
  }, [paymentId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const receiptUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: `Payment receipt for ₹${payment?.amount}`,
          url: receiptUrl,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(receiptUrl);
      toast({
        title: "Link copied",
        description: "Receipt link copied to clipboard",
      });
    }
  };

  const handleCopyReceiptId = async () => {
    if (payment?.razorpay_payment_id || payment?.id) {
      await navigator.clipboard.writeText(payment.razorpay_payment_id || payment.id);
      toast({
        title: "Copied",
        description: "Receipt ID copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Actions Bar - Hide on print */}
        <div className="flex justify-end gap-2 mb-6 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Receipt Card */}
        <Card ref={receiptRef} className="print:shadow-none print:border-none">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Receipt className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Payment Receipt</CardTitle>
            </div>
            
            {merchant && (
              <div className="text-muted-foreground">
                <p className="font-semibold text-foreground">{merchant.business_name}</p>
                {merchant.address && <p className="text-sm">{merchant.address}</p>}
                {merchant.email && <p className="text-sm">{merchant.email}</p>}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* Payment Status */}
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">
                Payment Successful
              </span>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Transaction Details</h3>
              
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">₹{payment?.amount.toLocaleString('en-IN')}</span>
                </div>
                
                {payment?.payment_method && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium capitalize">{payment.payment_method}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-medium">
                    {payment && format(new Date(payment.created_at), "dd MMM yyyy, hh:mm a")}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b items-center">
                  <span className="text-muted-foreground">Receipt ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {(payment?.razorpay_payment_id || payment?.id || '').slice(0, 20)}...
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 print:hidden"
                      onClick={handleCopyReceiptId}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {order?.id && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Details */}
            {order && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Order Details</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{order.product_name}</p>
                </div>
              </div>
            )}

            {/* Customer Info (Masked) */}
            {customer && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Customer</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{maskPhone(customer.phone)}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{maskEmail(customer.email)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 border-t text-center text-xs text-muted-foreground">
              <p>This is a computer-generated receipt and does not require a signature.</p>
              <p className="mt-2">
                Generated on {format(new Date(), "dd MMM yyyy, hh:mm a")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Download Button - Mobile friendly */}
        <div className="mt-6 print:hidden">
          <Button className="w-full h-12" onClick={handlePrint}>
            <Download className="h-5 w-5 mr-2" />
            Download Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}