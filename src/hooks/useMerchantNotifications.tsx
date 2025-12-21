import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { toast } from "@/hooks/use-toast";

export interface MerchantNotification {
  id: string;
  merchant_id: string;
  type: string;
  title: string;
  body: string;
  related_order_id: string | null;
  related_dispute_id: string | null;
  data: Record<string, unknown>;
  status: "unread" | "read" | "archived" | "deleted";
  priority: "normal" | "urgent";
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface NotificationPrefs {
  id: string;
  merchant_id: string;
  order_in_app: boolean;
  order_email: boolean;
  order_sms: boolean;
  payment_in_app: boolean;
  payment_email: boolean;
  payment_sms: boolean;
  dispute_in_app: boolean;
  dispute_email: boolean;
  dispute_sms: boolean;
  payout_in_app: boolean;
  payout_email: boolean;
  payout_sms: boolean;
  system_in_app: boolean;
  system_email: boolean;
  system_sms: boolean;
  created_at: string;
  updated_at: string;
}

type NotificationStatus = "unread" | "read" | "archived" | "deleted";

export function useMerchantNotifications(statusFilter?: NotificationStatus | "all") {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading, error, refetch } = useQuery({
    queryKey: ["merchant-notifications", user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("merchant_notifications")
        .select("*")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      } else {
        // Default: show unread and read, not archived/deleted
        query = query.in("status", ["unread", "read"]);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as MerchantNotification[];
    },
    enabled: !!user?.id,
  });

  // Get unread count
  const unreadCount = notifications?.filter((n) => n.status === "unread").length || 0;

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("merchant_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("merchant_id", user?.id)
        .eq("status", "unread");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  // Archive notification
  const archiveNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("merchant_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      toast({ title: "Notification archived" });
    },
  });

  // Bulk archive
  const bulkArchive = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .in("id", ids)
        .eq("merchant_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      toast({ title: "Notifications archived" });
    },
  });

  // Bulk mark as read
  const bulkMarkAsRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .in("id", ids)
        .eq("merchant_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      toast({ title: "Notifications marked as read" });
    },
  });

  // Delete notification (soft delete)
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "deleted" })
        .eq("id", notificationId)
        .eq("merchant_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      toast({ title: "Notification deleted" });
    },
  });

  // Restore from archive
  const restoreNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("merchant_notifications")
        .update({ status: "read", archived_at: null })
        .eq("id", notificationId)
        .eq("merchant_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      toast({ title: "Notification restored" });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("merchant-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "merchant_notifications",
          filter: `merchant_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New merchant notification:", payload);
          queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });

          const newNotification = payload.new as MerchantNotification;
          toast({
            title: newNotification.title,
            description: newNotification.body.substring(0, 100),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "merchant_notifications",
          filter: `merchant_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    archiveNotification: archiveNotification.mutate,
    bulkArchive: bulkArchive.mutate,
    bulkMarkAsRead: bulkMarkAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    restoreNotification: restoreNotification.mutate,
    isMarkingRead: markAsRead.isPending,
    isArchiving: archiveNotification.isPending,
  };
}

// Hook for notification preferences
export function useMerchantNotificationPrefs() {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading, error } = useQuery({
    queryKey: ["merchant-notification-prefs", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("merchant_notification_prefs")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPrefs | null;
    },
    enabled: !!user?.id,
  });

  const savePrefs = useMutation({
    mutationFn: async (newPrefs: Partial<NotificationPrefs>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("merchant_notification_prefs")
        .select("id")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("merchant_notification_prefs")
          .update(newPrefs)
          .eq("merchant_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("merchant_notification_prefs")
          .insert({ merchant_id: user.id, ...newPrefs });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-notification-prefs"] });
      toast({ title: "Preferences saved successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to save preferences",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return {
    prefs,
    isLoading,
    error,
    savePrefs: savePrefs.mutate,
    isSaving: savePrefs.isPending,
  };
}

// Hook for single notification detail
export function useMerchantNotificationDetail(notificationId: string | undefined) {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  const { data: notification, isLoading, error } = useQuery({
    queryKey: ["merchant-notification-detail", notificationId],
    queryFn: async () => {
      if (!notificationId || !user?.id) return null;

      const { data, error } = await supabase
        .from("merchant_notifications")
        .select("*")
        .eq("id", notificationId)
        .eq("merchant_id", user.id)
        .single();

      if (error) throw error;

      // Mark as read if unread
      if (data.status === "unread") {
        await supabase
          .from("merchant_notifications")
          .update({ status: "read", read_at: new Date().toISOString() })
          .eq("id", notificationId);

        queryClient.invalidateQueries({ queryKey: ["merchant-notifications"] });
      }

      return data as MerchantNotification;
    },
    enabled: !!notificationId && !!user?.id,
  });

  return { notification, isLoading, error };
}
