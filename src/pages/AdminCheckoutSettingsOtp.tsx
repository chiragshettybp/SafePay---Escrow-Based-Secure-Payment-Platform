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
  KeyRound, 
  Shield, 
  Clock,
  Phone,
  MessageSquare,
  Mic,
  Ban,
  AlertTriangle,
  Save,
  RefreshCw,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { useAdminCheckoutSettings, OtpSettings } from '@/hooks/useAdminCheckoutSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AdminCheckoutSettingsOtp() {
  const navigate = useNavigate();
  const { 
    otpSettings, 
    loading, 
    fetchOtpSettings, 
    updateOtpSettings 
  } = useAdminCheckoutSettings();

  const [localSettings, setLocalSettings] = useState<Partial<OtpSettings>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchOtpSettings();
  }, [fetchOtpSettings]);

  useEffect(() => {
    if (otpSettings) {
      setLocalSettings(otpSettings);
    }
  }, [otpSettings]);

  useEffect(() => {
    if (otpSettings && localSettings) {
      const changed = Object.keys(localSettings).some(
        key => localSettings[key as keyof OtpSettings] !== otpSettings[key as keyof OtpSettings]
      );
      setHasChanges(changed);
    }
  }, [localSettings, otpSettings]);

  const handleToggle = (key: keyof OtpSettings) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNumberChange = (key: keyof OtpSettings, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOtpSettings(localSettings, 'OTP settings updated via admin panel');
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const deliveryChannels = [
    { key: 'sms_enabled', icon: Phone, label: 'SMS', description: 'Send OTP via SMS' },
    { key: 'whatsapp_enabled', icon: MessageSquare, label: 'WhatsApp', description: 'Send OTP via WhatsApp' },
    { key: 'voice_enabled', icon: Mic, label: 'Voice Call', description: 'Deliver OTP via voice call' },
  ];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <AdminPageHeader
          title="OTP Settings"
          actions={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/checkout/settings')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          }
        />

        {hasChanges && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">You have unsaved changes</span>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* OTP Enablement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  OTP Enablement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Enable OTP Login for Checkout</p>
                      <p className="text-sm text-muted-foreground">
                        Require OTP verification during checkout login
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.otp_enabled ?? false}
                    onCheckedChange={() => handleToggle('otp_enabled')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Require OTP Before Payment</p>
                      <p className="text-sm text-muted-foreground">
                        Additional OTP verification step before payment
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.require_otp_before_payment ?? false}
                    onCheckedChange={() => handleToggle('require_otp_before_payment')}
                  />
                </div>

                {!localSettings.otp_enabled && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        OTP is disabled. Ensure guest checkout is enabled to allow users to proceed.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OTP Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  OTP Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>OTP Length</Label>
                    <Input
                      type="number"
                      value={localSettings.otp_length ?? 6}
                      onChange={(e) => handleNumberChange('otp_length', parseInt(e.target.value))}
                      min={4}
                      max={8}
                    />
                    <p className="text-xs text-muted-foreground">4-8 digits</p>
                  </div>

                  <div className="space-y-2">
                    <Label>OTP Expiry (seconds)</Label>
                    <Input
                      type="number"
                      value={localSettings.otp_expiry_seconds ?? 300}
                      onChange={(e) => handleNumberChange('otp_expiry_seconds', parseInt(e.target.value))}
                      min={60}
                      max={900}
                    />
                    <p className="text-xs text-muted-foreground">60-900 seconds</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Retries Per OTP</Label>
                    <Input
                      type="number"
                      value={localSettings.max_retries_per_otp ?? 3}
                      onChange={(e) => handleNumberChange('max_retries_per_otp', parseInt(e.target.value))}
                      min={1}
                      max={10}
                    />
                    <p className="text-xs text-muted-foreground">1-10 attempts</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Cooldown Between Sends (seconds)</Label>
                    <Input
                      type="number"
                      value={localSettings.cooldown_between_sends_seconds ?? 60}
                      onChange={(e) => handleNumberChange('cooldown_between_sends_seconds', parseInt(e.target.value))}
                      min={30}
                      max={300}
                    />
                    <p className="text-xs text-muted-foreground">30-300 seconds</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Lockout Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={localSettings.lockout_duration_minutes ?? 30}
                      onChange={(e) => handleNumberChange('lockout_duration_minutes', parseInt(e.target.value))}
                      min={5}
                      max={120}
                    />
                    <p className="text-xs text-muted-foreground">5-120 minutes</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max OTP Requests/Phone (hourly)</Label>
                    <Input
                      type="number"
                      value={localSettings.max_otp_requests_per_phone_hourly ?? 10}
                      onChange={(e) => handleNumberChange('max_otp_requests_per_phone_hourly', parseInt(e.target.value))}
                      min={3}
                      max={30}
                    />
                    <p className="text-xs text-muted-foreground">3-30 per hour</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Delivery Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveryChannels.map((channel) => (
                  <div key={channel.key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <channel.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{channel.label}</p>
                        <p className="text-sm text-muted-foreground">{channel.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={localSettings[channel.key as keyof OtpSettings] as boolean ?? false}
                      onCheckedChange={() => handleToggle(channel.key as keyof OtpSettings)}
                    />
                  </div>
                ))}

                {!localSettings.sms_enabled && !localSettings.whatsapp_enabled && !localSettings.voice_enabled && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        At least one delivery channel must be enabled for OTP to work.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security & Abuse Prevention */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security & Abuse Prevention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Ban className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Block Phone After Failures</p>
                      <p className="text-sm text-muted-foreground">
                        Temporarily block phone numbers after repeated OTP failures
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.block_phone_after_failures ?? false}
                    onCheckedChange={() => handleToggle('block_phone_after_failures')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Block IP After Abuse</p>
                      <p className="text-sm text-muted-foreground">
                        Block IP addresses showing suspicious OTP patterns
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.block_ip_after_abuse ?? false}
                    onCheckedChange={() => handleToggle('block_ip_after_abuse')}
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 inline mr-2 text-green-500" />
                  All security enforcement happens server-side via Edge Functions.
                </div>
              </CardContent>
            </Card>

            {/* Sticky Save Button for Mobile */}
            {hasChanges && (
              <div className="fixed bottom-4 left-4 right-4 sm:hidden z-50">
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}