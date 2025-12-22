import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface AdminDispute {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string;
  status: string;
  issue_type: string | null;
  refund_amount: number | null;
  final_decision: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
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
  };
  merchant?: {
    business_name: string;
  };
  payment?: {
    id: string;
    status: string;
    amount: number;
  };
}

export interface DisputeFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  merchantId?: string;
}

export interface DisputeDetails extends AdminDispute {
  order: {
    id: string;
    product_name: string;
    product_description: string | null;
    amount: number;
    status: string;
    merchant_name: string;
    merchant_id: string;
    customer_id: string;
    expected_delivery_date: string | null;
    delivered_at: string | null;
    created_at: string;
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
  payment: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
  } | null;
  updates: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    created_by: string | null;
    created_at: string;
  }>;
  comments: Array<{
    id: string;
    message: string;
    user_id: string;
    is_admin: boolean | null;
    created_at: string;
  }>;
  files: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    created_at: string;
  }>;
  merchantEvidence: Array<{
    id: string;
    file_name: string;
    file_url: string;
    evidence_type: string | null;
    description: string | null;
    created_at: string;
  }>;
}

type DecisionType = "release_to_merchant" | "refund_customer" | "partial_refund" | "resolve_no_funds";

const SUPABASE_URL = "https://sgpefhfmcykwtfqfwzcq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ";

export function useAdminDisputes(filters?: DisputeFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch disputes with filters
  const { data: disputes, isLoading, error } = useQuery({
    queryKey: ["admin-disputes", filters],
    queryFn: async () => {
      let query = supabase
        .from("disputes")
        .select(`
          *,
          orders!inner(id, product_name, merchant_name, merchant_id, amount, status)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status as "open" | "under_review" | "resolved" | "closed");
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

      // Enrich with customer/merchant/payment info
      const enrichedDisputes = await Promise.all(
        (data || []).map(async (dispute) => {
          const [customerResult, merchantResult, paymentResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", dispute.customer_id)
              .single(),
            supabase
              .from("merchants")
              .select("business_name")
              .eq("user_id", dispute.orders.merchant_id)
              .single(),
            supabase
              .from("payments")
              .select("id, status, amount")
              .eq("order_id", dispute.order_id)
              .single(),
          ]);

          return {
            ...dispute,
            customer: customerResult.data,
            merchant: merchantResult.data,
            payment: paymentResult.data,
          };
        })
      );

      return enrichedDisputes as AdminDispute[];
    },
  });

  // Fetch single dispute details
  const useDisputeDetails = (disputeId: string) => {
    return useQuery({
      queryKey: ["admin-dispute-details", disputeId],
      queryFn: async () => {
        // Fetch dispute
        const { data: dispute, error: disputeError } = await supabase
          .from("disputes")
          .select("*")
          .eq("id", disputeId)
          .single();

        if (disputeError) throw disputeError;

        // Fetch related data in parallel
        const [
          orderResult,
          customerResult,
          paymentResult,
          updatesResult,
          commentsResult,
          filesResult,
          merchantEvidenceResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .eq("id", dispute.order_id)
            .single(),
          supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .eq("user_id", dispute.customer_id)
            .single(),
          supabase
            .from("payments")
            .select("*")
            .eq("order_id", dispute.order_id)
            .single(),
          supabase
            .from("dispute_updates")
            .select("*")
            .eq("dispute_id", disputeId)
            .order("created_at", { ascending: true }),
          supabase
            .from("dispute_comments")
            .select("*")
            .eq("dispute_id", disputeId)
            .order("created_at", { ascending: true }),
          supabase
            .from("dispute_files")
            .select("*")
            .eq("dispute_id", disputeId)
            .order("created_at", { ascending: true }),
          supabase
            .from("merchant_evidence")
            .select("*")
            .eq("dispute_id", disputeId)
            .order("created_at", { ascending: true }),
        ]);

        // Fetch merchant
        let merchantData = null;
        if (orderResult.data) {
          const { data: merchant } = await supabase
            .from("merchants")
            .select("user_id, business_name, email, phone")
            .eq("user_id", orderResult.data.merchant_id)
            .single();
          merchantData = merchant;
        }

        return {
          ...dispute,
          order: orderResult.data,
          customer: {
            id: customerResult.data?.user_id,
            ...customerResult.data,
          },
          merchant: merchantData ? {
            id: merchantData.user_id,
            ...merchantData,
          } : null,
          payment: paymentResult.data,
          updates: updatesResult.data || [],
          comments: commentsResult.data || [],
          files: filesResult.data || [],
          merchantEvidence: merchantEvidenceResult.data || [],
        } as DisputeDetails;
      },
      enabled: !!disputeId,
    });
  };

  // Update dispute status
  const updateStatus = useMutation({
    mutationFn: async ({ disputeId, status }: { disputeId: string; status: "open" | "under_review" | "resolved" | "closed" }) => {
      const { error } = await supabase
        .from("disputes")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", disputeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dispute-details"] });
      toast({ title: "Status Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  // Add admin note/comment
  const addAdminNote = useMutation({
    mutationFn: async ({ disputeId, note }: { disputeId: string; note: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { error } = await supabase.from("dispute_updates").insert({
        dispute_id: disputeId,
        title: "Admin Note",
        description: note,
        created_by: "admin",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dispute-details"] });
      toast({ title: "Note Added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Note", description: error.message, variant: "destructive" });
    },
  });

  // Make final decision
  const makeDecision = useMutation({
    mutationFn: async ({
      disputeId,
      decision,
      reason,
      partialAmount,
    }: {
      disputeId: string;
      decision: DecisionType;
      reason: string;
      partialAmount?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-dispute-decision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ disputeId, decision, reason, partialAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Decision failed");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dispute-details"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Decision Applied",
        description: "Dispute has been resolved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Decision Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-disputes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dispute-details"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dispute_updates" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-dispute-details"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    disputes,
    isLoading,
    error,
    useDisputeDetails,
    updateStatus,
    addAdminNote,
    makeDecision,
  };
}
