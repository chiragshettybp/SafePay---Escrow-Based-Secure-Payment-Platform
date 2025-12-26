import { useNavigate } from 'react-router-dom';
import { 
  KeyRound, 
  CreditCard, 
  BanknoteIcon, 
  Sparkles,
  ChevronRight,
  Settings,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutConfig } from '@/hooks/useMerchantCheckoutConfig';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  status: 'enabled' | 'disabled' | 'partial';
  statusLabel: string;
}

function SettingsCard({ title, description, icon: Icon, href, status, statusLabel }: SettingsCardProps) {
  const navigate = useNavigate();
  
  const statusColors = {
    enabled: 'bg-green-500/10 text-green-600 border-green-500/20',
    disabled: 'bg-muted text-muted-foreground border-border',
    partial: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all group"
      onClick={() => navigate(href)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="outline" className={statusColors[status]}>
            {status === 'enabled' && <Check className="h-3 w-3 mr-1" />}
            {status === 'disabled' && <X className="h-3 w-3 mr-1" />}
            {statusLabel}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
          <span>Configure</span>
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantCheckoutSettings() {
  const { merchant } = useMerchantAuth();
  const { config, isLoading } = useMerchantCheckoutConfig(merchant?.id);

  // Compute statuses
  const loginStatus = config 
    ? (config.login_otp_enabled || config.login_guest_checkout_enabled ? 'enabled' : 'disabled')
    : 'disabled';
  
  const paymentStatus = config 
    ? (config.payment_upi_enabled || config.payment_cards_enabled ? 'enabled' : 'disabled')
    : 'disabled';

  const nudgesStatus = config
    ? (config.prepaid_nudges_enabled ? 'enabled' : 'disabled')
    : 'disabled';

  const loginLabel = config
    ? (config.login_otp_enabled && config.login_guest_checkout_enabled 
        ? 'OTP + Guest' 
        : config.login_otp_enabled 
          ? 'OTP Only' 
          : config.login_guest_checkout_enabled 
            ? 'Guest Only' 
            : 'Disabled')
    : 'Loading...';

  const enabledPayments = config
    ? [
        config.payment_upi_enabled && 'UPI',
        config.payment_cards_enabled && 'Cards',
        config.payment_wallets_enabled && 'Wallets',
      ].filter(Boolean).length
    : 0;

  const paymentLabel = config
    ? `${enabledPayments} methods active`
    : 'Loading...';

  const nudgesLabel = config
    ? (config.prepaid_nudges_enabled 
        ? (config.prepaid_discount_enabled ? 'Discount Active' : 'Enabled')
        : 'Disabled')
    : 'Loading...';

  return (
    <MerchantLayout>
      <Seo 
        title="Checkout Settings - SafePay Merchant" 
        description="Configure your checkout experience"
      />
      
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Checkout Settings
            </h1>
          </div>
          <p className="text-muted-foreground">
            Configure how customers experience your checkout flow
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsCard
              title="Login & Identification"
              description="Control OTP, guest checkout, and user authentication settings"
              icon={KeyRound}
              href="/merchant/checkout/settings/login"
              status={loginStatus}
              statusLabel={loginLabel}
            />
            
            <SettingsCard
              title="Payment Method Order"
              description="Arrange payment methods and configure routing rules"
              icon={CreditCard}
              href="/merchant/checkout/settings/payment-order"
              status={paymentStatus}
              statusLabel={paymentLabel}
            />
            
            <SettingsCard
              title="Cash on Delivery"
              description="COD eligibility, verification, and fee configuration"
              icon={BanknoteIcon}
              href="/merchant/checkout/settings/cod"
              status="disabled"
              statusLabel="Not Supported"
            />
            
            <SettingsCard
              title="Prepaid Nudges"
              description="Incentivize prepaid payments with discounts and messaging"
              icon={Sparkles}
              href="/merchant/checkout/settings/prepaid-nudges"
              status={nudgesStatus}
              statusLabel={nudgesLabel}
            />
          </div>
        )}

        {/* Info Banner */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> All settings are applied instantly to new checkout sessions. 
              Changes sync in real-time across all devices.
            </p>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
