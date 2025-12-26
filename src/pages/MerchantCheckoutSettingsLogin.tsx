import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  KeyRound,
  Smartphone,
  UserCircle,
  ShieldCheck,
  Loader2,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutConfig } from '@/hooks/useMerchantCheckoutConfig';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

export default function MerchantCheckoutSettingsLogin() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const { config, isLoading, isSaving, updateField, updateConfig } = useMerchantCheckoutConfig(merchant?.id);

  // Local state for number inputs
  const [otpRetryLimit, setOtpRetryLimit] = useState<string>('');
  const [otpCooldown, setOtpCooldown] = useState<string>('');
  const [guestMaxValue, setGuestMaxValue] = useState<string>('');

  // Initialize local state when config loads
  if (config && !otpRetryLimit) {
    setOtpRetryLimit(config.login_otp_retry_limit.toString());
    setOtpCooldown(config.login_otp_cooldown_seconds.toString());
    setGuestMaxValue(config.login_guest_max_order_value.toString());
  }

  const handleSaveRules = () => {
    updateConfig({
      login_otp_retry_limit: parseInt(otpRetryLimit) || 3,
      login_otp_cooldown_seconds: parseInt(otpCooldown) || 60,
      login_guest_max_order_value: parseFloat(guestMaxValue) || 5000,
    });
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
        title="Login Settings - Checkout - SafePay" 
        description="Configure login and user identification settings"
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
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Login & Identification
            </h1>
          </div>
          <p className="text-muted-foreground">
            Control how customers authenticate during checkout
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
          {/* Authentication Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Authentication Methods
              </CardTitle>
              <CardDescription>
                Choose how customers can identify themselves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="otp-login" className="font-medium">Phone OTP Login</Label>
                  <p className="text-sm text-muted-foreground">
                    Customers verify via SMS OTP
                  </p>
                </div>
                <Switch
                  id="otp-login"
                  checked={config?.login_otp_enabled ?? true}
                  onCheckedChange={(checked) => updateField('login_otp_enabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="guest-checkout" className="font-medium">Guest Checkout</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow checkout without account creation
                  </p>
                </div>
                <Switch
                  id="guest-checkout"
                  checked={config?.login_guest_checkout_enabled ?? false}
                  onCheckedChange={(checked) => updateField('login_guest_checkout_enabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-login" className="font-medium">Returning User Auto-Login</Label>
                  <p className="text-sm text-muted-foreground">
                    Recognize returning customers automatically
                  </p>
                </div>
                <Switch
                  id="auto-login"
                  checked={config?.login_returning_user_autologin ?? true}
                  onCheckedChange={(checked) => updateField('login_returning_user_autologin', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Control authentication requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="require-login" className="font-medium">Require Login Before Payment</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must be authenticated before payment step
                  </p>
                </div>
                <Switch
                  id="require-login"
                  checked={config?.login_require_before_payment ?? true}
                  onCheckedChange={(checked) => updateField('login_require_before_payment', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="autolink-phone" className="font-medium">Auto-Link by Phone</Label>
                  <p className="text-sm text-muted-foreground">
                    Link returning users by their phone number
                  </p>
                </div>
                <Switch
                  id="autolink-phone"
                  checked={config?.login_autolink_by_phone ?? true}
                  onCheckedChange={(checked) => updateField('login_autolink_by_phone', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuration Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Configuration Rules
              </CardTitle>
              <CardDescription>
                Set limits and thresholds for authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="otp-retry">OTP Retry Limit</Label>
                  <Input
                    id="otp-retry"
                    type="number"
                    min="1"
                    max="10"
                    value={otpRetryLimit}
                    onChange={(e) => setOtpRetryLimit(e.target.value)}
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum OTP attempts before lockout
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp-cooldown">OTP Cooldown (seconds)</Label>
                  <Input
                    id="otp-cooldown"
                    type="number"
                    min="30"
                    max="300"
                    value={otpCooldown}
                    onChange={(e) => setOtpCooldown(e.target.value)}
                    placeholder="60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time between OTP requests
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-max">Guest Checkout Max Order Value (₹)</Label>
                <Input
                  id="guest-max"
                  type="number"
                  min="0"
                  value={guestMaxValue}
                  onChange={(e) => setGuestMaxValue(e.target.value)}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum order value allowed for guest checkout
                </p>
              </div>

              <Button 
                onClick={handleSaveRules}
                disabled={isSaving}
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
