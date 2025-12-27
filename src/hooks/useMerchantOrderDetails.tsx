import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "./useMerchantAuth";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface MerchantOrderDetails {
  id: string;
  customer_id: string;
  merchant_id: string;
  merchant_name: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  status: OrderStatus;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface OrderTracking {
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

export interface TrackingEvent {
  id: string;
  tracking_id: string;
  status: string;
  location: string | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface DeliveryProof {
  id: string;
  order_id: string;
  customer_id: string;
  file_path: string;
  notes: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Valid status transitions for merchants
const validMerchantTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft: [],
  pending: ['in_progress'],
  escrow_locked: ['in_progress'],
  in_progress: ['delivered'],
  delivered: [], // Only customer can confirm
  completed: [],
  disputed: [],
  refunded: [],
  cancelled: [],
};

export function useMerchantOrderDetails(orderId: string | undefined) {
  const { merchant } = useMerchantAuth();
  const queryClient = useQueryClient();
  
  // Guards and refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Fetch order details with customer info
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useQuery({
    queryKey: ["merchantOrderDetails", orderId],
    queryFn: async () => {
      if (!orderId || !merchant?.user_id) return null;

      // First get the order
      const { data: orderData, error: orderError } = await merchantSupabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("merchant_id", merchant.user_id)
        .single();

      if (orderError) throw orderError;

      // Then try to get customer profile
      let customerName: string | null = null;
      let customerPhone: string | null = null;

      if (orderData?.customer_id) {
        const { data: profileData } = await merchantSupabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", orderData.customer_id)
          .maybeSingle();

        if (profileData) {
          customerName = profileData.full_name;
          customerPhone = profileData.phone;
        }
      }

      return {
        ...orderData,
        customer_name: customerName,
        customer_phone: customerPhone,
      } as MerchantOrderDetails;
    },
    enabled: !!orderId && !!merchant?.user_id,
    retry: 2,
    staleTime: 30000,
  });

  // Fetch tracking info
  const {
    data: tracking,
    isLoading: trackingLoading,
  } = useQuery({
    queryKey: ["merchantOrderTracking", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await merchantSupabase
        .from("tracking")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data as OrderTracking | null;
    },
    enabled: !!orderId,
    retry: 2,
    staleTime: 30000,
  });

  // Fetch tracking events
  const {
    data: trackingEvents = [],
    isLoading: trackingEventsLoading,
  } = useQuery({
    queryKey: ["merchantTrackingEvents", tracking?.id],
    queryFn: async () => {
      if (!tracking?.id) return [];

      const { data, error } = await merchantSupabase
        .from("tracking_events")
        .select("*")
        .eq("tracking_id", tracking.id)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      return data as TrackingEvent[];
    },
    enabled: !!tracking?.id,
    retry: 2,
    staleTime: 30000,
  });

  // Fetch order events (timeline)
  const {
    data: orderEvents = [],
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ["merchantOrderEvents", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await merchantSupabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as OrderEvent[];
    },
    enabled: !!orderId,
    retry: 2,
    staleTime: 30000,
  });

  // Fetch delivery proofs
  const {
    data: deliveryProofs = [],
    isLoading: proofsLoading,
  } = useQuery({
    queryKey: ["merchantDeliveryProofs", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await merchantSupabase
        .from("delivery_proofs")
        .select("*")
        .eq("order_id", orderId);

      if (error) throw error;
      return data as DeliveryProof[];
    },
    enabled: !!orderId,
    retry: 2,
    staleTime: 30000,
  });

  // Fetch dispute info
  const {
    data: dispute,
    isLoading: disputeLoading,
  } = useQuery({
    queryKey: ["merchantOrderDispute", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await merchantSupabase
        .from("disputes")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data as Dispute | null;
    },
    enabled: !!orderId,
    retry: 2,
    staleTime: 30000,
  });

  // Update order status mutation with validation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      if (!orderId || !merchant?.user_id) throw new Error("Missing data");
      
      // Prevent concurrent updates
      if (isUpdatingRef.current) {
        throw new Error("An update is already in progress");
      }
      
      isUpdatingRef.current = true;

      try {
        // First, fetch current order to validate transition
        const { data: currentOrder, error: fetchError } = await merchantSupabase
          .from("orders")
          .select("id, status, merchant_id")
          .eq("id", orderId)
          .eq("merchant_id", merchant.user_id)
          .single();

        if (fetchError || !currentOrder) {
          throw new Error("Order not found or access denied");
        }

        // Validate status transition
        const currentStatus = currentOrder.status as OrderStatus;
        const allowedTransitions = validMerchantTransitions[currentStatus] || [];
        
        if (!allowedTransitions.includes(status)) {
          throw new Error(`Invalid status transition from ${currentStatus} to ${status}`);
        }

        const updateData: Record<string, unknown> = { 
          status,
          updated_at: new Date().toISOString() 
        };
        
        if (status === "delivered") {
          updateData.delivered_at = new Date().toISOString();
        }

        // Atomic update with status check (optimistic locking)
        const { error, data } = await merchantSupabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId)
          .eq("merchant_id", merchant.user_id)
          .eq("status", currentStatus) // Prevent race condition
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error("Order status has changed. Please refresh and try again.");
          }
          throw error;
        }

        // Create order event for audit trail
        await merchantSupabase.from("order_events").insert({
          order_id: orderId,
          event_type: "merchant_status_update",
          title: `Status updated to ${status}`,
          description: `Merchant updated order status from ${currentStatus} to ${status}`,
          metadata: {
            previous_status: currentStatus,
            new_status: status,
            updated_by: merchant.user_id,
            timestamp: new Date().toISOString()
          },
        });

        return data;
      } finally {
        isUpdatingRef.current = false;
      }
    },
    onSuccess: () => {
      if (!mountedRef.current) return;
      
      queryClient.invalidateQueries({ queryKey: ["merchantOrderDetails"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrderEvents"] });
      toast.success("Order status updated");
    },
    onError: (error: Error) => {
      if (!mountedRef.current) return;
      
      toast.error(error.message || "Failed to update status");
      console.error(error);
    },
  });

  // Debounced invalidation function
  const debouncedInvalidate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current && orderId) {
        queryClient.invalidateQueries({ queryKey: ["merchantOrderDetails", orderId] });
        queryClient.invalidateQueries({ queryKey: ["merchantOrderEvents", orderId] });
        queryClient.invalidateQueries({ queryKey: ["merchantOrderTracking", orderId] });
        queryClient.invalidateQueries({ queryKey: ["merchantOrderDispute", orderId] });
        queryClient.invalidateQueries({ queryKey: ["merchantDeliveryProofs", orderId] });
      }
    }, 1000);
  }, [queryClient, orderId]);

  // Realtime subscription with debouncing
  useEffect(() => {
    if (!orderId) return;

    const channel = merchantSupabase
      .channel(`merchant-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          debouncedInvalidate();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking", filter: `order_id=eq.${orderId}` },
        () => {
          debouncedInvalidate();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes", filter: `order_id=eq.${orderId}` },
        () => {
          debouncedInvalidate();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_proofs", filter: `order_id=eq.${orderId}` },
        () => {
          debouncedInvalidate();
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [orderId, debouncedInvalidate]);

  return {
    order,
    tracking,
    trackingEvents,
    orderEvents,
    deliveryProofs,
    dispute,
    isLoading: orderLoading || trackingLoading || eventsLoading || proofsLoading || disputeLoading || trackingEventsLoading,
    error: orderError,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}
