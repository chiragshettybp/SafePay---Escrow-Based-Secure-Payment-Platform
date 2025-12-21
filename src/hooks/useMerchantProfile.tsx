import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { toast } from "@/hooks/use-toast";

export interface MerchantKyc {
  id: string;
  merchant_id: string;
  legal_business_name: string | null;
  business_type: string | null;
  gst_number: string | null;
  pan_number: string | null;
  registered_address: string | null;
  owner_name: string | null;
  owner_dob: string | null;
  owner_phone: string | null;
  additional_notes: string | null;
  status: "not_started" | "in_progress" | "submitted" | "under_review" | "verified" | "rejected";
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantKycDocument {
  id: string;
  merchant_id: string;
  kyc_id: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantProfileData {
  business_name: string;
  email: string;
  phone: string | null;
  category: string | null;
  address: string | null;
  gst_number: string | null;
  logo_url: string | null;
}

// Hook for merchant profile management
export function useMerchantProfile() {
  const { user, merchant, refreshMerchant } = useMerchantAuth();
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<MerchantProfileData>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("merchants")
        .update(data)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshMerchant();
      toast({ title: "Profile updated successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to update profile",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("merchant-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("merchant-logos")
        .getPublicUrl(fileName);

      // Update merchant record
      const { error: updateError } = await supabase
        .from("merchants")
        .update({ logo_url: urlData.publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      refreshMerchant();
      toast({ title: "Logo uploaded successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to upload logo",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return {
    merchant,
    updateProfile: updateProfile.mutate,
    uploadLogo: uploadLogo.mutate,
    isUpdating: updateProfile.isPending,
    isUploadingLogo: uploadLogo.isPending,
  };
}

// Hook for merchant KYC
export function useMerchantKyc() {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  const { data: kyc, isLoading, error, refetch } = useQuery({
    queryKey: ["merchant-kyc", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("merchant_kyc")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as MerchantKyc | null;
    },
    enabled: !!user?.id,
  });

  const saveKyc = useMutation({
    mutationFn: async (data: Partial<MerchantKyc>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("merchant_kyc")
        .select("id")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("merchant_kyc")
          .update({ ...data, status: data.status || "in_progress" })
          .eq("merchant_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("merchant_kyc")
          .insert({ merchant_id: user.id, ...data, status: data.status || "in_progress" });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-kyc"] });
      toast({ title: "KYC details saved" });
    },
    onError: (err) => {
      toast({
        title: "Failed to save KYC details",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const submitKyc = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("merchant_kyc")
        .update({ status: "submitted" })
        .eq("merchant_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-kyc"] });
      toast({ title: "Verification submitted successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to submit verification",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("merchant-kyc-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_kyc",
          filter: `merchant_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("KYC update:", payload);
          queryClient.invalidateQueries({ queryKey: ["merchant-kyc"] });

          if (payload.eventType === "UPDATE") {
            const newData = payload.new as MerchantKyc;
            if (newData.status === "verified") {
              toast({ title: "🎉 Your verification has been approved!" });
            } else if (newData.status === "rejected") {
              toast({
                title: "Verification rejected",
                description: newData.rejection_reason || "Please check the details",
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
  }, [user?.id, queryClient]);

  return {
    kyc,
    isLoading,
    error,
    refetch,
    saveKyc: saveKyc.mutate,
    submitKyc: submitKyc.mutate,
    isSaving: saveKyc.isPending,
    isSubmitting: submitKyc.isPending,
  };
}

// Hook for KYC documents
export function useMerchantKycDocuments() {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  const { data: documents, isLoading, error, refetch } = useQuery({
    queryKey: ["merchant-kyc-documents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("merchant_kyc_documents")
        .select("*")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MerchantKycDocument[];
    },
    enabled: !!user?.id,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      documentType,
      kycId,
    }: {
      file: File;
      documentType: string;
      kycId?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${documentType}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("merchant-kyc")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get URL
      const { data: urlData } = supabase.storage
        .from("merchant-kyc")
        .getPublicUrl(fileName);

      // Insert document record
      const { error: insertError } = await supabase
        .from("merchant_kyc_documents")
        .insert({
          merchant_id: user.id,
          kyc_id: kycId,
          document_type: documentType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
        });

      if (insertError) throw insertError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-kyc-documents"] });
      toast({ title: "Document uploaded successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to upload document",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("merchant_kyc_documents")
        .delete()
        .eq("id", documentId)
        .eq("merchant_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-kyc-documents"] });
      toast({ title: "Document removed" });
    },
    onError: (err) => {
      toast({
        title: "Failed to remove document",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const getDocumentsByType = (type: string) => {
    return documents?.filter((d) => d.document_type === type) || [];
  };

  return {
    documents: documents || [],
    isLoading,
    error,
    refetch,
    uploadDocument: uploadDocument.mutate,
    deleteDocument: deleteDocument.mutate,
    isUploading: uploadDocument.isPending,
    isDeleting: deleteDocument.isPending,
    getDocumentsByType,
  };
}
