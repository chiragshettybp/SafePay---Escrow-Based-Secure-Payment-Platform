import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "./useMerchantAuth";
import { toast } from "sonner";
import { useEffect } from "react";

export type ShipmentStatus = 
  | "pending" 
  | "packed" 
  | "shipped" 
  | "in_transit" 
  | "out_for_delivery" 
  | "delivered" 
  | "failed";

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  status: string;
  location: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    product_name: string;
    customer_id: string;
    amount: number;
    status: string;
    created_at: string;
  };
  customer?: {
    full_name: string | null;
  };
}

export interface ShipmentEvent {
  id: string;
  tracking_id: string;
  status: string;
  location: string | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface DeliveryProof {
  id: string;
  order_id: string;
  customer_id: string;
  file_path: string;
  notes: string | null;
  created_at: string;
}

export interface ShipmentFilters {
  status?: string;
  orderId?: string;
  carrier?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateShipmentData {
  order_id: string;
  carrier: string;
  tracking_number: string;
  estimated_delivery?: string;
  notes?: string;
}

export interface UpdateShipmentData {
  carrier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  notes?: string;
}

export interface UpdateStatusData {
  status: ShipmentStatus;
  notes?: string;
  location?: string;
}

export function useMerchantShipments(filters?: ShipmentFilters) {
  const { merchant } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Fetch all shipments for this merchant
  const {
    data: shipments,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["merchantShipments", merchant?.user_id, filters],
    queryFn: async () => {
      if (!merchant?.user_id) return [];

      let query = merchantSupabase
        .from("tracking")
        .select(`
          *,
          order:orders!inner(
            id,
            product_name,
            customer_id,
            amount,
            status,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      // Filter by merchant's orders
      query = query.eq("order.merchant_id", merchant.user_id);

      // Apply filters
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.orderId) {
        query = query.eq("order_id", filters.orderId);
      }
      if (filters?.carrier) {
        query = query.eq("carrier", filters.carrier);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      if (filters?.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,order.product_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch customer names for each shipment
      const shipmentsWithCustomers = await Promise.all(
        (data || []).map(async (shipment: any) => {
          const { data: profile } = await merchantSupabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", shipment.order?.customer_id)
            .maybeSingle();

          return {
            ...shipment,
            customer: profile,
          };
        })
      );

      return shipmentsWithCustomers as Shipment[];
    },
    enabled: !!merchant?.user_id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!merchant?.user_id) return;

    const channel = merchantSupabase
      .channel("shipments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracking",
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracking_events",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchantShipmentEvents"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_proofs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchantDeliveryProofs"] });
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [merchant?.user_id, refetch, queryClient]);

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (data: CreateShipmentData) => {
      if (!merchant?.user_id) throw new Error("Not authenticated");

      // Verify order belongs to merchant
      const { data: order, error: orderError } = await merchantSupabase
        .from("orders")
        .select("id, customer_id, status")
        .eq("id", data.order_id)
        .eq("merchant_id", merchant.user_id)
        .single();

      if (orderError || !order) throw new Error("Order not found");

      // Create tracking record
      const { data: tracking, error: trackingError } = await merchantSupabase
        .from("tracking")
        .insert({
          order_id: data.order_id,
          tracking_number: data.tracking_number,
          carrier: data.carrier,
          status: "shipped",
          estimated_delivery: data.estimated_delivery || null,
        })
        .select()
        .single();

      if (trackingError) throw trackingError;

      // Add initial event
      await merchantSupabase.from("tracking_events").insert({
        tracking_id: tracking.id,
        status: "shipped",
        description: data.notes || "Shipment created and dispatched",
      });

      // Update order status
      await merchantSupabase
        .from("orders")
        .update({ status: "in_progress" })
        .eq("id", data.order_id);

      return tracking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantShipments"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      toast.success("Shipment created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create shipment");
    },
  });

  // Update shipment mutation
  const updateShipmentMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: string; data: UpdateShipmentData }) => {
      const updateData: Record<string, unknown> = {};
      if (data.carrier) updateData.carrier = data.carrier;
      if (data.tracking_number) updateData.tracking_number = data.tracking_number;
      if (data.estimated_delivery) updateData.estimated_delivery = data.estimated_delivery;

      const { data: updated, error } = await merchantSupabase
        .from("tracking")
        .update(updateData)
        .eq("id", shipmentId)
        .select()
        .single();

      if (error) throw error;

      // Add update event
      if (data.notes) {
        await merchantSupabase.from("tracking_events").insert({
          tracking_id: shipmentId,
          status: "updated",
          description: data.notes,
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantShipments"] });
      queryClient.invalidateQueries({ queryKey: ["merchantShipment"] });
      toast.success("Shipment updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update shipment");
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: string; data: UpdateStatusData }) => {
      // Get shipment to find order
      const { data: shipment, error: fetchError } = await merchantSupabase
        .from("tracking")
        .select("order_id")
        .eq("id", shipmentId)
        .single();

      if (fetchError) throw fetchError;

      // Update tracking status
      const updateData: Record<string, unknown> = { status: data.status };
      if (data.location) updateData.location = data.location;

      const { error } = await merchantSupabase
        .from("tracking")
        .update(updateData)
        .eq("id", shipmentId);

      if (error) throw error;

      // Add status event
      await merchantSupabase.from("tracking_events").insert({
        tracking_id: shipmentId,
        status: data.status,
        description: data.notes || `Status updated to ${data.status}`,
        location: data.location || null,
      });

      // Update order status if delivered
      if (data.status === "delivered") {
        await merchantSupabase
          .from("orders")
          .update({ 
            status: "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", shipment.order_id);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantShipments"] });
      queryClient.invalidateQueries({ queryKey: ["merchantShipment"] });
      queryClient.invalidateQueries({ queryKey: ["merchantShipmentEvents"] });
      queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
      toast.success("Status updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ shipmentIds, action, data }: { 
      shipmentIds: string[]; 
      action: "status" | "carrier";
      data: { status?: ShipmentStatus; carrier?: string; notes?: string };
    }) => {
      const promises = shipmentIds.map(async (id) => {
        if (action === "status" && data.status) {
          return updateStatusMutation.mutateAsync({ 
            shipmentId: id, 
            data: { status: data.status, notes: data.notes } 
          });
        } else if (action === "carrier" && data.carrier) {
          return updateShipmentMutation.mutateAsync({
            shipmentId: id,
            data: { carrier: data.carrier },
          });
        }
      });

      await Promise.all(promises);
      return { success: true, count: shipmentIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["merchantShipments"] });
      toast.success(`Updated ${data.count} shipments`);
    },
    onError: (error) => {
      toast.error(error.message || "Bulk update failed");
    },
  });

  return {
    shipments: shipments || [],
    isLoading,
    error,
    refetch,
    createShipment: createShipmentMutation.mutate,
    updateShipment: updateShipmentMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    isCreating: createShipmentMutation.isPending,
    isUpdating: updateShipmentMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
  };
}

// Hook for single shipment details
export function useMerchantShipment(shipmentId: string | undefined) {
  const { merchant } = useMerchantAuth();
  const queryClient = useQueryClient();

  const {
    data: shipment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchantShipment", shipmentId],
    queryFn: async () => {
      if (!shipmentId || !merchant?.user_id) return null;

      const { data, error } = await merchantSupabase
        .from("tracking")
        .select(`
          *,
          order:orders!inner(
            id,
            product_name,
            product_description,
            customer_id,
            amount,
            status,
            created_at,
            expected_delivery_date
          )
        `)
        .eq("id", shipmentId)
        .eq("order.merchant_id", merchant.user_id)
        .single();

      if (error) throw error;

      // Fetch customer profile
      const { data: profile } = await merchantSupabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", (data as any).order?.customer_id)
        .maybeSingle();

      return { ...data, customer: profile } as Shipment & { customer: { full_name: string | null; phone: string | null } };
    },
    enabled: !!shipmentId && !!merchant?.user_id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!shipmentId) return;

    const channel = merchantSupabase
      .channel(`shipment-${shipmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracking",
          filter: `id=eq.${shipmentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchantShipment", shipmentId] });
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [shipmentId, queryClient]);

  return { shipment, isLoading, error };
}

// Hook for shipment events/timeline
export function useMerchantShipmentEvents(shipmentId: string | undefined) {
  const { merchant } = useMerchantAuth();

  const {
    data: events,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchantShipmentEvents", shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];

      const { data, error } = await merchantSupabase
        .from("tracking_events")
        .select("*")
        .eq("tracking_id", shipmentId)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      return data as ShipmentEvent[];
    },
    enabled: !!shipmentId && !!merchant?.user_id,
  });

  return { events: events || [], isLoading, error };
}

// Hook for delivery proofs
export function useMerchantShipmentProofs(orderId: string | undefined) {
  const { merchant } = useMerchantAuth();

  const {
    data: proofs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["merchantDeliveryProofs", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await merchantSupabase
        .from("delivery_proofs")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DeliveryProof[];
    },
    enabled: !!orderId && !!merchant?.user_id,
  });

  const getFileUrl = (filePath: string): string => {
    const { data } = merchantSupabase.storage
      .from("delivery-proofs")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return { proofs: proofs || [], isLoading, error, getFileUrl };
}

// Constants for carriers
export const CARRIERS = [
  "Blue Dart",
  "DTDC",
  "Delhivery",
  "FedEx",
  "Ekart",
  "Xpressbees",
  "Ecom Express",
  "India Post",
  "Shadowfax",
  "Other",
];

export const SHIPMENT_STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
];
