import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type DraftStatus = 'draft' | 'active' | 'submitted' | 'cancelled' | 'deleted' | 'expired' | 'change_requested' | 'rejected' | 'paid';

export interface DraftPayment {
  id: string;
  customer_id: string;
  merchant_id: string;
  merchant_name: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  status: string;
  draft_status: DraftStatus | null;
  draft_submitted_at: string | null;
  draft_expires_at: string | null;
  draft_cancelled_at: string | null;
  draft_cancelled_by: string | null;
  draft_cancelled_reason: string | null;
  draft_deleted_at: string | null;
  draft_deleted_by: string | null;
  draft_change_requested_at: string | null;
  draft_change_requested_by: string | null;
  draft_change_request_reason: string | null;
  draft_rejected_at: string | null;
  draft_rejected_by: string | null;
  draft_rejection_reason: string | null;
  draft_version: number;
  created_at: string;
  updated_at: string;
}

export interface DraftAuditLog {
  id: string;
  order_id: string;
  action_type: string;
  performed_by: string;
  performed_by_role: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface DraftActionParams {
  orderId: string;
  action: 'submit' | 'cancel' | 'delete' | 'restore' | 'reject' | 'request_changes';
  reason?: string;
}

// Customer hook for managing their drafts
export function useCustomerDrafts() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch all drafts for the customer
  const { data: drafts, isLoading, refetch } = useQuery({
    queryKey: ['customer-drafts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user!.id)
        .eq('status', 'draft')
        .not('draft_status', 'eq', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DraftPayment[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('customer-drafts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Draft action mutation
  const draftAction = useMutation({
    mutationFn: async ({ orderId, action, reason }: DraftActionParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/draft-action',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ',
          },
          body: JSON.stringify({ orderId, action, reason }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }
      return data;
    },
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['draft-order'] });
      
      const messages: Record<string, string> = {
        submit: 'Draft submitted successfully',
        cancel: 'Draft cancelled successfully',
        delete: 'Draft deleted successfully',
        restore: 'Draft restored successfully',
      };
      
      toast({
        title: 'Success',
        description: messages[action] || 'Action completed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update draft mutation
  const updateDraft = useMutation({
    mutationFn: async ({ 
      orderId, 
      amount, 
      productName, 
      productDescription 
    }: { 
      orderId: string; 
      amount?: number; 
      productName?: string; 
      productDescription?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (amount !== undefined) updateData.amount = amount;
      if (productName !== undefined) updateData.product_name = productName;
      if (productDescription !== undefined) updateData.product_description = productDescription;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('customer_id', user!.id)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['draft-order'] });
      toast({
        title: 'Success',
        description: 'Draft updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch draft audit logs
  const useDraftAuditLogs = (orderId: string) => {
    return useQuery({
      queryKey: ['draft-audit-logs', orderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('draft_audit_logs')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as DraftAuditLog[];
      },
      enabled: !!orderId,
    });
  };

  return {
    drafts: drafts || [],
    isLoading,
    submitDraft: (orderId: string) => draftAction.mutateAsync({ orderId, action: 'submit' }),
    cancelDraft: (orderId: string, reason?: string) => draftAction.mutateAsync({ orderId, action: 'cancel', reason }),
    deleteDraft: (orderId: string) => draftAction.mutateAsync({ orderId, action: 'delete' }),
    restoreDraft: (orderId: string) => draftAction.mutateAsync({ orderId, action: 'restore' }),
    updateDraft: updateDraft.mutateAsync,
    isUpdating: updateDraft.isPending,
    isActioning: draftAction.isPending,
    isSubmitting: draftAction.isPending,
    isCancelling: draftAction.isPending,
    isDeleting: draftAction.isPending,
    isRestoring: draftAction.isPending,
    useDraftAuditLogs,
    refetch,
  };
}

// Merchant hook for viewing and responding to drafts
export function useMerchantDrafts() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch all drafts for the merchant
  const { data: drafts, isLoading, refetch } = useQuery({
    queryKey: ['merchant-drafts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user!.id)
        .eq('status', 'draft')
        .in('draft_status', ['submitted', 'change_requested', 'active'])
        .order('draft_submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as DraftPayment[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('merchant-drafts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Draft action mutation
  const draftAction = useMutation({
    mutationFn: async ({ orderId, action, reason }: DraftActionParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/draft-action',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ',
          },
          body: JSON.stringify({ orderId, action, reason }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }
      return data;
    },
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['merchant-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      
      const messages: Record<string, string> = {
        reject: 'Draft rejected successfully',
        request_changes: 'Change request sent successfully',
      };
      
      toast({
        title: 'Success',
        description: messages[action] || 'Action completed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    drafts: drafts || [],
    isLoading,
    rejectDraft: (orderId: string, reason: string) => draftAction.mutate({ orderId, action: 'reject', reason }),
    requestChanges: (orderId: string, reason: string) => draftAction.mutate({ orderId, action: 'request_changes', reason }),
    isActioning: draftAction.isPending,
    refetch,
  };
}

// Admin hook for managing all drafts
export function useAdminDrafts() {
  const queryClient = useQueryClient();

  // Fetch all drafts with filters
  const useDrafts = (filters?: {
    status?: DraftStatus;
    customerId?: string;
    merchantId?: string;
    minAmount?: number;
    maxAmount?: number;
  }) => {
    return useQuery({
      queryKey: ['admin-drafts', filters],
      queryFn: async () => {
        let query = supabase
          .from('orders')
          .select('*')
          .eq('status', 'draft')
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('draft_status', filters.status);
        }
        if (filters?.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }
        if (filters?.merchantId) {
          query = query.eq('merchant_id', filters.merchantId);
        }
        if (filters?.minAmount) {
          query = query.gte('amount', filters.minAmount);
        }
        if (filters?.maxAmount) {
          query = query.lte('amount', filters.maxAmount);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as DraftPayment[];
      },
    });
  };

  // Get draft metrics
  const { data: metrics } = useQuery({
    queryKey: ['admin-draft-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('draft_status, amount')
        .eq('status', 'draft');

      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      let totalAmount = 0;

      data?.forEach(d => {
        const status = d.draft_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        if (d.draft_status === 'active' || d.draft_status === 'submitted') {
          totalAmount += Number(d.amount);
        }
      });

      return {
        total: data?.length || 0,
        byStatus: statusCounts,
        pendingAmount: totalAmount,
      };
    },
  });

  // Admin draft action mutation
  const draftAction = useMutation({
    mutationFn: async ({ orderId, action, reason }: DraftActionParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/draft-action',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ',
          },
          body: JSON.stringify({ orderId, action, reason }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-draft-metrics'] });
      toast({
        title: 'Success',
        description: 'Draft action completed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Force expire drafts
  const expireDrafts = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/expire-drafts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ',
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Expiration failed');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-draft-metrics'] });
      toast({
        title: 'Success',
        description: `Expired ${data.expired_count} drafts`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch audit logs for a draft
  const useDraftAuditLogs = (orderId: string) => {
    return useQuery({
      queryKey: ['admin-draft-audit-logs', orderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('draft_audit_logs')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as DraftAuditLog[];
      },
      enabled: !!orderId,
    });
  };

  return {
    useDrafts,
    metrics,
    forceCancel: (orderId: string, reason: string) => draftAction.mutate({ orderId, action: 'cancel', reason }),
    restoreDraft: (orderId: string) => draftAction.mutate({ orderId, action: 'restore' }),
    deleteDraft: (orderId: string) => draftAction.mutate({ orderId, action: 'delete' }),
    expireDrafts: expireDrafts.mutate,
    isActioning: draftAction.isPending,
    isExpiring: expireDrafts.isPending,
    useDraftAuditLogs,
  };
}