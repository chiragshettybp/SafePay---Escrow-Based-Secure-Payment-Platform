import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";

export interface UserSecurity {
  id: string;
  user_id: string;
  two_factor_enabled: boolean;
  two_factor_method: string | null;
  last_password_change: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPrefs {
  id: string;
  user_id: string;
  order_in_app: boolean;
  order_email: boolean;
  order_sms: boolean;
  payment_in_app: boolean;
  payment_email: boolean;
  payment_sms: boolean;
  dispute_in_app: boolean;
  dispute_email: boolean;
  dispute_sms: boolean;
  refund_in_app: boolean;
  refund_email: boolean;
  refund_sms: boolean;
  system_in_app: boolean;
  system_email: boolean;
  system_sms: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacyRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomerSettings() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch security settings
  const { data: security, isLoading: securityLoading } = useQuery({
    queryKey: ["user-security", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_security")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as UserSecurity | null;
    },
    enabled: !!user,
  });

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: notificationPrefsLoading } = useQuery({
    queryKey: ["user-notification-prefs", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_notification_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as UserNotificationPrefs | null;
    },
    enabled: !!user,
  });

  // Fetch privacy requests
  const { data: privacyRequests, isLoading: privacyRequestsLoading } = useQuery({
    queryKey: ["privacy-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_privacy_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PrivacyRequest[];
    },
    enabled: !!user,
  });

  // Update security settings
  const updateSecurity = useMutation({
    mutationFn: async (updates: Partial<UserSecurity>) => {
      if (!user) throw new Error("Not authenticated");

      // Check if record exists
      const { data: existing } = await supabase
        .from("user_security")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_security")
          .update(updates)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_security")
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-security"] });
      toast.success("Security settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update security settings");
      console.error(error);
    },
  });

  // Update notification preferences
  const updateNotificationPrefs = useMutation({
    mutationFn: async (updates: Partial<UserNotificationPrefs>) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("user_notification_prefs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_notification_prefs")
          .update(updates)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_notification_prefs")
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notification-prefs"] });
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      toast.error("Failed to update notification preferences");
      console.error(error);
    },
  });

  // Create privacy request
  const createPrivacyRequest = useMutation({
    mutationFn: async (requestType: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_privacy_requests")
        .insert({
          user_id: user.id,
          request_type: requestType,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy-requests"] });
      toast.success("Privacy request submitted");
    },
    onError: (error) => {
      toast.error("Failed to submit privacy request");
      console.error(error);
    },
  });

  // Change password
  const changePassword = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      // Update last password change timestamp
      if (user) {
        await supabase
          .from("user_security")
          .upsert({
            user_id: user.id,
            last_password_change: new Date().toISOString(),
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-security"] });
      toast.success("Password changed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  return {
    security,
    securityLoading,
    notificationPrefs,
    notificationPrefsLoading,
    privacyRequests,
    privacyRequestsLoading,
    updateSecurity,
    updateNotificationPrefs,
    createPrivacyRequest,
    changePassword,
  };
}
