import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface AdminPayment {
  id: string;
  order_id: string;
  customer_id: string;
  merchant_id: string;
  amount: number;
  status: string;
  transaction_reference: string | null;
  created_at: string;
  updated_at: string;
  orders?: {
    id: string;
    product_name: string;
    merchant_name: string;
    status: string;
    created_at: string;
  };
  customer?: {
    full_name: string | null;
  };
  merchant?: {
    business_name: string;
  };
}

export interface PaymentFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  customerId?: string;
  merchantId?: string;
}

export interface PaymentDetails extends AdminPayment {
  order: {
    id: string;
    product_name: string;
    product_description: string | null;
    amount: number;
    status: string;
    merchant_name: string;
    expected_delivery_date: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  customer: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  merchant: {
    id: string;
    business_name: string;
    email: string;
    phone: string | null;
  };
  events: Array<{
    id: string;
    event_type: string;
    title: string;
    description: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>;
  disputes: Array<{
    id: string;
    status: string;
    reason: string;
    created_at: string;
  }>;
}

const SUPABASE_URL = "https://sgpefhfmcykwtfqfwzcq.supabase.co";

export function useAdminPayments(filters?: PaymentFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch payments with filters
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          orders!inner(id, product_name, merchant_name, status, created_at)
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
      if (filters?.minAmount) {
        query = query.gte("amount", filters.minAmount);
      }
      if (filters?.maxAmount) {
        query = query.lte("amount", filters.maxAmount);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }
      if (filters?.merchantId) {
        query = query.eq("merchant_id", filters.merchantId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Fetch customer and merchant details separately
      const enrichedPayments = await Promise.all(
        (data || []).map(async (payment) => {
          const [customerResult, merchantResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", payment.customer_id)
              .single(),
            supabase
              .from("merchants")
              .select("business_name")
              .eq("user_id", payment.merchant_id)
              .single(),
          ]);

          return {
            ...payment,
            customer: customerResult.data,
            merchant: merchantResult.data,
          };
        })
      );

      return enrichedPayments as AdminPayment[];
    },
  });

  // Fetch single payment details
  const usePaymentDetails = (paymentId: string) => {
    return useQuery({
      queryKey: ["admin-payment-details", paymentId],
      queryFn: async () => {
        // Fetch payment
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", paymentId)
          .single();

        if (paymentError) throw paymentError;

        // Fetch related data in parallel
        const [orderResult, customerResult, merchantResult, eventsResult, disputesResult] = await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .eq("id", payment.order_id)
            .single(),
          supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .eq("user_id", payment.customer_id)
            .single(),
          supabase
            .from("merchants")
            .select("user_id, business_name, email, phone")
            .eq("user_id", payment.merchant_id)
            .single(),
          supabase
            .from("order_events")
            .select("*")
            .eq("order_id", payment.order_id)
            .order("created_at", { ascending: true }),
          supabase
            .from("disputes")
            .select("id, status, reason, created_at")
            .eq("order_id", payment.order_id),
        ]);

        return {
          ...payment,
          order: orderResult.data,
          customer: { 
            id: customerResult.data?.user_id, 
            ...customerResult.data 
          },
          merchant: { 
            id: merchantResult.data?.user_id, 
            ...merchantResult.data 
          },
          events: eventsResult.data || [],
          disputes: disputesResult.data || [],
        } as PaymentDetails;
      },
      enabled: !!paymentId,
    });
  };

  // Force release mutation
  const forceRelease = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-force-release`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ",
        },
        body: JSON.stringify({ paymentId, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Force release failed");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payment-details"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Force Release Successful",
        description: "Funds have been released to the merchant.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Force Release Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Force refund mutation
  const forceRefund = useMutation({
    mutationFn: async ({
      paymentId,
      reason,
      refundType,
      refundAmount,
    }: {
      paymentId: string;
      reason: string;
      refundType: "full" | "partial";
      refundAmount?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-force-refund`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ",
        },
        body: JSON.stringify({ paymentId, reason, refundType, refundAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Force refund failed");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payment-details"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Force Refund Successful",
        description: "Funds have been refunded to the customer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Force Refund Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-payments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
          queryClient.invalidateQueries({ queryKey: ["admin-payment-details"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    payments,
    isLoading,
    error,
    usePaymentDetails,
    forceRelease,
    forceRefund,
  };
}
