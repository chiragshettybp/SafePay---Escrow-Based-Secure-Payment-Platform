import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch merchant orders
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchantOrders", merchant?.user_id, statusFilter],
    queryFn: async () => {
      if (!merchant?.user_id) return [];

      let query = supabase
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

      const { data: allOrders, error } = await supabase
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
  });

  // Update shipment status mutation
  const updateShipmentMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status,
          delivered_at: status === "delivered" ? new Date().toISOString() : null,
        })
        .eq("id", orderId)
        .eq("merchant_id", merchant?.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
      toast.success("Order status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update order status");
      console.error(error);
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!merchant?.user_id) return;

    const channel = supabase
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
          queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
          queryClient.invalidateQueries({ queryKey: ["merchantMetrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant?.user_id, queryClient]);

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
