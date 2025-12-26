import { useNavigate } from 'react-router-dom';
import { 
  Plug, 
  Key, 
  Webhook, 
  TestTube, 
  CheckCircle, 
  XCircle,
  CreditCard,
  Wallet,
  Smartphone,
  Building,
  Loader2,
  ChevronRight,
  Activity,
  BookOpen,
  Shield,
  Server,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { useMerchantIntegration } from '@/hooks/useMerchantIntegration';
import { IntegrationChecklist } from '@/components/merchant/integration/IntegrationChecklist';
import { format } from 'date-fns';

export default function MerchantCheckoutIntegration() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const { integrationStatus, isLoading } = useMerchantIntegration(merchant?.id);

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MerchantLayout>
    );
  }

  const gateways = [
    { name: 'UPI', icon: Smartphone, enabled: true },
    { name: 'Cards', icon: CreditCard, enabled: true },
    { name: 'Wallets', icon: Wallet, enabled: true },
    { name: 'EMI', icon: CreditCard, enabled: true },
    { name: 'NetBanking', icon: Building, enabled: true },
  ];

  return (
    <MerchantLayout>
      <Seo title="Checkout Integration" />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Checkout Integration</h1>
          <p className="text-muted-foreground">
            Connect your store to SafePay's prepaid checkout system
          </p>
        </div>

        {/* How API Keys Are Used - Prominent Section */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              How API Keys Are Used
            </CardTitle>
            <CardDescription>
              Understanding the checkout flow is essential for integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/20 bg-background">
              <Server className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>API keys are used by your server or ecommerce platform</strong> — NOT by customers.
                Customers never see keys and never enter them.
              </AlertDescription>
            </Alert>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { step: '1', text: 'Customer clicks "Checkout"', actor: 'Store' },
                { step: '2', text: 'Your server creates session', actor: 'Your Server' },
                { step: '3', text: 'Customer pays on hosted page', actor: 'SafePay' },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.actor}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              className="w-full sm:w-auto"
              onClick={() => navigate('/merchant/checkout/integration/how-it-works')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              View Complete Integration Guide
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Integration Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Integration Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {integrationStatus.isConnected ? (
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        {integrationStatus.isConnected ? 'Connected' : 'Not Connected'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {integrationStatus.isConnected 
                          ? 'Your checkout is ready to accept payments' 
                          : 'Generate API keys to connect your store'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={integrationStatus.liveMode ? 'default' : 'secondary'}>
                    {integrationStatus.liveMode ? 'Live' : 'Test'} Mode
                  </Badge>
                </div>

                {/* Health Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Integration Health</span>
                    <span className="font-medium">{integrationStatus.healthScore}%</span>
                  </div>
                  <Progress value={integrationStatus.healthScore} className="h-2" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{integrationStatus.testKeysCount + integrationStatus.liveKeysCount}</p>
                    <p className="text-xs text-muted-foreground">Active API Keys</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{integrationStatus.webhooksCount}</p>
                    <p className="text-xs text-muted-foreground">Webhook Endpoints</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{gateways.filter(g => g.enabled).length}</p>
                    <p className="text-xs text-muted-foreground">Payment Methods</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">
                      {integrationStatus.lastTransaction 
                        ? format(new Date(integrationStatus.lastTransaction), 'MMM d')
                        : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Last Transaction</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Payment Gateways */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Payment Methods
                </CardTitle>
                <CardDescription>
                  Prepaid-only payment methods available for your checkout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {gateways.map((gateway) => (
                    <div
                      key={gateway.name}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                        gateway.enabled 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : 'bg-muted opacity-50'
                      }`}
                    >
                      <gateway.icon className={`h-4 w-4 ${gateway.enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <span className={gateway.enabled ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                        {gateway.name}
                      </span>
                      {gateway.enabled && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  ✓ This checkout is prepaid-only. No COD option available.
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <ActionCard
                title="API Keys"
                description="Generate and manage authentication keys"
                icon={Key}
                onClick={() => navigate('/merchant/checkout/integration/api-keys')}
              />
              <ActionCard
                title="Webhooks"
                description="Configure event notifications"
                icon={Webhook}
                onClick={() => navigate('/merchant/checkout/integration/webhooks')}
              />
              <ActionCard
                title="Test Integration"
                description="Verify your setup with test payments"
                icon={TestTube}
                onClick={() => navigate('/merchant/checkout/integration/test')}
              />
              <ActionCard
                title="Integration Guide"
                description="Learn how to integrate checkout"
                icon={BookOpen}
                onClick={() => navigate('/merchant/checkout/integration/how-it-works')}
              />
            </div>
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

function ActionCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
