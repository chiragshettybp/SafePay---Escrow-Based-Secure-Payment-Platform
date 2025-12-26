import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";

export interface PaymentLink {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: 'active' | 'expired' | 'disabled';
  expires_at: string | null;
  success_redirect_url: string | null;
  cancel_redirect_url: string | null;
  link_code: string;
  total_payments: number;
  total_collected: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentLinkData {
  title: string;
  description?: string;
  amount: number;
  expires_at?: string | null;
  success_redirect_url?: string;
  cancel_redirect_url?: string;
}

export interface PaymentLinkStats {
  total_links: number;
  active_links: number;
  total_collected: number;
  total_payments: number;
}

export function usePaymentLinks() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [stats, setStats] = useState<PaymentLinkStats>({
    total_links: 0,
    active_links: 0,
    total_collected: 0,
    total_payments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { merchant } = useMerchantAuth();

  const fetchLinks = useCallback(async () => {
    if (!merchant?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedLinks = (data || []).map(link => ({
        ...link,
        status: link.status as 'active' | 'expired' | 'disabled',
        metadata: link.metadata as Record<string, unknown> | null,
      }));

      setLinks(typedLinks);

      // Calculate stats
      const activeLinks = typedLinks.filter(l => l.status === 'active');
      setStats({
        total_links: typedLinks.length,
        active_links: activeLinks.length,
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
  }, [merchant?.id, toast]);

  const createLink = useCallback(async (data: CreatePaymentLinkData): Promise<PaymentLink | null> => {
    if (!merchant?.id) {
      toast({
        title: "Error",
        description: "Merchant not found",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Generate a unique link code
      const linkCode = `PLINK_${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data: newLink, error } = await supabase
        .from("payment_links")
        .insert([{
          merchant_id: merchant.id,
          title: data.title,
          description: data.description || null,
          amount: data.amount,
          expires_at: data.expires_at || null,
          success_redirect_url: data.success_redirect_url || null,
          cancel_redirect_url: data.cancel_redirect_url || null,
          link_code: linkCode,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment link created successfully",
      });

      await fetchLinks();
      return newLink as PaymentLink;
    } catch (error: unknown) {
      console.error("Error creating payment link:", error);
      toast({
        title: "Error",
        description: "Failed to create payment link",
        variant: "destructive",
      });
      return null;
    }
  }, [merchant?.id, toast, fetchLinks]);

  const updateLink = useCallback(async (
    linkId: string, 
    updates: Partial<Pick<PaymentLink, 'status' | 'expires_at' | 'success_redirect_url' | 'cancel_redirect_url'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("payment_links")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment link updated successfully",
      });

      await fetchLinks();
      return true;
    } catch (error: unknown) {
      console.error("Error updating payment link:", error);
      toast({
        title: "Error",
        description: "Failed to update payment link",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchLinks]);

  const disableLink = useCallback(async (linkId: string): Promise<boolean> => {
    return updateLink(linkId, { status: 'disabled' });
  }, [updateLink]);

  const enableLink = useCallback(async (linkId: string): Promise<boolean> => {
    return updateLink(linkId, { status: 'active' });
  }, [updateLink]);

  const getLink = useCallback(async (linkId: string): Promise<PaymentLink | null> => {
    try {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (error) throw error;

      return {
        ...data,
        status: data.status as 'active' | 'expired' | 'disabled',
        metadata: data.metadata as Record<string, unknown> | null,
      };
    } catch (error: unknown) {
      console.error("Error fetching payment link:", error);
      return null;
    }
  }, []);

  const getLinkByCode = useCallback(async (linkCode: string): Promise<PaymentLink | null> => {
    try {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("link_code", linkCode)
        .single();

      if (error) throw error;

      return {
        ...data,
        status: data.status as 'active' | 'expired' | 'disabled',
        metadata: data.metadata as Record<string, unknown> | null,
      };
    } catch (error: unknown) {
      console.error("Error fetching payment link by code:", error);
      return null;
    }
  }, []);

  const getPublicUrl = useCallback((link: PaymentLink, merchantSlug: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pay/${merchantSlug}/${link.link_code}`;
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    if (!merchant?.id) return;

    fetchLinks();

    const channel = supabase
      .channel('payment-links-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_links',
          filter: `merchant_id=eq.${merchant.id}`,
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant?.id, fetchLinks]);

  return {
    links,
    stats,
    isLoading,
    createLink,
    updateLink,
    disableLink,
    enableLink,
    getLink,
    getLinkByCode,
    getPublicUrl,
    refetch: fetchLinks,
  };
}

// Hook for public checkout - fetches merchant by slug
export function usePublicMerchant(slug: string | undefined) {
  const [merchant, setMerchant] = useState<{
    id: string;
    business_name: string;
    slug: string;
    status: string;
    logo_url: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      setError("No merchant specified");
      return;
    }

    const fetchMerchant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("merchants")
          .select("id, business_name, slug, status, logo_url")
          .eq("slug", slug)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError("Merchant not found");
          } else {
            throw fetchError;
          }
          return;
        }

        if (data.status !== 'active' && data.status !== 'pending_verification') {
          setError("This merchant is currently unavailable");
          return;
        }

        setMerchant(data);
      } catch (err) {
        console.error("Error fetching merchant:", err);
        setError("Failed to load merchant");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchant();
  }, [slug]);

  return { merchant, isLoading, error };
}

// Hook for public payment link
export function usePublicPaymentLink(linkCode: string | undefined) {
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [merchant, setMerchant] = useState<{
    id: string;
    business_name: string;
    slug: string;
    logo_url: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkCode) {
      setIsLoading(false);
      setError("No payment link specified");
      return;
    }

    const fetchPaymentLink = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch payment link
        const { data: linkData, error: linkError } = await supabase
          .from("payment_links")
          .select("*")
          .eq("link_code", linkCode)
          .single();

        if (linkError) {
          if (linkError.code === 'PGRST116') {
            setError("Payment link not found");
          } else {
            throw linkError;
          }
          return;
        }

        // Check status
        if (linkData.status !== 'active') {
          setError("This payment link is no longer active");
          return;
        }

        // Check expiry
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          setError("This payment link has expired");
          return;
        }

        // Fetch merchant
        const { data: merchantData, error: merchantError } = await supabase
          .from("merchants")
          .select("id, business_name, slug, logo_url, status")
          .eq("id", linkData.merchant_id)
          .single();

        if (merchantError) throw merchantError;

        if (merchantData.status !== 'active' && merchantData.status !== 'pending_verification') {
          setError("This merchant is currently unavailable");
          return;
        }

        setPaymentLink({
          ...linkData,
          status: linkData.status as 'active' | 'expired' | 'disabled',
          metadata: linkData.metadata as Record<string, unknown> | null,
        });
        setMerchant(merchantData);
      } catch (err) {
        console.error("Error fetching payment link:", err);
        setError("Failed to load payment link");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentLink();
  }, [linkCode]);

  return { paymentLink, merchant, isLoading, error };
}
