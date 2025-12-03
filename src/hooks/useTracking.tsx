import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";

export interface Tracking {
  id: string;
  order_id: string;
  status: string;
  location: string | null;
  carrier: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  tracking_id: string;
  status: string;
  location: string | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export function useTracking(orderId: string) {
  const { user } = useSupabaseAuth();

  const { data: tracking, isLoading: trackingLoading } = useQuery({
    queryKey: ['tracking', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as Tracking | null;
    },
    enabled: !!user?.id && !!orderId,
  });

  const { data: trackingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['tracking-events', tracking?.id],
    queryFn: async () => {
      if (!tracking?.id) return [];
      
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('tracking_id', tracking.id)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      return data as TrackingEvent[];
    },
    enabled: !!tracking?.id,
  });

  return {
    tracking,
    trackingEvents: trackingEvents || [],
    isLoading: trackingLoading || eventsLoading,
  };
}

export function useDeliveryProof() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const uploadProof = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('delivery-proofs')
      .upload(fileName, file);

    if (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload proof image. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    return fileName;
  };

  const saveDeliveryProof = useMutation({
    mutationFn: async ({ orderId, filePath, notes }: { orderId: string; filePath: string; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('delivery_proofs')
        .insert({
          order_id: orderId,
          customer_id: user.id,
          file_path: filePath,
          notes: notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-proofs'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save delivery proof. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    uploadProof,
    saveDeliveryProof: saveDeliveryProof.mutate,
    isSaving: saveDeliveryProof.isPending,
  };
}
