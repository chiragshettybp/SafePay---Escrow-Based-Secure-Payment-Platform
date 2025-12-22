import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";

export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  category: string;
  related_order_id: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_staff: boolean;
  message: string;
  attachments: string[] | null;
  created_at: string;
}

export interface SupportAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  order_index: number;
  is_active: boolean;
}

export function useCustomerSupport() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch all tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });

  // Fetch single ticket
  const fetchTicket = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error) throw error;
    return data as SupportTicket;
  };

  // Fetch ticket messages
  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as SupportMessage[];
  };

  // Fetch FAQs
  const { data: faqs, isLoading: faqsLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as FAQ[];
    },
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async ({
      category,
      subject,
      description,
      relatedOrderId,
      attachments,
    }: {
      category: string;
      subject: string;
      description: string;
      relatedOrderId?: string;
      attachments?: File[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          category,
          subject,
          description,
          related_order_id: relatedOrderId || null,
          ticket_number: `TKT-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create initial message
      const { error: messageError } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          is_staff: false,
          message: description,
        });

      if (messageError) throw messageError;

      // Upload attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const filePath = `${user.id}/${ticket.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("support-attachments")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Failed to upload attachment:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("support-attachments")
            .getPublicUrl(filePath);

          await supabase.from("support_attachments").insert({
            ticket_id: ticket.id,
            user_id: user.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Support ticket created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create support ticket");
      console.error(error);
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({
      ticketId,
      message,
      attachments,
    }: {
      ticketId: string;
      message: string;
      attachments?: File[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create message
      const { data: msg, error: messageError } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          is_staff: false,
          message,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload attachments
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const filePath = `${user.id}/${ticketId}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("support-attachments")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Failed to upload attachment:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("support-attachments")
            .getPublicUrl(filePath);

          await supabase.from("support_attachments").insert({
            ticket_id: ticketId,
            message_id: msg.id,
            user_id: user.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      // Update ticket status
      await supabase
        .from("support_tickets")
        .update({ status: "awaiting_response" })
        .eq("id", ticketId);

      return msg;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-messages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  // Realtime subscription for tickets
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("support-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    tickets,
    ticketsLoading,
    faqs,
    faqsLoading,
    fetchTicket,
    fetchMessages,
    createTicket,
    sendMessage,
  };
}
