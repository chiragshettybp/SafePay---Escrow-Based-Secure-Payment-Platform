import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "./useMerchantAuth";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface MerchantOrder {
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
}

export interface MerchantMetrics {
  totalOrders: number;
  pendingShipment: number;
  awaitingConfirmation: number;
  disputes: number;
  completedOrders: number;
  refundedOrders: number;
  totalEarnings: number;
}

export function useMerchantOrders(statusFilter?: OrderStatus | null) {
  const { merchant } = useMerchantAuth();
  const queryClient = useQueryClient();
  
  // Debounce and guard refs
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

  // Fetch merchant orders
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchantOrders", merchant?.user_id, statusFilter],
    queryFn: async () => {
      if (!merchant?.user_id) return [];

      let query = merchantSupabase
        .from("orders")
        .select("*")
        .eq("merchant_id", merchant.user_id)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MerchantOrder[];
    },
    enabled: !!merchant?.user_id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 30000,
  });

  // Fetch merchant metrics
  const { data: metrics } = useQuery({
    queryKey: ["merchantMetrics", merchant?.user_id],
    queryFn: async () => {
      if (!merchant?.user_id) {
        return {
          totalOrders: 0,
          pendingShipment: 0,
          awaitingConfirmation: 0,
          disputes: 0,
          completedOrders: 0,
          refundedOrders: 0,
          totalEarnings: 0,
        };
      }

      const { data: allOrders, error } = await merchantSupabase
        .from("orders")
        .select("*")
        .eq("merchant_id", merchant.user_id);

      if (error) throw error;

      const ordersList = allOrders || [];
      const pendingShipment = ordersList.filter(
        (o) => o.status === "pending" || o.status === "escrow_locked"
      ).length;
      const awaitingConfirmation = ordersList.filter(
        (o) => o.status === "delivered"
      ).length;
      const disputes = ordersList.filter((o) => o.status === "disputed").length;
      const completedOrders = ordersList.filter(
        (o) => o.status === "completed"
      ).length;
      const refundedOrders = ordersList.filter(
        (o) => o.status === "refunded"
      ).length;
      const totalEarnings = ordersList
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + Number(o.amount), 0);

      return {
        totalOrders: ordersList.length,
        pendingShipment,
        awaitingConfirmation,
        disputes,
        completedOrders,
        refundedOrders,
        totalEarnings,
      };
    },
    enabled: !!merchant?.user_id,
    retry: 2,
    staleTime: 30000,
  });

  // Valid status transitions for merchants
  const validStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
    draft: [],
    pending: ['in_progress'],
    escrow_locked: ['in_progress'],
    in_progress: ['delivered'],
    delivered: [], // Only customer can confirm (to completed)
    completed: [],
    disputed: [],
    refunded: [],
    cancelled: [],
  };

  // Update shipment status mutation with validation
  const updateShipmentMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      if (!merchant?.user_id) throw new Error("Not authenticated");
      
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
        const allowedTransitions = validStatusTransitions[currentStatus] || [];
        
        if (!allowedTransitions.includes(status)) {
          throw new Error(`Invalid status transition from ${currentStatus} to ${status}`);
        }

        // Generate idempotency metadata
        const updateMetadata = {
          previous_status: currentStatus,
          new_status: status,
          updated_by: merchant.user_id,
          timestamp: new Date().toISOString()
        };

        const updateData: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
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
          .eq("status", currentStatus) // Ensure no race condition
          .select()
          .single();

        if (error) {
          // Check if it was a race condition
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
          metadata: updateMetadata,
        });

        return data;
      } finally {
        isUpdatingRef.current = false;
      }
    },
    onSuccess: () => {
      if (!mountedRef.current) return;
      
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
      toast.success("Order status updated successfully");
    },
    onError: (error: Error) => {
      if (!mountedRef.current) return;
      
      toast.error(error.message || "Failed to update order status");
      console.error(error);
    },
  });

  // Debounced refetch function
  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
        queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
      }
    }, 1000);
  }, [queryClient]);

  // Real-time subscription with debouncing
  useEffect(() => {
    if (!merchant?.user_id) return;

    const channel = merchantSupabase
      .channel("merchant-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `merchant_id=eq.${merchant.user_id}`,
        },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [merchant?.user_id, debouncedRefetch]);

  return {
    orders,
    metrics: metrics || {
      totalOrders: 0,
      pendingShipment: 0,
      awaitingConfirmation: 0,
      disputes: 0,
      completedOrders: 0,
      refundedOrders: 0,
      totalEarnings: 0,
    },
    isLoading,
    error,
    updateShipmentStatus: updateShipmentMutation.mutate,
    isUpdating: updateShipmentMutation.isPending,
  };
}
