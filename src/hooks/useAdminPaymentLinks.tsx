import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export interface AdminPaymentLink {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: 'active' | 'expired' | 'disabled';
  expires_at: string | null;
  link_code: string;
  total_payments: number;
  total_collected: number;
  created_at: string;
  updated_at: string;
  merchant?: {
    id: string;
    business_name: string;
    slug: string;
    user_id: string;
  };
}

export interface PaymentLinkFilters {
  merchant_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  has_payments?: boolean;
  search?: string;
}

export interface AdminPaymentLinkStats {
  total_links: number;
  active_links: number;
  disabled_links: number;
  expired_links: number;
  total_collected: number;
  total_payments: number;
}

export interface PublicTrafficData {
  total_visits: number;
  sessions_created: number;
  payments_completed: number;
  conversion_rate: number;
  blocked_sessions: number;
}

export function useAdminPaymentLinks(filters?: PaymentLinkFilters) {
  const [links, setLinks] = useState<AdminPaymentLink[]>([]);
  const [stats, setStats] = useState<AdminPaymentLinkStats>({
    total_links: 0,
    active_links: 0,
    disabled_links: 0,
    expired_links: 0,
    total_collected: 0,
    total_payments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAdminAuth();

  const fetchLinks = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from("payment_links")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.merchant_id) {
        query = query.eq("merchant_id", filters.merchant_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.date_from) {
        query = query.gte("created_at", filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte("created_at", filters.date_to);
      }
      if (filters?.amount_min !== undefined) {
        query = query.gte("amount", filters.amount_min);
      }
      if (filters?.amount_max !== undefined) {
        query = query.lte("amount", filters.amount_max);
      }
      if (filters?.has_payments === true) {
        query = query.gt("total_payments", 0);
      } else if (filters?.has_payments === false) {
        query = query.eq("total_payments", 0);
      }

      const { data: linksData, error: linksError } = await query;
      if (linksError) throw linksError;

      // Fetch merchant details for each link
      const merchantIds = [...new Set((linksData || []).map(l => l.merchant_id))];
      
      let merchantsMap: Record<string, { id: string; business_name: string; slug: string; user_id: string }> = {};
      if (merchantIds.length > 0) {
        const { data: merchantsData } = await supabase
          .from("merchants")
          .select("id, business_name, slug, user_id")
          .in("id", merchantIds);
        
        merchantsMap = (merchantsData || []).reduce((acc, m) => {
          acc[m.id] = m;
          return acc;
        }, {} as typeof merchantsMap);
      }

      const typedLinks: AdminPaymentLink[] = (linksData || []).map(link => ({
        ...link,
        status: link.status as 'active' | 'expired' | 'disabled',
        merchant: merchantsMap[link.merchant_id],
      }));

      // Apply search filter client-side
      let filteredLinks = typedLinks;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLinks = typedLinks.filter(l =>
          l.title.toLowerCase().includes(searchLower) ||
          l.link_code.toLowerCase().includes(searchLower) ||
          l.merchant?.business_name?.toLowerCase().includes(searchLower)
        );
      }

      setLinks(filteredLinks);

      // Calculate stats
      const activeLinks = typedLinks.filter(l => l.status === 'active');
      const disabledLinks = typedLinks.filter(l => l.status === 'disabled');
      const expiredLinks = typedLinks.filter(l => l.status === 'expired');
      
      setStats({
        total_links: typedLinks.length,
        active_links: activeLinks.length,
        disabled_links: disabledLinks.length,
        expired_links: expiredLinks.length,
        total_collected: typedLinks.reduce((sum, l) => sum + (l.total_collected || 0), 0),
        total_payments: typedLinks.reduce((sum, l) => sum + (l.total_payments || 0), 0),
      });
    } catch (error: unknown) {
      console.error("Error fetching payment links:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payment links",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, toast]);

  const disableLink = useCallback(async (linkId: string, reason: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("payment_links")
        .update({ 
          status: 'disabled',
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkId);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: user.id,
        action_type: "disable_payment_link",
        target_type: "payment_link",
        target_id: linkId,
        reason: reason,
      });

      toast({
        title: "Link Disabled",
        description: "Payment link has been disabled successfully",
      });

      await fetchLinks();
      return true;
    } catch (error: unknown) {
      console.error("Error disabling payment link:", error);
      toast({
        title: "Error",
        description: "Failed to disable payment link",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast, fetchLinks]);

  const enableLink = useCallback(async (linkId: string, reason: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("payment_links")
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkId);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: user.id,
        action_type: "enable_payment_link",
        target_type: "payment_link",
        target_id: linkId,
        reason: reason,
      });

      toast({
        title: "Link Enabled",
        description: "Payment link has been enabled successfully",
      });

      await fetchLinks();
      return true;
    } catch (error: unknown) {
      console.error("Error enabling payment link:", error);
      toast({
        title: "Error",
        description: "Failed to enable payment link",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast, fetchLinks]);

  const flagForReview = useCallback(async (linkId: string, reason: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Create admin alert for review
      await supabase.from("admin_alerts").insert({
        title: "Payment Link Flagged for Review",
        description: `Payment link ${linkId} has been flagged for review. Reason: ${reason}`,
        severity: "medium",
        alert_type: "payment_link_review",
        related_entity_type: "payment_link",
        related_entity_id: linkId,
        triggered_by: user.id,
        triggered_by_type: "admin",
      });

      // Log admin action
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: user.id,
        action_type: "flag_payment_link",
        target_type: "payment_link",
        target_id: linkId,
        reason: reason,
      });

      toast({
        title: "Link Flagged",
        description: "Payment link has been flagged for review",
      });

      return true;
    } catch (error: unknown) {
      console.error("Error flagging payment link:", error);
      toast({
        title: "Error",
        description: "Failed to flag payment link",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchLinks();

    const channel = supabase
      .channel('admin-payment-links-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_links',
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLinks]);

  return {
    links,
    stats,
    isLoading,
    disableLink,
    enableLink,
    flagForReview,
    refetch: fetchLinks,
  };
}

// Hook for single payment link details
export function useAdminPaymentLinkDetails(linkId: string | undefined) {
  const [link, setLink] = useState<AdminPaymentLink | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAdminAuth();

  const fetchDetails = useCallback(async () => {
    if (!user || !linkId) return;

    try {
      setIsLoading(true);

      // Fetch payment link
      const { data: linkData, error: linkError } = await supabase
        .from("payment_links")
        .select("*")
        .eq("id", linkId)
        .single() as { data: any; error: any };

      if (linkError) throw linkError;

      // Fetch merchant
      const { data: merchantData } = await supabase
        .from("merchants")
        .select("id, business_name, slug, user_id")
        .eq("id", linkData.merchant_id)
        .single();

      setLink({
        ...linkData,
        status: linkData.status as 'active' | 'expired' | 'disabled',
        merchant: merchantData,
      });

      // Fetch payments for this link using simple query
      const paymentsQuery = supabase
        .from("payments")
        .select("*")
        .eq("payment_link_id", linkId);
      
      const paymentsResult = await paymentsQuery;
      setPayments((paymentsResult.data || []) as any[]);

      // Fetch checkout sessions for this link
      const sessionsQuery = supabase
        .from("checkout_sessions")
        .select("*")
        .eq("payment_link_id", linkId);
      
      const sessionsResult = await sessionsQuery;
      setSessions((sessionsResult.data || []) as any[]);
    } catch (error: unknown) {
      console.error("Error fetching payment link details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payment link details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, linkId, toast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    link,
    payments,
    sessions,
    isLoading,
    refetch: fetchDetails,
  };
}

// Hook for public traffic monitoring
export function useAdminPublicTraffic() {
  const [trafficData, setTrafficData] = useState<PublicTrafficData>({
    total_visits: 0,
    sessions_created: 0,
    payments_completed: 0,
    conversion_rate: 0,
    blocked_sessions: 0,
  });
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([]);
  const [trafficByMerchant, setTrafficByMerchant] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAdminAuth();

  const fetchTrafficData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch checkout sessions stats
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("checkout_sessions")
        .select("id, status, merchant_id, payment_link_id, created_at");

      if (sessionsError) throw sessionsError;

      const sessions = sessionsData || [];
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const blockedSessions = sessions.filter(s => (s.status as string) === 'blocked').length;

      // Fetch completed payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, status")
        .eq("status", "success");

      const completedPayments = (paymentsData || []).length;

      setTrafficData({
        total_visits: totalSessions,
        sessions_created: totalSessions,
        payments_completed: completedPayments,
        conversion_rate: totalSessions > 0 ? (completedPayments / totalSessions) * 100 : 0,
        blocked_sessions: blockedSessions,
      });

      // Fetch traffic by merchant
      const merchantSessionCounts: Record<string, number> = {};
      sessions.forEach(s => {
        merchantSessionCounts[s.merchant_id] = (merchantSessionCounts[s.merchant_id] || 0) + 1;
      });

      const merchantIds = Object.keys(merchantSessionCounts);
      if (merchantIds.length > 0) {
        const { data: merchantsData } = await supabase
          .from("merchants")
          .select("id, business_name, slug")
          .in("id", merchantIds);

        const trafficByMerchantData = (merchantsData || []).map(m => ({
          merchant_id: m.id,
          business_name: m.business_name,
          slug: m.slug,
          session_count: merchantSessionCounts[m.id] || 0,
        })).sort((a, b) => b.session_count - a.session_count);

        setTrafficByMerchant(trafficByMerchantData);
      }

      // Fetch suspicious activity (risk flags)
      const { data: riskFlags } = await supabase
        .from("checkout_risk_flags")
        .select("*, checkout_sessions(merchant_id, payment_link_id)")
        .order("created_at", { ascending: false })
        .limit(50);

      setSuspiciousActivity(riskFlags || []);
    } catch (error: unknown) {
      console.error("Error fetching traffic data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch traffic data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTrafficData();
  }, [fetchTrafficData]);

  return {
    trafficData,
    suspiciousActivity,
    trafficByMerchant,
    isLoading,
    refetch: fetchTrafficData,
  };
}
