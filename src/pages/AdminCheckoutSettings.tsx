import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Lock, 
  CreditCard,
  Shield,
  Clock,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  KeyRound,
  Ban
} from 'lucide-react';
import { useAdminCheckoutSettings } from '@/hooks/useAdminCheckoutSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AdminCheckoutSettings() {
  const navigate = useNavigate();
  const { 
    platformSettings, 
    loading, 
    fetchPlatformSettings, 
    updatePlatformSetting,
    getBooleanSetting,
    getNumberSetting,
    isSettingLocked 
  } = useAdminCheckoutSettings();

  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformSettings();
  }, [fetchPlatformSettings]);

  useEffect(() => {
    // Initialize local values from fetched settings
    const values: Record<string, string> = {};
    platformSettings.forEach(s => {
      values[s.setting_key] = s.setting_value;
    });
    setLocalValues(values);
  }, [platformSettings]);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setSaving(key);
    try {
      await updatePlatformSetting(key, (!currentValue).toString());
    } finally {
      setSaving(null);
    }
  };

  const handleNumberChange = async (key: string) => {
    const value = localValues[key];
    if (!value) return;
    
    setSaving(key);
    try {
      await updatePlatformSetting(key, value);
    } finally {
      setSaving(null);
    }
  };

  const quickLinks = [
    { title: 'OTP Settings', href: '/admin/checkout/settings/otp', icon: KeyRound },
    { title: 'COD Status', href: '/admin/checkout/settings/cod', icon: Ban },
  ];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <AdminPageHeader
          title="Checkout Settings"
          actions={
            <div className="flex gap-2">
              {quickLinks.map((link) => (
                <Button 
                  key={link.href}
                  variant="outline" 
                  onClick={() => navigate(link.href)}
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.title}
                </Button>
              ))}
            </div>
          }
        />

        {/* Checkout Mode - Read Only */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Checkout Mode
              </CardTitle>
              <Badge className="bg-primary text-primary-foreground">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Prepaid Only</p>
                <p className="text-sm text-muted-foreground">
                  UPI, Cards, Wallets, EMI, NetBanking
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              This platform supports prepaid payments only. COD is permanently disabled.
            </div>
          </CardContent>
        </Card>

        {/* Global Behavior Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Global Behavior Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Toggle Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Require Authentication Before Payment</p>
                        <p className="text-sm text-muted-foreground">
                          Users must authenticate before proceeding to payment
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localValues['require_auth_before_payment'] === 'true'}
                      onCheckedChange={() => handleToggle('require_auth_before_payment', getBooleanSetting('require_auth_before_payment'))}
                      disabled={saving === 'require_auth_before_payment' || isSettingLocked('require_auth_before_payment')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Allow Guest Checkout</p>
                        <p className="text-sm text-muted-foreground">
                          Allow users to checkout without creating an account
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localValues['allow_guest_checkout'] === 'true'}
                      onCheckedChange={() => handleToggle('allow_guest_checkout', getBooleanSetting('allow_guest_checkout'))}
                      disabled={saving === 'allow_guest_checkout' || isSettingLocked('allow_guest_checkout')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Auto-Expire Inactive Sessions</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically expire checkout sessions that are inactive
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localValues['auto_expire_inactive_sessions'] === 'true'}
                      onCheckedChange={() => handleToggle('auto_expire_inactive_sessions', getBooleanSetting('auto_expire_inactive_sessions'))}
                      disabled={saving === 'auto_expire_inactive_sessions' || isSettingLocked('auto_expire_inactive_sessions')}
                    />
                  </div>
                </div>

                {/* Numeric Settings */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Session Duration (minutes)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={localValues['max_session_duration_minutes'] || ''}
                        onChange={(e) => setLocalValues({ ...localValues, max_session_duration_minutes: e.target.value })}
                        min={5}
                        max={120}
                      />
                      <Button 
                        size="sm"
                        onClick={() => handleNumberChange('max_session_duration_minutes')}
                        disabled={saving === 'max_session_duration_minutes'}
                      >
                        {saving === 'max_session_duration_minutes' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Payment Retries</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={localValues['max_payment_retries'] || ''}
                        onChange={(e) => setLocalValues({ ...localValues, max_payment_retries: e.target.value })}
                        min={1}
                        max={10}
                      />
                      <Button 
                        size="sm"
                        onClick={() => handleNumberChange('max_payment_retries')}
                        disabled={saving === 'max_payment_retries'}
                      >
                        {saving === 'max_payment_retries' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rate Limits & Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rate Limits & Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array(2).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Sessions Per IP (hourly)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={localValues['max_sessions_per_ip_hourly'] || ''}
                      onChange={(e) => setLocalValues({ ...localValues, max_sessions_per_ip_hourly: e.target.value })}
                      min={10}
                      max={500}
                    />
                    <Button 
                      size="sm"
                      onClick={() => handleNumberChange('max_sessions_per_ip_hourly')}
                      disabled={saving === 'max_sessions_per_ip_hourly'}
                    >
                      {saving === 'max_sessions_per_ip_hourly' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cooldown After Failures (seconds)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={localValues['cooldown_after_failures_seconds'] || ''}
                      onChange={(e) => setLocalValues({ ...localValues, cooldown_after_failures_seconds: e.target.value })}
                      min={60}
                      max={3600}
                    />
                    <Button 
                      size="sm"
                      onClick={() => handleNumberChange('cooldown_after_failures_seconds')}
                      disabled={saving === 'cooldown_after_failures_seconds'}
                    >
                      {saving === 'cooldown_after_failures_seconds' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/checkout/settings/otp')}
              >
                <KeyRound className="h-5 w-5" />
                <span>OTP Settings</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/checkout/settings/cod')}
              >
                <Ban className="h-5 w-5" />
                <span>COD Status</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/checkout/risk')}
              >
                <Shield className="h-5 w-5" />
                <span>Risk Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}