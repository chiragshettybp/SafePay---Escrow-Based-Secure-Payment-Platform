import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type MerchantDisputeStatus = "open" | "under_review" | "resolved" | "closed";

export interface MerchantDispute {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string;
  status: MerchantDisputeStatus;
  documents: string[] | null;
  resolution_notes: string | null;
  issue_type: string | null;
  refund_amount: number | null;
  final_decision: string | null;
  merchant_responded: boolean | null;
  created_at: string;
  updated_at: string;
  // Joined order data
  order?: {
    id: string;
    product_name: string;
    product_description: string | null;
    amount: number;
    customer_id: string;
  };
}

export interface DisputeResponse {
  id: string;
  dispute_id: string;
  merchant_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantEvidence {
  id: string;
  dispute_id: string;
  merchant_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  evidence_type: string | null;
  created_at: string;
}

export interface DisputeUpdate {
  id: string;
  dispute_id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DisputeFile {
  id: string;
  dispute_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export interface DisputeComment {
  id: string;
  dispute_id: string;
  user_id: string;
  message: string;
  is_admin: boolean | null;
  created_at: string;
}

export const EVIDENCE_TYPES = [
  { value: "tracking", label: "Tracking / Shipping Proof" },
  { value: "delivery", label: "Delivery Confirmation" },
  { value: "invoice", label: "Invoice / Receipt" },
  { value: "chat", label: "Chat / Communication Logs" },
  { value: "photo", label: "Product Photos" },
  { value: "other", label: "Other" },
];

export const ISSUE_TYPES = [
  { value: "not_delivered", label: "Not Delivered" },
  { value: "wrong_item", label: "Wrong Item" },
  { value: "damaged", label: "Damaged" },
  { value: "misleading_product", label: "Misleading Product" },
  { value: "service_not_provided", label: "Service Not Provided" },
  { value: "other", label: "Other" },
];

export function useMerchantDisputes(statusFilter?: MerchantDisputeStatus | null) {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  const { data: disputes, isLoading: isLoadingDisputes } = useQuery({
    queryKey: ["merchant-disputes", user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("disputes")
        .select(`
          *,
          order:orders!inner (
            id,
            product_name,
            product_description,
            amount,
            customer_id
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MerchantDispute[];
    },
    enabled: !!user?.id,
  });

  // Real-time subscription for disputes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("merchant-disputes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-disputes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    disputes: disputes || [],
    isLoadingDisputes,
  };
}

export function useMerchantDisputeDetails(disputeId: string) {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Fetch dispute details
  const { data: dispute, isLoading: isLoadingDispute } = useQuery({
    queryKey: ["merchant-dispute", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          order:orders!inner (
            id,
            product_name,
            product_description,
            amount,
            customer_id
          )
        `)
        .eq("id", disputeId)
        .maybeSingle();

      if (error) throw error;
      return data as MerchantDispute | null;
    },
    enabled: !!user?.id && !!disputeId,
  });

  // Fetch dispute updates (timeline)
  const { data: updates, isLoading: isLoadingUpdates } = useQuery({
    queryKey: ["merchant-dispute-updates", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispute_updates")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as DisputeUpdate[];
    },
    enabled: !!disputeId,
  });

  // Fetch merchant responses
  const { data: responses, isLoading: isLoadingResponses } = useQuery({
    queryKey: ["merchant-dispute-responses", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispute_responses")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as DisputeResponse[];
    },
    enabled: !!disputeId,
  });

  // Fetch customer evidence files
  const { data: customerFiles, isLoading: isLoadingCustomerFiles } = useQuery({
    queryKey: ["merchant-dispute-customer-files", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispute_files")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DisputeFile[];
    },
    enabled: !!disputeId,
  });

  // Fetch merchant evidence
  const { data: merchantEvidence, isLoading: isLoadingEvidence } = useQuery({
    queryKey: ["merchant-dispute-evidence", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_evidence")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MerchantEvidence[];
    },
    enabled: !!disputeId,
  });

  // Fetch comments
  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["merchant-dispute-comments", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispute_comments")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as DisputeComment[];
    },
    enabled: !!disputeId,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!disputeId) return;

    const channel = supabase
      .channel(`merchant-dispute-${disputeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
          filter: `id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-dispute", disputeId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispute_updates",
          filter: `dispute_id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-dispute-updates", disputeId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispute_responses",
          filter: `dispute_id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-dispute-responses", disputeId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_evidence",
          filter: `dispute_id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-dispute-evidence", disputeId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispute_files",
          filter: `dispute_id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-dispute-customer-files", disputeId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispute_comments",
          filter: `dispute_id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-dispute-comments", disputeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [disputeId, queryClient]);

  // Submit response mutation
  const submitResponse = useMutation({
    mutationFn: async (responseText: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Insert the response
      const { error: responseError } = await supabase
        .from("dispute_responses")
        .insert({
          dispute_id: disputeId,
          merchant_id: user.id,
          response_text: responseText,
        });

      if (responseError) throw responseError;

      // Update dispute status
      const { error: updateError } = await supabase
        .from("disputes")
        .update({
          merchant_responded: true,
          status: "under_review",
        })
        .eq("id", disputeId);

      if (updateError) throw updateError;

      // Add timeline entry
      await supabase.from("dispute_updates").insert({
        dispute_id: disputeId,
        title: "Merchant Responded",
        description: "The merchant has submitted a response to this dispute.",
        status: "under_review",
        created_by: "merchant",
      });

      // Notify customer
      if (dispute?.customer_id) {
        await supabase.from("notifications").insert({
          user_id: dispute.customer_id,
          title: "Merchant Responded",
          message: "The merchant has responded to your dispute.",
          type: "dispute",
          order_id: dispute.order_id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-dispute", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-dispute-responses", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-dispute-updates", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-disputes"] });
      toast({
        title: "Response Submitted",
        description: "Your response has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response.",
        variant: "destructive",
      });
    },
  });

  // Upload evidence mutation
  const uploadEvidence = useMutation({
    mutationFn: async ({
      file,
      description,
      evidenceType,
    }: {
      file: File;
      description: string;
      evidenceType: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${disputeId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("merchant-evidence")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("merchant-evidence")
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase.from("merchant_evidence").insert({
        dispute_id: disputeId,
        merchant_id: user.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        description,
        evidence_type: evidenceType,
      });

      if (dbError) throw dbError;

      // Add timeline entry
      await supabase.from("dispute_updates").insert({
        dispute_id: disputeId,
        title: "Evidence Uploaded",
        description: `Merchant uploaded evidence: ${file.name}`,
        created_by: "merchant",
      });

      // Update dispute
      await supabase
        .from("disputes")
        .update({ merchant_responded: true })
        .eq("id", disputeId);

      // Notify customer
      if (dispute?.customer_id) {
        await supabase.from("notifications").insert({
          user_id: dispute.customer_id,
          title: "New Evidence Submitted",
          message: "The merchant has uploaded new evidence for your dispute.",
          type: "dispute",
          order_id: dispute.order_id,
        });
      }

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-dispute-evidence", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-dispute-updates", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-disputes"] });
      toast({
        title: "Evidence Uploaded",
        description: "Your evidence has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload evidence.",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("dispute_comments").insert({
        dispute_id: disputeId,
        user_id: user.id,
        message,
        is_admin: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-dispute-comments", disputeId] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  return {
    dispute,
    isLoadingDispute,
    updates: updates || [],
    isLoadingUpdates,
    responses: responses || [],
    isLoadingResponses,
    customerFiles: customerFiles || [],
    isLoadingCustomerFiles,
    merchantEvidence: merchantEvidence || [],
    isLoadingEvidence,
    comments: comments || [],
    isLoadingComments,
    submitResponse: submitResponse.mutate,
    isSubmittingResponse: submitResponse.isPending,
    uploadEvidence: uploadEvidence.mutateAsync,
    isUploadingEvidence: uploadEvidence.isPending,
    addComment: addComment.mutate,
    isAddingComment: addComment.isPending,
  };
}
