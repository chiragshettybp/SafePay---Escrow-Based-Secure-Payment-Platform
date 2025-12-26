import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Sparkles,
  BadgePercent,
  Clock,
  MessageSquare,
  Loader2,
  Save,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutConfig } from '@/hooks/useMerchantCheckoutConfig';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

export default function MerchantCheckoutSettingsPrepaidNudges() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const { config, isLoading, isSaving, updateField, updateConfig } = useMerchantCheckoutConfig(merchant?.id);

  // Local state for inputs
  const [discountValue, setDiscountValue] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [minOrderValue, setMinOrderValue] = useState<string>('');

  // Initialize local state when config loads
  useEffect(() => {
    if (config) {
      setDiscountValue(config.prepaid_discount_value.toString());
      setMessage(config.prepaid_message);
      setMinOrderValue(config.prepaid_min_order_value.toString());
    }
  }, [config]);

  const handleSaveConfig = () => {
    updateConfig({
      prepaid_discount_value: parseFloat(discountValue) || 5,
      prepaid_message: message || 'Pay online and save!',
      prepaid_min_order_value: parseFloat(minOrderValue) || 0,
    });
  };

  // Preview message with discount
  const getPreviewMessage = () => {
    if (!config?.prepaid_discount_enabled) return message;
    const discountText = config.prepaid_discount_type === 'percentage' 
      ? `${discountValue}%` 
      : `₹${discountValue}`;
    return message.replace('{discount}', discountText);
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
        title="Prepaid Nudges - Checkout - SafePay" 
        description="Configure prepaid conversion nudges and incentives"
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
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Prepaid Nudges
            </h1>
          </div>
          <p className="text-muted-foreground">
            Incentivize prepaid payments with discounts and messaging
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
          {/* Master Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Enable Prepaid Nudges</CardTitle>
              <CardDescription>
                Show incentive messages to encourage prepaid payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable-nudges" className="font-medium">Prepaid Nudges</Label>
                  <p className="text-sm text-muted-foreground">
                    Display messages during checkout to encourage online payment
                  </p>
                </div>
                <Switch
                  id="enable-nudges"
                  checked={config?.prepaid_nudges_enabled ?? false}
                  onCheckedChange={(checked) => updateField('prepaid_nudges_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Discount Settings */}
          <Card className={!config?.prepaid_nudges_enabled ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5" />
                Discount Incentive
              </CardTitle>
              <CardDescription>
                Offer discounts for prepaid payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable-discount" className="font-medium">Enable Discount</Label>
                  <p className="text-sm text-muted-foreground">
                    Offer a discount for paying online
                  </p>
                </div>
                <Switch
                  id="enable-discount"
                  checked={config?.prepaid_discount_enabled ?? false}
                  onCheckedChange={(checked) => updateField('prepaid_discount_enabled', checked)}
                  disabled={!config?.prepaid_nudges_enabled}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Discount Type</Label>
                  <Select
                    value={config?.prepaid_discount_type ?? 'percentage'}
                    onValueChange={(value) => updateField('prepaid_discount_type', value as 'percentage' | 'fixed')}
                    disabled={!config?.prepaid_nudges_enabled || !config?.prepaid_discount_enabled}
                  >
                    <SelectTrigger id="discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount-value">
                    {config?.prepaid_discount_type === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}
                  </Label>
                  <Input
                    id="discount-value"
                    type="number"
                    min="0"
                    max={config?.prepaid_discount_type === 'percentage' ? 50 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    disabled={!config?.prepaid_nudges_enabled || !config?.prepaid_discount_enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messaging Settings */}
          <Card className={!config?.prepaid_nudges_enabled ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messaging
              </CardTitle>
              <CardDescription>
                Customize the nudge message shown at checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable-urgency" className="font-medium">Urgency Messaging</Label>
                  <p className="text-sm text-muted-foreground">
                    Add urgency elements to the message
                  </p>
                </div>
                <Switch
                  id="enable-urgency"
                  checked={config?.prepaid_urgency_enabled ?? false}
                  onCheckedChange={(checked) => updateField('prepaid_urgency_enabled', checked)}
                  disabled={!config?.prepaid_nudges_enabled}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="message">Nudge Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Pay online and save!"
                  rows={3}
                  disabled={!config?.prepaid_nudges_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{discount}'} to insert the discount value dynamically
                </p>
              </div>

              {/* Preview */}
              {config?.prepaid_nudges_enabled && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Preview</span>
                  </div>
                  <p className="text-sm text-green-700">{getPreviewMessage()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className={!config?.prepaid_nudges_enabled ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Conditions
              </CardTitle>
              <CardDescription>
                Set when nudges are shown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="min-order">Minimum Order Value (₹)</Label>
                <Input
                  id="min-order"
                  type="number"
                  min="0"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  disabled={!config?.prepaid_nudges_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Only show nudges for orders above this value (0 = always show)
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="first-time" className="font-medium">First-Time Users Only</Label>
                  <p className="text-sm text-muted-foreground">
                    Only show nudges to new customers
                  </p>
                </div>
                <Switch
                  id="first-time"
                  checked={config?.prepaid_first_time_only ?? false}
                  onCheckedChange={(checked) => updateField('prepaid_first_time_only', checked)}
                  disabled={!config?.prepaid_nudges_enabled}
                />
              </div>

              <Button 
                onClick={handleSaveConfig}
                disabled={isSaving || !config?.prepaid_nudges_enabled}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}
