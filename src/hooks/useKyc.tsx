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
  verified_at: string | null;
  submission_count: number;
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

// Simple hash function for document number (SHA-256 would be ideal in production)
async function hashDocumentNumber(docNumber: string): Promise<string> {
  const normalized = docNumber.toUpperCase().replace(/\s/g, '');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

      // Hash document number if provided
      let dataWithHash = { ...data };
      if (data.id_number) {
        const docHash = await hashDocumentNumber(data.id_number);
        (dataWithHash as Record<string, unknown>).document_number_hash = docHash;
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from("kyc_records")
        .select("id, status, submission_count")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Check if re-upload is allowed
        if (existing.status === 'rejected' && (existing.submission_count || 0) >= 5) {
          throw new Error("Maximum re-upload attempts reached. Please contact support.");
        }

        // Update existing
        const { data: updated, error } = await supabase
          .from("kyc_records")
          .update(dataWithHash)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          // Check for document reuse error
          if (error.message?.includes('already registered')) {
            throw new Error("This document is already registered with another account.");
          }
          throw error;
        }
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from("kyc_records")
          .insert({ 
            user_id: user.id, 
            ...dataWithHash,
            submission_count: 1
          })
          .select()
          .single();

        if (error) {
          if (error.message?.includes('already registered')) {
            throw new Error("This document is already registered with another account.");
          }
          throw error;
        }
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

  // Upload KYC document - with history tracking
  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File;
      type: "id_front" | "id_back" | "selfie" | "address_proof";
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get current KYC record for submission count
      const { data: currentKyc } = await supabase
        .from("kyc_records")
        .select("id, submission_count")
        .eq("user_id", user.id)
        .maybeSingle();

      const submissionNumber = (currentKyc?.submission_count || 0) + 1;
      const fileExt = file.name.split(".").pop();
      // Use unique filename with submission number to preserve history
      const fileName = `${user.id}/${type}_v${submissionNumber}_${Date.now()}.${fileExt}`;

      // Upload to storage (NO upsert - create new file each time)
      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(fileName, file, { upsert: false });

      if (uploadError) {
        // If file exists, it's a duplicate - try with different timestamp
        if (uploadError.message?.includes('already exists')) {
          const retryFileName = `${user.id}/${type}_v${submissionNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${fileExt}`;
          const { error: retryError } = await supabase.storage
            .from("kyc-documents")
            .upload(retryFileName, file, { upsert: false });
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      // Get signed URL for private bucket
      const { data: urlData, error: urlError } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(fileName, 3600 * 24 * 365); // 1 year

      if (urlError) throw urlError;

      // Log document upload to history
      if (currentKyc?.id) {
        await supabase.from("kyc_document_history").insert({
          kyc_id: currentKyc.id,
          kyc_type: "customer",
          user_id: user.id,
          document_type: type,
          file_url: urlData.signedUrl,
          file_name: file.name,
          file_size: file.size,
          submission_number: submissionNumber,
        });
      }

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

  // Submit KYC for review - increments submission count
  const submitKyc = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get current record to check submission count
      const { data: current, error: fetchError } = await supabase
        .from("kyc_records")
        .select("submission_count, status")
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      // Check re-upload limit
      if ((current?.submission_count || 0) >= 5) {
        throw new Error("Maximum submission attempts (5) reached. Please contact support.");
      }

      const { data, error } = await supabase
        .from("kyc_records")
        .update({ 
          status: "submitted",
          submission_count: (current?.submission_count || 0) + 1
        })
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
