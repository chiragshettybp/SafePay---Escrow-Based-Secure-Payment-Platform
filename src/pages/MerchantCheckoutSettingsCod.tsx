import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  BanknoteIcon,
  AlertTriangle,
  XCircle,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';

export default function MerchantCheckoutSettingsCod() {
  const navigate = useNavigate();

  return (
    <MerchantLayout>
      <Seo 
        title="COD Settings - Checkout - SafePay" 
        description="Cash on Delivery settings"
      />
      
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/merchant/checkout/settings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-muted">
              <BanknoteIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Cash on Delivery
              </h1>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                <XCircle className="h-3 w-3 mr-1" />
                Not Available
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            COD configuration and eligibility rules
          </p>
        </div>

        {/* Not Supported Notice */}
        <Alert className="border-amber-500/50 bg-amber-500/10 mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-700">COD Not Supported</AlertTitle>
          <AlertDescription className="text-amber-600">
            This checkout system operates on a <strong>prepaid-only</strong> model. 
            Cash on Delivery is not available to ensure secure, escrow-protected transactions.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Why Prepaid Only?</CardTitle>
            <CardDescription>
              Understanding the benefits of prepaid checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-medium">Escrow Protection</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  All payments are held in escrow until delivery is confirmed, protecting both buyers and sellers.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Reduced Fraud</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Prepaid orders have significantly lower fraud rates compared to COD orders.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <BanknoteIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium">Better Cash Flow</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive funds faster without waiting for delivery confirmation and collection.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">No RTO Losses</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Eliminate Return to Origin costs from COD refusals at delivery.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Need COD support for your business? Contact our team to discuss options.
              </p>
              <Button variant="outline" onClick={() => navigate('/merchant/support')}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
