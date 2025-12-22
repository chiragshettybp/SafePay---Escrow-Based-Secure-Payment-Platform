import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface AdminMerchant {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  gst_number: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  kyc?: {
    id: string;
    status: string;
    legal_business_name: string | null;
    owner_name: string | null;
    owner_phone: string | null;
  } | null;
  total_orders?: number;
  total_revenue?: number;
}

export interface MerchantFilters {
  status?: string;
  kycStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface MerchantDetails extends AdminMerchant {
  kyc: {
    id: string;
    status: string;
    legal_business_name: string | null;
    business_type: string | null;
    pan_number: string | null;
    gst_number: string | null;
    registered_address: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    owner_dob: string | null;
    rejection_reason: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  kycDocuments: Array<{
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    status: string;
    created_at: string;
  }>;
  bankAccounts: Array<{
    id: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    is_default: boolean;
    is_verified: boolean;
  }>;
  wallet: {
    available_balance: number;
    pending_balance: number;
    total_paid_out: number;
  } | null;
  recentOrders: Array<{
    id: string;
    product_name: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
  recentDisputes: Array<{
    id: string;
    reason: string;
    status: string;
    created_at: string;
  }>;
  orderStats: {
    total: number;
    completed: number;
    cancelled: number;
    disputed: number;
  };
  totalRevenue: number;
}

const SUPABASE_URL = "https://sgpefhfmcykwtfqfwzcq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ";

export function useAdminMerchants(filters?: MerchantFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch merchants with filters
  const { data: merchants, isLoading, error } = useQuery({
    queryKey: ["admin-merchants", filters],
    queryFn: async () => {
      let query = supabase
        .from("merchants")
        .select("*")
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
      if (filters?.search) {
        query = query.or(
          `business_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Enrich with KYC status and order stats
      const enrichedMerchants = await Promise.all(
        (data || []).map(async (merchant) => {
          const [kycResult, ordersResult] = await Promise.all([
            supabase
              .from("merchant_kyc")
              .select("id, status, legal_business_name, owner_name, owner_phone")
              .eq("merchant_id", merchant.user_id)
              .single(),
            supabase
              .from("orders")
              .select("id, amount, status")
              .eq("merchant_id", merchant.user_id),
          ]);

          // Filter by KYC status if specified
          if (filters?.kycStatus && kycResult.data?.status !== filters.kycStatus) {
            return null;
          }

          const orders = ordersResult.data || [];
          const completedOrders = orders.filter(
            (o) => o.status === "completed"
          );

          return {
            ...merchant,
            kyc: kycResult.data,
            total_orders: orders.length,
            total_revenue: completedOrders.reduce(
              (sum, o) => sum + Number(o.amount),
              0
            ),
          };
        })
      );

      return enrichedMerchants.filter(Boolean) as AdminMerchant[];
    },
  });

  // Fetch single merchant details
  const useMerchantDetails = (merchantId: string) => {
    return useQuery({
      queryKey: ["admin-merchant-details", merchantId],
      queryFn: async () => {
        // Fetch merchant
        const { data: merchant, error: merchantError } = await supabase
          .from("merchants")
          .select("*")
          .eq("user_id", merchantId)
          .single();

        if (merchantError) throw merchantError;

        // Fetch related data in parallel
        const [
          kycResult,
          kycDocsResult,
          bankResult,
          walletResult,
          ordersResult,
          disputesResult,
        ] = await Promise.all([
          supabase
            .from("merchant_kyc")
            .select("*")
            .eq("merchant_id", merchantId)
            .single(),
          supabase
            .from("merchant_kyc_documents")
            .select("*")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false }),
          supabase
            .from("merchant_bank_accounts")
            .select("*")
            .eq("merchant_id", merchantId),
          supabase
            .from("merchant_wallets")
            .select("available_balance, pending_balance, total_paid_out")
            .eq("merchant_id", merchantId)
            .single(),
          supabase
            .from("orders")
            .select("id, product_name, amount, status, created_at")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("disputes")
            .select("id, reason, status, created_at, orders!inner(merchant_id)")
            .eq("orders.merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        // Calculate order stats
        const { data: allOrders } = await supabase
          .from("orders")
          .select("id, amount, status")
          .eq("merchant_id", merchantId);

        const orders = allOrders || [];
        const orderStats = {
          total: orders.length,
          completed: orders.filter((o) => o.status === "completed").length,
          cancelled: orders.filter((o) => o.status === "cancelled").length,
          disputed: orders.filter((o) => o.status === "disputed").length,
        };

        const totalRevenue = orders
          .filter((o) => o.status === "completed")
          .reduce((sum, o) => sum + Number(o.amount), 0);

        return {
          ...merchant,
          kyc: kycResult.data,
          kycDocuments: kycDocsResult.data || [],
          bankAccounts: bankResult.data || [],
          wallet: walletResult.data,
          recentOrders: ordersResult.data || [],
          recentDisputes: disputesResult.data || [],
          orderStats,
          totalRevenue,
        } as MerchantDetails;
      },
      enabled: !!merchantId,
    });
  };

  // Approve/Reject KYC verification
  const verifyMerchant = useMutation({
    mutationFn: async ({
      merchantId,
      decision,
      reason,
    }: {
      merchantId: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-merchant-verification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ merchantId, decision, reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-details"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Verification Updated",
        description: "Merchant verification status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Ban/Suspend merchant
  const banMerchant = useMutation({
    mutationFn: async ({
      merchantId,
      action,
      reason,
      duration,
    }: {
      merchantId: string;
      action: "suspend" | "ban" | "activate";
      reason: string;
      duration?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-merchant-ban`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ merchantId, action, reason, duration }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Action failed");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-details"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      
      const actionText = 
        variables.action === "ban" ? "banned" :
        variables.action === "suspend" ? "suspended" :
        "activated";
      
      toast({
        title: `Merchant ${actionText}`,
        description: `Merchant has been ${actionText} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-merchants-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchants" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
          queryClient.invalidateQueries({ queryKey: ["admin-merchant-details"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_kyc" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
          queryClient.invalidateQueries({ queryKey: ["admin-merchant-details"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    merchants,
    isLoading,
    error,
    useMerchantDetails,
    verifyMerchant,
    banMerchant,
  };
}
