import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { ApiUsageGuide, WebhookGuide, TestLiveModeGuide } from '@/components/merchant/integration/ApiUsageGuide';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { IntegrationChecklist } from '@/components/merchant/integration/IntegrationChecklist';

export default function MerchantCheckoutIntegrationGuide() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();

  return (
    <MerchantLayout>
      <Seo title="Integration Guide - How It Works" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/checkout/integration')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              How Integration Works
            </h1>
            <p className="text-muted-foreground">
              Complete guide to integrating SafePay checkout
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <ApiUsageGuide />
            <WebhookGuide />
            <TestLiveModeGuide />

            {/* Additional Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/merchant/checkout/integration/api-keys')}
                >
                  Generate API Keys
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/merchant/checkout/integration/webhooks')}
                >
                  Configure Webhooks
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/merchant/checkout/integration/test')}
                >
                  Test Integration
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <IntegrationChecklist 
              merchantId={merchant?.id} 
              onNavigate={navigate}
            />
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
