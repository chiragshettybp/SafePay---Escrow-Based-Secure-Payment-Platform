import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface KycRecord {
  id: string;
  user_id: string;
  full_legal_name: string | null;
  date_of_birth: string | null;
  address: string | null;
  pincode: string | null;
  country: string | null;
  id_number: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  address_proof_url: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateKycData {
  full_legal_name?: string;
  date_of_birth?: string;
  address?: string;
  pincode?: string;
  country?: string;
  id_number?: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  address_proof_url?: string;
  status?: string;
}

export function useKyc() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KYC record
  const {
    data: kycRecord,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("kyc_records")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as KycRecord | null;
    },
    enabled: !!user?.id,
  });

  // Create or update KYC record
  const updateKyc = useMutation({
    mutationFn: async (data: UpdateKycData) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if record exists
      const { data: existing } = await supabase
        .from("kyc_records")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("kyc_records")
          .update(data)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from("kyc_records")
          .insert({ user_id: user.id, ...data })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload KYC document
  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File;
      type: "id_front" | "id_back" | "selfie" | "address_proof";
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${type}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket
      const { data: urlData, error: urlError } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(fileName, 3600 * 24 * 365); // 1 year

      if (urlError) throw urlError;

      return { url: urlData.signedUrl, type };
    },
    onSuccess: async (data) => {
      // Update KYC record with document URL
      const urlField = `${data.type}_url`;
      await updateKyc.mutateAsync({ [urlField]: data.url });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit KYC for review
  const submitKyc = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("kyc_records")
        .update({ status: "submitted" })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc", user?.id] });
      toast({
        title: "KYC submitted",
        description: "Your KYC documents have been submitted for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription for KYC status updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("kyc-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kyc_records",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["kyc", user.id] });
          
          // Show toast for status changes
          if (payload.eventType === "UPDATE") {
            const newRecord = payload.new as KycRecord;
            if (newRecord.status === "approved") {
              toast({
                title: "KYC Approved",
                description: "Your identity has been verified successfully!",
              });
            } else if (newRecord.status === "rejected") {
              toast({
                title: "KYC Rejected",
                description: newRecord.rejection_reason || "Please resubmit your documents.",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "not_started":
        return "Not Started";
      case "incomplete":
        return "Incomplete";
      case "submitted":
        return "Under Review";
      case "pending_review":
        return "Pending Review";
      case "approved":
        return "Verified";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      case "submitted":
      case "pending_review":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return {
    kycRecord,
    isLoading,
    error,
    refetch,
    updateKyc,
    uploadDocument,
    submitKyc,
    getStatusLabel,
    getStatusColor,
  };
}
