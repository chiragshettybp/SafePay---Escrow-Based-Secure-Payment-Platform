import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  CreditCard,
  Smartphone,
  Wallet,
  Building2,
  Calendar,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  Settings2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutConfig } from '@/hooks/useMerchantCheckoutConfig';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

const paymentMethodConfig: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  upi: { label: 'UPI', icon: Smartphone, description: 'Google Pay, PhonePe, Paytm UPI' },
  cards: { label: 'Cards', icon: CreditCard, description: 'Debit & Credit Cards' },
  wallets: { label: 'Wallets', icon: Wallet, description: 'Paytm, PhonePe, Amazon Pay' },
  emi: { label: 'EMI', icon: Calendar, description: 'Card & Bajaj EMI options' },
  netbanking: { label: 'NetBanking', icon: Building2, description: 'All major banks' },
};

export default function MerchantCheckoutSettingsPaymentOrder() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const { config, isLoading, isSaving, updatePaymentOrder, togglePaymentMethod, updateField } = useMerchantCheckoutConfig(merchant?.id);

  const [localOrder, setLocalOrder] = useState<string[]>([]);

  useEffect(() => {
    if (config?.payment_methods_order) {
      setLocalOrder(config.payment_methods_order);
    }
  }, [config?.payment_methods_order]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalOrder(newOrder);
    updatePaymentOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === localOrder.length - 1) return;
    const newOrder = [...localOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalOrder(newOrder);
    updatePaymentOrder(newOrder);
  };

  const getMethodEnabled = (method: string): boolean => {
    if (!config) return true;
    switch (method) {
      case 'upi': return config.payment_upi_enabled;
      case 'cards': return config.payment_cards_enabled;
      case 'wallets': return config.payment_wallets_enabled;
      case 'emi': return config.payment_emi_enabled;
      case 'netbanking': return config.payment_netbanking_enabled;
      default: return true;
    }
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo 
        title="Payment Order Settings - Checkout - SafePay" 
        description="Configure payment method ordering and routing"
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
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Payment Method Order
            </h1>
          </div>
          <p className="text-muted-foreground">
            Arrange payment methods and configure routing rules
          </p>
        </div>

        {/* Saving Indicator */}
        {isSaving && (
          <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg z-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}

        <div className="space-y-6">
          {/* Payment Methods Order */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Drag to reorder or use arrows. Methods appear in this order at checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {localOrder.map((method, index) => {
                const methodInfo = paymentMethodConfig[method];
                if (!methodInfo) return null;
                
                const Icon = methodInfo.icon;
                const isEnabled = getMethodEnabled(method);

                return (
                  <div
                    key={method}
                    className={`flex items-center gap-3 p-4 rounded-lg border ${
                      isEnabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5 hidden md:block" />
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{methodInfo.label}</p>
                      <p className="text-sm text-muted-foreground truncate">{methodInfo.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col md:flex-row gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveDown(index)}
                          disabled={index === localOrder.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => togglePaymentMethod(method, checked)}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Advanced Routing Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Advanced Routing Rules
              </CardTitle>
              <CardDescription>
                Automatically reorder methods based on conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reorder-success" className="font-medium">Reorder by Success Rate</Label>
                  <p className="text-sm text-muted-foreground">
                    Prioritize methods with higher success rates
                  </p>
                </div>
                <Switch
                  id="reorder-success"
                  checked={config?.payment_reorder_by_success_rate ?? false}
                  onCheckedChange={(checked) => updateField('payment_reorder_by_success_rate', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reorder-device" className="font-medium">Reorder by Device</Label>
                  <p className="text-sm text-muted-foreground">
                    Show different order on mobile vs desktop
                  </p>
                </div>
                <Switch
                  id="reorder-device"
                  checked={config?.payment_reorder_by_device ?? false}
                  onCheckedChange={(checked) => updateField('payment_reorder_by_device', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reorder-value" className="font-medium">Reorder by Order Value</Label>
                  <p className="text-sm text-muted-foreground">
                    Adjust order based on cart value (e.g., show EMI for high value)
                  </p>
                </div>
                <Switch
                  id="reorder-value"
                  checked={config?.payment_reorder_by_value ?? false}
                  onCheckedChange={(checked) => updateField('payment_reorder_by_value', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}
