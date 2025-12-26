import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface AdminRefund {
  id: string;
  order_id: string;
  payment_id: string | null;
  customer_id: string;
  amount: number;
  status: string;
  reason: string;
  refund_type: string | null;
  razorpay_refund_id: string | null;
  initiated_by: string | null;
  admin_id: string | null;
  admin_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  credited_at: string | null;
  orders?: {
    id: string;
    product_name: string;
    merchant_name: string;
    merchant_id: string;
    amount: number;
    status: string;
  };
  customer?: {
    full_name: string | null;
    phone: string | null;
  };
  payment?: {
    id: string;
    razorpay_payment_id: string | null;
    gateway_status: string | null;
    amount: number;
  };
}

export interface RefundFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export interface RefundDetails extends AdminRefund {
  order: {
    id: string;
    product_name: string;
    product_description: string | null;
    merchant_name: string;
    merchant_id: string;
    amount: number;
    status: string;
    created_at: string;
  };
  customer: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  payment: {
    id: string;
    razorpay_payment_id: string | null;
    razorpay_order_id: string | null;
    gateway_status: string | null;
    amount: number;
    status: string;
  } | null;
  events: Array<{
    id: string;
    event_type: string;
    title: string;
    description: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>;
}

const SUPABASE_URL = "https://sgpefhfmcykwtfqfwzcq.supabase.co";

export function useAdminRefunds(filters?: RefundFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch refunds with filters
  const { data: refunds, isLoading, error } = useQuery({
    queryKey: ["admin-refunds", filters],
    queryFn: async () => {
      let query = supabase
        .from("refunds")
        .select(`
          *,
          orders!inner(id, product_name, merchant_name, merchant_id, amount, status)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Fetch customer details
      const enrichedRefunds = await Promise.all(
        (data || []).map(async (refund) => {
          const [customerResult, paymentResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("user_id", refund.customer_id)
              .single(),
            refund.payment_id
              ? supabase
                  .from("payments")
                  .select("id, razorpay_payment_id, gateway_status, amount")
                  .eq("id", refund.payment_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...refund,
            customer: customerResult.data,
            payment: paymentResult.data,
          };
        })
      );

      return enrichedRefunds as AdminRefund[];
    },
  });

  // Fetch single refund details
  const useRefundDetails = (refundId: string) => {
    return useQuery({
      queryKey: ["admin-refund-details", refundId],
      queryFn: async () => {
        // Fetch refund
        const { data: refund, error: refundError } = await supabase
          .from("refunds")
          .select("*")
          .eq("id", refundId)
          .single();

        if (refundError) throw refundError;

        // Fetch related data
        const [orderResult, customerResult, paymentResult, eventsResult] = await Promise.all([
          supabase
            .from("orders")
            .select("id, product_name, product_description, merchant_name, merchant_id, amount, status, created_at")
            .eq("id", refund.order_id)
            .single(),
          supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .eq("user_id", refund.customer_id)
            .single(),
          refund.payment_id
            ? supabase
                .from("payments")
                .select("id, razorpay_payment_id, razorpay_order_id, gateway_status, amount, status")
                .eq("id", refund.payment_id)
                .single()
            : Promise.resolve({ data: null }),
          supabase
            .from("refund_events")
            .select("*")
            .eq("refund_id", refundId)
            .order("created_at", { ascending: true }),
        ]);

        return {
          ...refund,
          order: orderResult.data,
          customer: { id: customerResult.data?.user_id, ...customerResult.data },
          payment: paymentResult.data,
          events: eventsResult.data || [],
        } as RefundDetails;
      },
      enabled: !!refundId,
    });
  };

  // Retry refund mutation
  const retryRefund = useMutation({
    mutationFn: async ({ refundId }: { refundId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      // Get refund details first
      const { data: refund } = await supabase
        .from("refunds")
        .select("payment_id, amount, reason, refund_type")
        .eq("id", refundId)
        .single();

      if (!refund?.payment_id) throw new Error("No payment associated with refund");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/initiate-refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ",
        },
        body: JSON.stringify({
          paymentId: refund.payment_id,
          reason: `Retry: ${refund.reason}`,
          refundType: refund.refund_type || "full",
          refundAmount: refund.amount,
          adminNotes: `Retry of refund ${refundId}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Retry failed");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      queryClient.invalidateQueries({ queryKey: ["admin-refund-details"] });
      toast({
        title: "Refund Retry Initiated",
        description: "A new refund request has been submitted to Razorpay.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-refunds-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "refunds" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
          queryClient.invalidateQueries({ queryKey: ["admin-refund-details"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Metrics
  const metrics = {
    total: refunds?.length || 0,
    processing: refunds?.filter((r) => r.status === "processing" || r.status === "initiated").length || 0,
    success: refunds?.filter((r) => r.status === "success").length || 0,
    failed: refunds?.filter((r) => r.status === "failed").length || 0,
    totalAmount: refunds?.filter((r) => r.status === "success").reduce((sum, r) => sum + r.amount, 0) || 0,
  };

  return {
    refunds,
    isLoading,
    error,
    metrics,
    useRefundDetails,
    retryRefund,
  };
}
