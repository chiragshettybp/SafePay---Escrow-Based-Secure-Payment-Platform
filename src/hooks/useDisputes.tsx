import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

export interface Dispute {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  documents: string[] | null;
  resolution_notes: string | null;
  issue_type: string | null;
  refund_amount: number | null;
  final_decision: string | null;
  merchant_responded: boolean | null;
  created_at: string;
  updated_at: string;
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

export interface DisputeComment {
  id: string;
  dispute_id: string;
  user_id: string;
  message: string;
  is_admin: boolean | null;
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

export interface CreateDisputeData {
  order_id: string;
  reason: string;
  description: string;
  issue_type: string;
  merchant_responded?: boolean;
  documents?: string[];
}

export const ISSUE_TYPES = [
  { value: "not_delivered", label: "Not Delivered" },
  { value: "wrong_item", label: "Wrong Item" },
  { value: "damaged", label: "Damaged" },
  { value: "misleading_product", label: "Misleading Product" },
  { value: "service_not_provided", label: "Service Not Provided" },
  { value: "other", label: "Other" },
];

export function useDisputes() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch all disputes for current user
  const { data: disputes, isLoading: isLoadingDisputes } = useQuery({
    queryKey: ["disputes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Dispute[];
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("disputes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["disputes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Create dispute
  const createDispute = useMutation({
    mutationFn: async (data: CreateDisputeData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: dispute, error } = await supabase
        .from("disputes")
        .insert({
          order_id: data.order_id,
          customer_id: user.id,
          reason: data.reason,
          description: data.description,
          issue_type: data.issue_type,
          merchant_responded: data.merchant_responded || false,
          status: "open",
          documents: data.documents || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Update order status to disputed
      await supabase
        .from("orders")
        .update({ status: "disputed" })
        .eq("id", data.order_id);

      // Create initial dispute update
      await supabase.from("dispute_updates").insert({
        dispute_id: dispute.id,
        title: "Dispute Submitted",
        description: `Issue type: ${ISSUE_TYPES.find(t => t.value === data.issue_type)?.label || data.issue_type}`,
        status: "open",
        created_by: "customer",
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Dispute Submitted",
        message: `Your dispute for order has been submitted and is under review.`,
        type: "dispute",
        order_id: data.order_id,
      });

      return dispute as Dispute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-metrics"] });
      toast({
        title: "Dispute Created",
        description: "Your dispute has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dispute.",
        variant: "destructive",
      });
    },
  });

  // Withdraw dispute and release escrow to merchant
  const withdrawDispute = useMutation({
    mutationFn: async ({ disputeId, orderId }: { disputeId: string; orderId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Call the release-escrow edge function to release funds AND close the dispute
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: {
          orderId,
          reason: 'dispute_withdrawn',
          disputeId
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (data?.alreadyReleased) {
        toast({
          title: "Dispute Withdrawn",
          description: "The dispute has been withdrawn. Order was already completed.",
        });
      } else {
        toast({
          title: "Dispute Withdrawn",
          description: "Your dispute has been withdrawn and payment released to the merchant.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw dispute.",
        variant: "destructive",
      });
    },
  });

  const uploadDocument = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("dispute-documents")
      .upload(fileName, file);

    if (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    return fileName;
  };

  // Close dispute and confirm delivery (release escrow)
  const closeDisputeAndConfirmDelivery = useMutation({
    mutationFn: async ({ disputeId, orderId }: { disputeId: string; orderId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Call the release-escrow edge function to close dispute AND release funds
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: {
          orderId,
          reason: 'close_dispute_confirm_delivery',
          disputeId
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (data?.alreadyReleased) {
        toast({
          title: "Dispute Closed",
          description: "The dispute has been closed. Order was already completed.",
        });
      } else {
        toast({
          title: "Delivery Confirmed",
          description: "Dispute closed and payment released to the merchant.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close dispute and confirm delivery.",
        variant: "destructive",
      });
    },
  });

  // Confirm delivery after dispute is resolved (release escrow)
  const confirmDeliveryAfterDispute = useMutation({
    mutationFn: async ({ disputeId, orderId }: { disputeId: string; orderId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Call the release-escrow edge function
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: {
          orderId,
          reason: 'delivery_confirmed',
          disputeId
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (data?.alreadyReleased) {
        toast({
          title: "Delivery Confirmed",
          description: "Order was already completed.",
        });
      } else {
        toast({
          title: "Delivery Confirmed",
          description: "Payment has been released to the merchant.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm delivery.",
        variant: "destructive",
      });
    },
  });

  return {
    disputes: disputes || [],
    isLoadingDisputes,
    createDispute: createDispute.mutate,
    isCreatingDispute: createDispute.isPending,
    withdrawDispute: withdrawDispute.mutate,
    isWithdrawing: withdrawDispute.isPending,
    closeDisputeAndConfirmDelivery: closeDisputeAndConfirmDelivery.mutate,
    isClosingDispute: closeDisputeAndConfirmDelivery.isPending,
    confirmDeliveryAfterDispute: confirmDeliveryAfterDispute.mutate,
    isConfirmingDelivery: confirmDeliveryAfterDispute.isPending,
    uploadDocument,
    ISSUE_TYPES,
  };
}

// Hook for single dispute details
export function useDisputeDetails(disputeId: string) {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const { data: dispute, isLoading: isLoadingDispute } = useQuery({
    queryKey: ["dispute", disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .eq("customer_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as Dispute | null;
    },
    enabled: !!user?.id && !!disputeId,
  });

  const { data: updates, isLoading: isLoadingUpdates } = useQuery({
    queryKey: ["dispute-updates", disputeId],
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

  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["dispute-comments", disputeId],
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

  const { data: files, isLoading: isLoadingFiles } = useQuery({
    queryKey: ["dispute-files", disputeId],
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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!disputeId) return;

    const disputeChannel = supabase
      .channel(`dispute-${disputeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
          filter: `id=eq.${disputeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dispute", disputeId] });
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
          queryClient.invalidateQueries({ queryKey: ["dispute-updates", disputeId] });
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
          queryClient.invalidateQueries({ queryKey: ["dispute-comments", disputeId] });
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
          queryClient.invalidateQueries({ queryKey: ["dispute-files", disputeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(disputeChannel);
    };
  }, [disputeId, queryClient]);

  // Add comment
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
      queryClient.invalidateQueries({ queryKey: ["dispute-comments", disputeId] });
      toast({
        title: "Comment Added",
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

  // Upload file
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${disputeId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("dispute-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("dispute-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("dispute_files").insert({
        dispute_id: disputeId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      });

      if (dbError) throw dbError;

      // Add update entry
      await supabase.from("dispute_updates").insert({
        dispute_id: disputeId,
        title: "Evidence Uploaded",
        description: `File "${file.name}" uploaded as additional evidence.`,
        created_by: "customer",
      });

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispute-files", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["dispute-updates", disputeId] });
      toast({
        title: "File Uploaded",
        description: "Your evidence has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    dispute,
    isLoadingDispute,
    updates: updates || [],
    isLoadingUpdates,
    comments: comments || [],
    isLoadingComments,
    files: files || [],
    isLoadingFiles,
    addComment: addComment.mutate,
    isAddingComment: addComment.isPending,
    uploadFile: uploadFile.mutateAsync,
    isUploadingFile: uploadFile.isPending,
  };
}
