import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type NotificationType = "info" | "warning" | "alert" | "system";
export type NotificationStatus = "draft" | "scheduled" | "sent" | "archived";
export type TargetAudience = "all" | "customers" | "merchants" | "specific";

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience: string;
  specific_user_ids?: string[];
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  delivered_count?: number;
  read_count?: number;
  failed_count?: number;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  user_id: string;
  user_type: string;
  delivery_status: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface NotificationLog {
  id: string;
  notification_id: string;
  admin_id: string;
  action_type: string;
  description?: string;
  previous_value?: any;
  new_value?: any;
  created_at: string;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  target_audience?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAdminNotifications(filters: NotificationFilters = {}) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-list", filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters.target_audience && filters.target_audience !== "all") {
        query = query.eq("target_audience", filters.target_audience);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch recipient stats for each notification
      const notificationsWithStats = await Promise.all(
        (data || []).map(async (notification: any) => {
          const { data: recipients } = await (supabase as any)
            .from("admin_notification_recipients")
            .select("delivery_status, read_at")
            .eq("notification_id", notification.id);

          const delivered_count = recipients?.filter((r: any) => r.delivery_status === "delivered").length || 0;
          const read_count = recipients?.filter((r: any) => r.read_at).length || 0;
          const failed_count = recipients?.filter((r: any) => r.delivery_status === "failed").length || 0;

          return {
            ...notification,
            delivered_count,
            read_count,
            failed_count,
          };
        })
      );

      return notificationsWithStats as AdminNotification[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-notifications-list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const metrics = {
    total: notifications.length,
    draft: notifications.filter((n) => n.status === "draft").length,
    scheduled: notifications.filter((n) => n.status === "scheduled").length,
    sent: notifications.filter((n) => n.status === "sent").length,
    archived: notifications.filter((n) => n.status === "archived").length,
  };

  return { notifications, isLoading, metrics };
}

export function useAdminNotificationDetails(notificationId: string) {
  const queryClient = useQueryClient();

  const { data: notification, isLoading: notificationLoading } = useQuery({
    queryKey: ["admin-notification", notificationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_notifications")
        .select("*")
        .eq("id", notificationId)
        .single();

      if (error) throw error;
      return data as AdminNotification;
    },
    enabled: !!notificationId,
  });

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ["admin-notification-recipients", notificationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_notification_recipients")
        .select("*")
        .eq("notification_id", notificationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((r: any) => r.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds as string[]);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        return (data || []).map((recipient: any) => ({
          ...recipient,
          profile: profileMap.get(recipient.user_id),
        })) as NotificationRecipient[];
      }

      return data as NotificationRecipient[];
    },
    enabled: !!notificationId,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin-notification-logs", notificationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_notification_logs")
        .select("*")
        .eq("notification_id", notificationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as NotificationLog[];
    },
    enabled: !!notificationId,
  });

  const deliveryMetrics = {
    total: recipients.length,
    delivered: recipients.filter((r) => r.delivery_status === "delivered").length,
    read: recipients.filter((r) => r.read_at).length,
    failed: recipients.filter((r) => r.delivery_status === "failed").length,
    pending: recipients.filter((r) => r.delivery_status === "pending").length,
  };

  // Real-time subscription
  useEffect(() => {
    if (!notificationId) return;

    const channel = supabase
      .channel(`notification-${notificationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications", filter: `id=eq.${notificationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-notification", notificationId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notification_recipients", filter: `notification_id=eq.${notificationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-notification-recipients", notificationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notificationId, queryClient]);

  // Mutations
  const updateNotificationMutation = useMutation({
    mutationFn: async (updates: Partial<AdminNotification>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("admin_notifications")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;

      // Log action
      await (supabase as any).from("admin_notification_logs").insert({
        notification_id: notificationId,
        admin_id: user.id,
        action_type: "updated",
        description: "Notification updated",
        new_value: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification", notificationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-logs", notificationId] });
      toast({ title: "Notification updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating notification", description: error.message, variant: "destructive" });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!notification) throw new Error("Notification not found");

      // Get target users based on audience
      let targetUsers: { id: string; type: string }[] = [];

      if (notification.target_audience === "all" || notification.target_audience === "customers") {
        const { data: profiles } = await supabase.from("profiles").select("user_id");
        targetUsers = [...targetUsers, ...(profiles || []).map((p) => ({ id: p.user_id, type: "customer" }))];
      }

      if (notification.target_audience === "all" || notification.target_audience === "merchants") {
        const { data: merchants } = await supabase.from("merchants").select("user_id");
        targetUsers = [...targetUsers, ...(merchants || []).map((m) => ({ id: m.user_id, type: "merchant" }))];
      }

      if (notification.target_audience === "specific" && notification.specific_user_ids) {
        targetUsers = notification.specific_user_ids.map((id) => ({ id, type: "specific" }));
      }

      // Remove duplicates
      const uniqueUsers = Array.from(new Map(targetUsers.map((u) => [u.id, u])).values());

      // Create recipients
      if (uniqueUsers.length > 0) {
        const recipientRows = uniqueUsers.map((u) => ({
          notification_id: notificationId,
          user_id: u.id,
          user_type: u.type,
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
        }));

        await (supabase as any).from("admin_notification_recipients").insert(recipientRows);
      }

      // Update notification status
      await (supabase as any)
        .from("admin_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      // Create notifications in the main notifications table for each user
      const notificationRows = uniqueUsers.map((u) => ({
        user_id: u.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: false,
      }));

      if (notificationRows.length > 0) {
        await supabase.from("notifications").insert(notificationRows);
      }

      // Log action
      await (supabase as any).from("admin_notification_logs").insert({
        notification_id: notificationId,
        admin_id: user.id,
        action_type: "sent",
        description: `Notification sent to ${uniqueUsers.length} users`,
        new_value: { recipient_count: uniqueUsers.length },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification", notificationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-recipients", notificationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-logs", notificationId] });
      toast({ title: "Notification sent successfully" });
    },
    onError: (error) => {
      toast({ title: "Error sending notification", description: error.message, variant: "destructive" });
    },
  });

  const archiveNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await (supabase as any)
        .from("admin_notifications")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      await (supabase as any).from("admin_notification_logs").insert({
        notification_id: notificationId,
        admin_id: user.id,
        action_type: "archived",
        description: "Notification archived",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification", notificationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-logs", notificationId] });
      toast({ title: "Notification archived" });
    },
    onError: (error) => {
      toast({ title: "Error archiving notification", description: error.message, variant: "destructive" });
    },
  });

  const resendNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get existing recipients who haven't read
      const unreadRecipients = recipients.filter((r) => !r.read_at);

      // Update delivery status
      for (const recipient of unreadRecipients) {
        await (supabase as any)
          .from("admin_notification_recipients")
          .update({
            delivery_status: "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", recipient.id);
      }

      await (supabase as any).from("admin_notification_logs").insert({
        notification_id: notificationId,
        admin_id: user.id,
        action_type: "resent",
        description: `Notification resent to ${unreadRecipients.length} unread recipients`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification-recipients", notificationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-logs", notificationId] });
      toast({ title: "Notification resent" });
    },
    onError: (error) => {
      toast({ title: "Error resending notification", description: error.message, variant: "destructive" });
    },
  });

  return {
    notification,
    recipients,
    logs,
    deliveryMetrics,
    isLoading: notificationLoading || recipientsLoading || logsLoading,
    updateNotification: updateNotificationMutation.mutate,
    isUpdating: updateNotificationMutation.isPending,
    sendNotification: sendNotificationMutation.mutate,
    isSending: sendNotificationMutation.isPending,
    archiveNotification: archiveNotificationMutation.mutate,
    isArchiving: archiveNotificationMutation.isPending,
    resendNotification: resendNotificationMutation.mutate,
    isResending: resendNotificationMutation.isPending,
  };
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      target_audience: string;
      specific_user_ids?: string[];
      status: string;
      scheduled_at?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: notification, error } = await (supabase as any)
        .from("admin_notifications")
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await (supabase as any).from("admin_notification_logs").insert({
        notification_id: notification.id,
        admin_id: user.id,
        action_type: "created",
        description: `Notification created: ${data.title}`,
        new_value: data,
      });

      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-list"] });
      toast({ title: "Notification created" });
    },
    onError: (error) => {
      toast({ title: "Error creating notification", description: error.message, variant: "destructive" });
    },
  });
}
