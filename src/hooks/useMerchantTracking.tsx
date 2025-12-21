import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "./useMerchantAuth";
import { toast } from "sonner";

export interface TrackingFormData {
  tracking_number: string;
  carrier: string;
  estimated_delivery?: string;
  notes?: string;
}

export interface TrackingRecord {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  status: string;
  location: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

export function useMerchantTracking(orderId: string | undefined) {
  const { merchant } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Fetch existing tracking for this order
  const {
    data: tracking,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchantTracking", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await merchantSupabase
        .from("tracking")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data as TrackingRecord | null;
    },
    enabled: !!orderId,
  });

  // Add tracking mutation
  const addTrackingMutation = useMutation({
    mutationFn: async (formData: TrackingFormData) => {
      if (!orderId || !merchant?.user_id) throw new Error("Missing order ID or merchant");

      // Insert tracking record
      const { data: trackingData, error: trackingError } = await merchantSupabase
        .from("tracking")
        .insert({
          order_id: orderId,
          tracking_number: formData.tracking_number,
          carrier: formData.carrier,
          status: "in_transit",
          estimated_delivery: formData.estimated_delivery || null,
        })
        .select()
        .single();

      if (trackingError) throw trackingError;

      // Add initial tracking event
      const { error: eventError } = await merchantSupabase
        .from("tracking_events")
        .insert({
          tracking_id: trackingData.id,
          status: "shipped",
          description: formData.notes || "Package shipped and in transit",
          location: null,
        });

      if (eventError) console.error("Failed to create tracking event:", eventError);

      // Update order status to in_progress
      const { error: orderError } = await merchantSupabase
        .from("orders")
        .update({ status: "in_progress" })
        .eq("id", orderId)
        .eq("merchant_id", merchant.user_id);

      if (orderError) throw orderError;

      return trackingData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantTracking"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrderDetails"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrderTracking"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
      toast.success("Tracking added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add tracking");
      console.error(error);
    },
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ trackingId, formData }: { trackingId: string; formData: Partial<TrackingFormData> & { status?: string; location?: string } }) => {
      if (!trackingId) throw new Error("Missing tracking ID");

      const updateData: Record<string, unknown> = {};
      if (formData.tracking_number) updateData.tracking_number = formData.tracking_number;
      if (formData.carrier) updateData.carrier = formData.carrier;
      if (formData.estimated_delivery) updateData.estimated_delivery = formData.estimated_delivery;
      if (formData.status) updateData.status = formData.status;
      if (formData.location !== undefined) updateData.location = formData.location;

      const { data, error } = await merchantSupabase
        .from("tracking")
        .update(updateData)
        .eq("id", trackingId)
        .select()
        .single();

      if (error) throw error;

      // Add tracking event for the update
      if (formData.status || formData.location) {
        await merchantSupabase
          .from("tracking_events")
          .insert({
            tracking_id: trackingId,
            status: formData.status || "updated",
            description: formData.notes || "Tracking information updated",
            location: formData.location || null,
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantTracking"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrderDetails"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrderTracking"] });
      queryClient.invalidateQueries({ queryKey: ["merchantTrackingEvents"] });
      toast.success("Tracking updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update tracking");
      console.error(error);
    },
  });

  return {
    tracking,
    isLoading,
    error,
    addTracking: addTrackingMutation.mutate,
    updateTracking: updateTrackingMutation.mutate,
    isAdding: addTrackingMutation.isPending,
    isUpdating: updateTrackingMutation.isPending,
  };
}
