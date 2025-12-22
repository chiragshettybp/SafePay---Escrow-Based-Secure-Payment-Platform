import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { toast } from "sonner";

export interface MerchantSupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  category: string;
  related_order_id: string | null;
  related_shipment_id: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantSupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_staff: boolean;
  message: string;
  attachments: string[] | null;
  created_at: string;
}

export interface MerchantSupportAttachment {
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

export interface MerchantFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  order_index: number;
  is_active: boolean;
  audience: string;
}

export const MERCHANT_TICKET_CATEGORIES = [
  { value: "orders_shipments", label: "Orders & Shipments" },
  { value: "payments_payouts", label: "Payments & Payouts" },
  { value: "disputes", label: "Disputes" },
  { value: "verification_kyc", label: "Verification / KYC" },
  { value: "account_login", label: "Account / Login" },
  { value: "technical", label: "Technical Issue" },
  { value: "other", label: "Other" },
];

export function useMerchantSupport() {
  const { user, merchant } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Fetch all tickets for merchant
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["merchant-support-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MerchantSupportTicket[];
    },
    enabled: !!user,
  });

  // Ticket counts for dashboard
  const ticketCounts = {
    open: tickets?.filter(t => t.status === "open").length || 0,
    awaiting_merchant: tickets?.filter(t => t.status === "awaiting_response").length || 0,
    in_progress: tickets?.filter(t => t.status === "in_progress").length || 0,
    resolved: tickets?.filter(t => t.status === "resolved" || t.status === "closed").length || 0,
  };

  // Fetch single ticket
  const fetchTicket = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error) throw error;
    return data as MerchantSupportTicket;
  };

  // Fetch ticket messages
  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as MerchantSupportMessage[];
  };

  // Fetch ticket attachments
  const fetchAttachments = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as MerchantSupportAttachment[];
  };

  // Fetch merchant FAQs
  const { data: faqs, isLoading: faqsLoading } = useQuery({
    queryKey: ["merchant-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .in("audience", ["all", "merchant"])
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as MerchantFAQ[];
    },
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async ({
      category,
      subject,
      description,
      relatedOrderId,
      relatedShipmentId,
      attachments,
    }: {
      category: string;
      subject: string;
      description: string;
      relatedOrderId?: string;
      relatedShipmentId?: string;
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
          related_shipment_id: relatedShipmentId || null,
          ticket_number: `MTK-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          priority: "normal",
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
          const filePath = `merchant/${user.id}/${ticket.id}/${Date.now()}_${file.name}`;
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
      queryClient.invalidateQueries({ queryKey: ["merchant-support-tickets"] });
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
          const filePath = `merchant/${user.id}/${ticketId}/${Date.now()}_${file.name}`;
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
        .update({ status: "awaiting_response", updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      return msg;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchant-support-messages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-support-tickets"] });
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  // Upload additional evidence
  const uploadEvidence = useMutation({
    mutationFn: async ({
      ticketId,
      files,
      description,
    }: {
      ticketId: string;
      files: File[];
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const uploadedFiles: MerchantSupportAttachment[] = [];

      for (const file of files) {
        const filePath = `merchant/${user.id}/${ticketId}/evidence/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Failed to upload evidence:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("support-attachments")
          .getPublicUrl(filePath);

        const { data: attachment, error: attachError } = await supabase
          .from("support_attachments")
          .insert({
            ticket_id: ticketId,
            user_id: user.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (!attachError && attachment) {
          uploadedFiles.push(attachment as MerchantSupportAttachment);
        }
      }

      // Add system message about evidence upload
      if (uploadedFiles.length > 0) {
        await supabase.from("support_messages").insert({
          ticket_id: ticketId,
          sender_id: user.id,
          is_staff: false,
          message: description 
            ? `Additional evidence uploaded: ${description}` 
            : `${uploadedFiles.length} file(s) uploaded as additional evidence.`,
        });

        // Update ticket
        await supabase
          .from("support_tickets")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      }

      return uploadedFiles;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchant-support-attachments", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-support-messages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-support-tickets"] });
      toast.success("Evidence uploaded successfully");
    },
    onError: (error) => {
      toast.error("Failed to upload evidence");
      console.error(error);
    },
  });

  // Close ticket
  const closeTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "closed", resolved_at: new Date().toISOString() })
        .eq("id", ticketId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-support-tickets"] });
      toast.success("Ticket closed");
    },
    onError: (error) => {
      toast.error("Failed to close ticket");
      console.error(error);
    },
  });

  // Realtime subscription for tickets
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("merchant-support-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-support-tickets"] });
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
          queryClient.invalidateQueries({ queryKey: ["merchant-support-messages"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_attachments",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-support-attachments"] });
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
    ticketCounts,
    faqs,
    faqsLoading,
    fetchTicket,
    fetchMessages,
    fetchAttachments,
    createTicket,
    sendMessage,
    uploadEvidence,
    closeTicket,
  };
}
