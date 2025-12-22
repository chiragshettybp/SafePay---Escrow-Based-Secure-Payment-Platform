import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to?: string;
  escalated?: boolean;
  escalation_reason?: string;
  resolution_note?: string;
  sla_due_at?: string;
  related_order_id?: string;
  related_shipment_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
  order?: {
    id: string;
    product_name: string;
    amount: number;
    status: string;
  };
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_staff: boolean;
  attachments?: string[];
  created_at: string;
}

export interface SupportAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  ticket_id: string;
  previous_status?: string;
  new_status: string;
  previous_priority?: string;
  new_priority?: string;
  changed_by: string;
  changed_by_type: string;
  reason?: string;
  created_at: string;
}

export interface SupportFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAdminSupport(filters: SupportFilters = {}) {
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-support-tickets", filters],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.search) {
        query = query.or(`ticket_number.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((t) => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return (data || []).map((ticket) => ({
        ...ticket,
        profile: profileMap.get(ticket.user_id),
      })) as SupportTicket[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const metrics = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    waiting: tickets.filter((t) => t.status === "waiting").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
    high: tickets.filter((t) => t.priority === "high").length,
  };

  return { tickets, isLoading, metrics };
}

export function useAdminTicketDetails(ticketId: string) {
  const queryClient = useQueryClient();

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["admin-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (error) throw error;

      // Fetch profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .eq("user_id", data.user_id)
        .single();

      return { ...data, profile } as SupportTicket & { profile: { full_name: string; avatar_url?: string; phone?: string } };
    },
    enabled: !!ticketId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as SupportMessage[];
    },
    enabled: !!ticketId,
  });

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ["admin-ticket-attachments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportAttachment[];
    },
    enabled: !!ticketId,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["admin-ticket-history", ticketId],
    queryFn: async () => {
      // Direct query with type bypass since table was just created
      const { data, error } = await (supabase as any)
        .from("support_status_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as StatusHistory[];
    },
    enabled: !!ticketId,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", ticketId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `id=eq.${ticketId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        is_staff: true,
      });

      if (error) throw error;

      // Log action
      await supabase.from("support_actions_log" as any).insert({
        ticket_id: ticketId,
        admin_id: user.id,
        action_type: "message_sent",
        description: "Admin sent a message",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", ticketId] });
      toast({ title: "Message sent" });
    },
    onError: (error) => {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const previousStatus = ticket?.status;

      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Log status change
      await supabase.from("support_status_history" as any).insert({
        ticket_id: ticketId,
        previous_status: previousStatus,
        new_status: status,
        changed_by: user.id,
        changed_by_type: "admin",
        reason,
      });

      // Log action
      await supabase.from("support_actions_log" as any).insert({
        ticket_id: ticketId,
        admin_id: user.id,
        action_type: "status_change",
        description: `Status changed from ${previousStatus} to ${status}`,
        previous_value: { status: previousStatus },
        new_value: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-history", ticketId] });
      toast({ title: "Status updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ priority, reason }: { priority: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const previousPriority = ticket?.priority;

      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({ priority, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Log priority change
      await supabase.from("support_status_history" as any).insert({
        ticket_id: ticketId,
        previous_priority: previousPriority,
        new_priority: priority,
        new_status: ticket?.status || "open",
        changed_by: user.id,
        changed_by_type: "admin",
        reason,
      });

      // Log action
      await supabase.from("support_actions_log" as any).insert({
        ticket_id: ticketId,
        admin_id: user.id,
        action_type: "priority_change",
        description: `Priority changed from ${previousPriority} to ${priority}`,
        previous_value: { priority: previousPriority },
        new_value: { priority },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-history", ticketId] });
      toast({ title: "Priority updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating priority", description: error.message, variant: "destructive" });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({
          escalated: true as any,
          escalation_reason: reason as any,
          priority: "critical",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("support_actions_log" as any).insert({
        ticket_id: ticketId,
        admin_id: user.id,
        action_type: "escalation",
        description: `Ticket escalated: ${reason}`,
        new_value: { escalated: true, reason },
      });

      await supabase.from("support_status_history" as any).insert({
        ticket_id: ticketId,
        previous_priority: ticket?.priority,
        new_priority: "critical",
        new_status: ticket?.status || "open",
        changed_by: user.id,
        changed_by_type: "admin",
        reason: `Escalated: ${reason}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-history", ticketId] });
      toast({ title: "Ticket escalated" });
    },
    onError: (error) => {
      toast({ title: "Error escalating ticket", description: error.message, variant: "destructive" });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (resolutionNote: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({
          status: "closed",
          resolution_note: resolutionNote as any,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("support_actions_log" as any).insert({
        ticket_id: ticketId,
        admin_id: user.id,
        action_type: "ticket_closed",
        description: `Ticket closed with resolution: ${resolutionNote}`,
        new_value: { status: "closed", resolution_note: resolutionNote },
      });

      await supabase.from("support_status_history" as any).insert({
        ticket_id: ticketId,
        previous_status: ticket?.status,
        new_status: "closed",
        changed_by: user.id,
        changed_by_type: "admin",
        reason: resolutionNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-history", ticketId] });
      toast({ title: "Ticket closed" });
    },
    onError: (error) => {
      toast({ title: "Error closing ticket", description: error.message, variant: "destructive" });
    },
  });

  return {
    ticket,
    messages,
    attachments,
    history,
    isLoading: ticketLoading || messagesLoading || attachmentsLoading || historyLoading,
    sendMessage: sendMessageMutation.mutate,
    isSendingMessage: sendMessageMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updatePriority: updatePriorityMutation.mutate,
    isUpdatingPriority: updatePriorityMutation.isPending,
    escalate: escalateMutation.mutate,
    isEscalating: escalateMutation.isPending,
    closeTicket: closeTicketMutation.mutate,
    isClosingTicket: closeTicketMutation.isPending,
  };
}
