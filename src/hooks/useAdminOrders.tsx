import { useState, useEffect, useCallback, useRef } from "react";
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

  // Guards and refs for preventing race conditions
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingOrdersRef = useRef(false);
  const isFetchingStatsRef = useRef(false);
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

  const fetchOrders = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingOrdersRef.current) return;
    isFetchingOrdersRef.current = true;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" });

      // Apply filters with proper type casting
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
      if (!mountedRef.current) return;

      // Enrich orders with additional data (with error handling)
      const enrichedOrders: Order[] = await Promise.all(
        (data || []).map(async (order) => {
          try {
            // Get payment status
            const { data: paymentData } = await supabase
              .from("payments")
              .select("status")
              .eq("order_id", order.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get shipment status
            const { data: trackingData } = await supabase
              .from("tracking")
              .select("status")
              .eq("order_id", order.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get customer name
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", order.customer_id)
              .maybeSingle();

            return {
              ...order,
              customer_name: profileData?.full_name || "Unknown",
              merchant_business_name: order.merchant_name,
              payment_status: paymentData?.status || "pending",
              shipment_status: trackingData?.status || "not_shipped",
            };
          } catch (enrichError) {
            console.error(`Error enriching order ${order.id}:`, enrichError);
            return {
              ...order,
              customer_name: "Unknown",
              merchant_business_name: order.merchant_name,
              payment_status: "pending",
              shipment_status: "not_shipped",
            };
          }
        })
      );

      if (!mountedRef.current) return;
      setOrders(enrichedOrders);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      isFetchingOrdersRef.current = false;
    }
  }, [filters, sortBy, page, toast]);

  const fetchStats = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingStatsRef.current) return;
    isFetchingStatsRef.current = true;

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

      if (!mountedRef.current) return;

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
    } finally {
      isFetchingStatsRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // Debounced refetch function
  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchOrders();
        fetchStats();
      }
    }, 1000);
  }, [fetchOrders, fetchStats]);

  // Real-time subscriptions with debouncing
  useEffect(() => {
    const ordersChannel = supabase
      .channel("admin-orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("admin-orders-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    const trackingChannel = supabase
      .channel("admin-orders-tracking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking" },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(trackingChannel);
    };
  }, [debouncedRefetch]);

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

  // Guards and refs
  const isFetchingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const mountedRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setIsLoading(true);

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      if (!mountedRef.current) return;

      // Fetch customer profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", orderData.customer_id)
        .maybeSingle();

      // Fetch payment status
      const { data: paymentData } = await supabase
        .from("payments")
        .select("status")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch shipment status
      const { data: trackingData } = await supabase
        .from("tracking")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mountedRef.current) return;

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

      if (!mountedRef.current) return;
      setEvents(eventsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (!mountedRef.current) return;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [orderId, toast]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Debounced refetch
  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchOrderDetails();
      }
    }, 1000);
  }, [fetchOrderDetails]);

  // Real-time subscriptions with debouncing
  useEffect(() => {
    if (!orderId) return;

    const orderChannel = supabase
      .channel(`admin-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`admin-order-events-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [orderId, debouncedRefetch]);

  const updateOrderStatus = async (newStatus: string, reason?: string) => {
    if (!order) return;
    
    // Prevent concurrent submissions
    if (isSubmittingRef.current) {
      toast({
        title: "Please wait",
        description: "An action is already in progress",
      });
      return;
    }
    
    isSubmittingRef.current = true;

    try {
      setIsSubmitting(true);

      // Generate idempotency key
      const idempotencyKey = `admin-order-${orderId}-${newStatus}-${Date.now()}`;

      const response = await supabase.functions.invoke("admin-order-action", {
        body: {
          orderId,
          action: "update_status",
          newStatus,
          reason,
          idempotencyKey,
        },
      });

      if (response.error) throw response.error;

      if (mountedRef.current) {
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus}`,
        });

        await fetchOrderDetails();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to update order status",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
      isSubmittingRef.current = false;
    }
  };

  const addAdminNote = async (note: string) => {
    if (!order) return;
    
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

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

      if (mountedRef.current) {
        toast({
          title: "Success",
          description: "Note added successfully",
        });

        await fetchOrderDetails();
      }
    } catch (error) {
      console.error("Error adding note:", error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to add note",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
      isSubmittingRef.current = false;
    }
  };

  const cancelOrder = async (reason: string) => {
    if (!order) return;
    
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

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

      if (mountedRef.current) {
        toast({
          title: "Success",
          description: "Order cancelled successfully",
        });

        await fetchOrderDetails();
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to cancel order",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
      isSubmittingRef.current = false;
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
