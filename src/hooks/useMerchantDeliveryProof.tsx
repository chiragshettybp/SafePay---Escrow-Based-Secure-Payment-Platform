import { useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "./useMerchantAuth";
import { toast } from "sonner";

export function useMerchantDeliveryProof(orderId: string | undefined) {
  const { merchant } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Upload file to storage
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!orderId) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await merchantSupabase.storage
      .from("delivery-proofs")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    return fileName;
  };

  // Save delivery proof mutation
  const saveProofMutation = useMutation({
    mutationFn: async ({ files, notes }: { files: File[]; notes?: string }) => {
      if (!orderId || !merchant?.user_id) throw new Error("Missing order ID or merchant");

      // First verify this order belongs to the merchant
      const { data: order, error: orderCheckError } = await merchantSupabase
        .from("orders")
        .select("id, customer_id, status")
        .eq("id", orderId)
        .eq("merchant_id", merchant.user_id)
        .single();

      if (orderCheckError || !order) {
        throw new Error("Order not found or access denied");
      }

      // Upload all files and collect paths
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const path = await uploadFile(file);
        if (path) uploadedPaths.push(path);
      }

      if (uploadedPaths.length === 0) {
        throw new Error("No files were uploaded");
      }

      // Insert delivery proof records
      const proofRecords = uploadedPaths.map((filePath) => ({
        order_id: orderId,
        customer_id: order.customer_id,
        file_path: filePath,
        notes: notes || null,
      }));

      const { error: insertError } = await merchantSupabase
        .from("delivery_proofs")
        .insert(proofRecords);

      if (insertError) throw insertError;

      // Update order status to delivered if not already
      if (order.status !== "delivered" && order.status !== "completed") {
        const { error: updateError } = await merchantSupabase
          .from("orders")
          .update({ 
            status: "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("merchant_id", merchant.user_id);

        if (updateError) console.error("Failed to update order status:", updateError);
      }

      return uploadedPaths;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantDeliveryProofs"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrderDetails"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
      toast.success("Delivery proof uploaded successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload delivery proof");
      console.error(error);
    },
  });

  // Get public URL for a file
  const getFileUrl = (filePath: string): string => {
    const { data } = merchantSupabase.storage
      .from("delivery-proofs")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    saveProof: saveProofMutation.mutate,
    isSaving: saveProofMutation.isPending,
    getFileUrl,
  };
}
