import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string | null;
  is_locked: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface OtpSettings {
  id: string;
  otp_enabled: boolean;
  require_otp_before_payment: boolean;
  otp_length: number;
  otp_expiry_seconds: number;
  max_retries_per_otp: number;
  cooldown_between_sends_seconds: number;
  lockout_duration_minutes: number;
  max_otp_requests_per_phone_hourly: number;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  voice_enabled: boolean;
  block_phone_after_failures: boolean;
  block_ip_after_abuse: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface SettingsAudit {
  id: string;
  setting_table: string;
  setting_key: string | null;
  previous_value: Json;
  new_value: Json;
  change_reason: string | null;
  admin_id: string;
  created_at: string;
}

export function useAdminCheckoutSettings() {
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [otpSettings, setOtpSettings] = useState<OtpSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<SettingsAudit[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch platform settings
  const fetchPlatformSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_checkout_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setPlatformSettings((data || []) as PlatformSetting[]);
    } catch (err) {
      console.error('Error fetching platform settings:', err);
      toast.error('Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch OTP settings
  const fetchOtpSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('otp_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setOtpSettings(data as OtpSettings);
    } catch (err) {
      console.error('Error fetching OTP settings:', err);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('checkout_settings_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setAuditLogs((data || []) as SettingsAudit[]);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, []);

  // Update a platform setting
  const updatePlatformSetting = useCallback(async (
    settingKey: string,
    newValue: string,
    reason?: string
  ) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get current setting
      const currentSetting = platformSettings.find(s => s.setting_key === settingKey);
      if (!currentSetting) throw new Error('Setting not found');

      if (currentSetting.is_locked) {
        toast.error('This setting is locked and cannot be modified');
        return;
      }

      // Update setting
      const { error } = await supabase
        .from('platform_checkout_settings')
        .update({
          setting_value: newValue,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('setting_key', settingKey);

      if (error) throw error;

      // Log audit
      await supabase.from('checkout_settings_audit').insert([{
        setting_table: 'platform_checkout_settings',
        setting_key: settingKey,
        previous_value: { value: currentSetting.setting_value } as unknown as Json,
        new_value: { value: newValue } as unknown as Json,
        change_reason: reason,
        admin_id: userId,
      }]);

      toast.success('Setting updated');
      await fetchPlatformSettings();
    } catch (err) {
      console.error('Error updating setting:', err);
      toast.error('Failed to update setting');
      throw err;
    }
  }, [platformSettings, fetchPlatformSettings]);

  // Update OTP settings
  const updateOtpSettings = useCallback(async (
    updates: Partial<OtpSettings>,
    reason?: string
  ) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!otpSettings) throw new Error('OTP settings not loaded');

      // Validate: at least one auth method must be enabled
      const newOtpEnabled = updates.otp_enabled ?? otpSettings.otp_enabled;
      if (!newOtpEnabled) {
        // Check if guest checkout is enabled
        const guestSetting = platformSettings.find(s => s.setting_key === 'allow_guest_checkout');
        if (guestSetting?.setting_value !== 'true') {
          toast.error('Cannot disable OTP while guest checkout is disabled');
          return;
        }
      }

      // Update settings
      const { error } = await supabase
        .from('otp_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', otpSettings.id);

      if (error) throw error;

      // Log audit
      await supabase.from('checkout_settings_audit').insert([{
        setting_table: 'otp_settings',
        setting_key: null,
        previous_value: otpSettings as unknown as Json,
        new_value: { ...otpSettings, ...updates } as unknown as Json,
        change_reason: reason,
        admin_id: userId,
      }]);

      toast.success('OTP settings updated');
      await fetchOtpSettings();
    } catch (err) {
      console.error('Error updating OTP settings:', err);
      toast.error('Failed to update OTP settings');
      throw err;
    }
  }, [otpSettings, platformSettings, fetchOtpSettings]);

  // Get setting value helper
  const getSettingValue = useCallback((key: string): string | null => {
    const setting = platformSettings.find(s => s.setting_key === key);
    return setting?.setting_value ?? null;
  }, [platformSettings]);

  // Get boolean setting helper
  const getBooleanSetting = useCallback((key: string): boolean => {
    return getSettingValue(key) === 'true';
  }, [getSettingValue]);

  // Get number setting helper
  const getNumberSetting = useCallback((key: string): number => {
    const value = getSettingValue(key);
    return value ? parseInt(value, 10) : 0;
  }, [getSettingValue]);

  // Check if setting is locked
  const isSettingLocked = useCallback((key: string): boolean => {
    const setting = platformSettings.find(s => s.setting_key === key);
    return setting?.is_locked ?? false;
  }, [platformSettings]);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('checkout-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_checkout_settings' }, () => {
        fetchPlatformSettings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'otp_settings' }, () => {
        fetchOtpSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlatformSettings, fetchOtpSettings]);

  return {
    platformSettings,
    otpSettings,
    auditLogs,
    loading,
    fetchPlatformSettings,
    fetchOtpSettings,
    fetchAuditLogs,
    updatePlatformSetting,
    updateOtpSettings,
    getSettingValue,
    getBooleanSetting,
    getNumberSetting,
    isSettingLocked,
  };
}