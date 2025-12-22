import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type Order = Tables<"orders"> & {
  customer_name?: string;
  merchant_business_name?: string;
  payment_status?: string;
  shipment_status?: string;
};

export type OrderEvent = Tables<"order_events">;
export type Payment = Tables<"payments">;
export type Tracking = Tables<"tracking">;

export interface OrderFilters {
  status?: string;
  paymentStatus?: string;
  shipmentStatus?: string;
  merchantId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  inProgress: number;
  delivered: number;
  completed: number;
  disputed: number;
  refunded: number;
  cancelled: number;
}

export function useAdminOrders() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    delivered: 0,
    completed: 0,
    disputed: 0,
    refunded: 0,
    cancelled: 0,
  });
  const [filters, setFilters] = useState<OrderFilters>({});
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "status">("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status as "pending" | "in_progress" | "delivered" | "completed" | "disputed" | "refunded" | "cancelled" | "draft" | "escrow_locked");
      }
      if (filters.merchantId) {
        query = query.eq("merchant_id", filters.merchantId);
      }
      if (filters.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      if (filters.amountMin !== undefined) {
        query = query.gte("amount", filters.amountMin);
      }
      if (filters.amountMax !== undefined) {
        query = query.lte("amount", filters.amountMax);
      }
      if (filters.search) {
        query = query.or(`id.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,merchant_name.ilike.%${filters.search}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "highest":
          query = query.order("amount", { ascending: false });
          break;
        case "status":
          query = query.order("status", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Enrich orders with additional data
      const enrichedOrders: Order[] = await Promise.all(
        (data || []).map(async (order) => {
          // Get payment status
          const { data: paymentData } = await supabase
            .from("payments")
            .select("status")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get shipment status
          const { data: trackingData } = await supabase
            .from("tracking")
            .select("status")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get customer name
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", order.customer_id)
            .single();

          return {
            ...order,
            customer_name: profileData?.full_name || "Unknown",
            merchant_business_name: order.merchant_name,
            payment_status: paymentData?.status || "pending",
            shipment_status: trackingData?.status || "not_shipped",
          };
        })
      );

      setOrders(enrichedOrders);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, page, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const [total, pending, inProgress, delivered, completed, disputed, refunded, cancelled] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "disputed"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "refunded"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
      ]);

      setStats({
        total: total.count || 0,
        pending: pending.count || 0,
        inProgress: inProgress.count || 0,
        delivered: delivered.count || 0,
        completed: completed.count || 0,
        disputed: disputed.count || 0,
        refunded: refunded.count || 0,
        cancelled: cancelled.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // Real-time subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel("admin-orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
          fetchStats();
        }
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("admin-orders-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const trackingChannel = supabase
      .channel("admin-orders-tracking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(trackingChannel);
    };
  }, [fetchOrders, fetchStats]);

  return {
    isLoading,
    orders,
    stats,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    page,
    setPage,
    totalPages,
    refetch: fetchOrders,
  };
}

export function useAdminOrderDetails(orderId: string) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch customer profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", orderData.customer_id)
        .single();

      // Fetch payment status
      const { data: paymentData } = await supabase
        .from("payments")
        .select("status")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Fetch shipment status
      const { data: trackingData } = await supabase
        .from("tracking")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setOrder({
        ...orderData,
        customer_name: profileData?.full_name || "Unknown",
        merchant_business_name: orderData.merchant_name,
        payment_status: paymentData?.status || "pending",
        shipment_status: trackingData?.status || "not_shipped",
      });
      setTracking(trackingData);

      // Fetch order events
      const { data: eventsData } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      setEvents(eventsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [orderId, toast]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Real-time subscriptions
  useEffect(() => {
    if (!orderId) return;

    const orderChannel = supabase
      .channel(`admin-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          fetchOrderDetails();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`admin-order-events-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` },
        () => {
          fetchOrderDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [orderId, fetchOrderDetails]);

  const updateOrderStatus = async (newStatus: string, reason?: string) => {
    if (!order) return;

    try {
      setIsSubmitting(true);

      const response = await supabase.functions.invoke("admin-order-action", {
        body: {
          orderId,
          action: "update_status",
          newStatus,
          reason,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      await fetchOrderDetails();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAdminNote = async (note: string) => {
    if (!order) return;

    try {
      setIsSubmitting(true);

      const response = await supabase.functions.invoke("admin-order-action", {
        body: {
          orderId,
          action: "add_note",
          note,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      await fetchOrderDetails();
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelOrder = async (reason: string) => {
    if (!order) return;

    try {
      setIsSubmitting(true);

      const response = await supabase.functions.invoke("admin-order-action", {
        body: {
          orderId,
          action: "cancel",
          reason,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });

      await fetchOrderDetails();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isLoading,
    isSubmitting,
    order,
    events,
    payments,
    tracking,
    updateOrderStatus,
    addAdminNote,
    cancelOrder,
    refetch: fetchOrderDetails,
  };
}

export default useAdminOrders;
