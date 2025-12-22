import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  status: string;
  location: string | null;
  estimated_delivery: string | null;
  is_delayed: boolean;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipment_number: string | null;
  logistics_provider: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    product_name: string;
    amount: number;
    status: string;
    customer_id: string;
    merchant_id: string;
    merchant_name: string;
  };
  customer?: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  merchant?: {
    id: string;
    business_name: string;
  };
}

export interface ShipmentIssue {
  id: string;
  shipment_id: string;
  issue_type: string;
  issue_status: string;
  description: string | null;
  order_impact: string | null;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentActionLog {
  id: string;
  shipment_id: string;
  action_type: string;
  description: string | null;
  previous_value: unknown;
  new_value: unknown;
  admin_id: string;
  admin_notes: string | null;
  created_at: string;
}

export interface TrackingEvent {
  id: string;
  tracking_id: string;
  status: string;
  location: string | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface ShipmentFilters {
  status?: string;
  isDelayed?: boolean;
  carrier?: string;
  dateFrom?: string;
  dateTo?: string;
  merchantId?: string;
  orderId?: string;
  search?: string;
}

export interface ShipmentStats {
  total: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  failed: number;
}

export function useAdminShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ShipmentStats>({
    total: 0,
    inTransit: 0,
    delivered: 0,
    delayed: 0,
    failed: 0,
  });
  const [filters, setFilters] = useState<ShipmentFilters>({});
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const pageSize = 20;

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tracking')
        .select(`
          *,
          order:orders!tracking_order_id_fkey (
            id,
            product_name,
            amount,
            status,
            customer_id,
            merchant_id,
            merchant_name
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.isDelayed !== undefined) {
        query = query.eq('is_delayed', filters.isDelayed);
      }
      if (filters.carrier) {
        query = query.eq('carrier', filters.carrier);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.orderId) {
        query = query.eq('order_id', filters.orderId);
      }
      if (filters.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,shipment_number.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch merchant names for shipments
      const merchantIds = [...new Set(data?.map(s => s.order?.merchant_id).filter(Boolean))];
      let merchantMap: Record<string, { id: string; business_name: string }> = {};
      
      if (merchantIds.length > 0) {
        const { data: merchants } = await supabase
          .from('merchants')
          .select('id, business_name, user_id')
          .in('user_id', merchantIds as string[]);
        
        if (merchants) {
          merchantMap = merchants.reduce((acc, m) => {
            acc[m.user_id] = { id: m.id, business_name: m.business_name };
            return acc;
          }, {} as Record<string, { id: string; business_name: string }>);
        }
      }

      // Fetch customer profiles
      const customerIds = [...new Set(data?.map(s => s.order?.customer_id).filter(Boolean))];
      let customerMap: Record<string, { id: string; full_name: string | null; phone: string | null }> = {};
      
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', customerIds as string[]);
        
        if (profiles) {
          customerMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { id: p.user_id, full_name: p.full_name, phone: p.phone };
            return acc;
          }, {} as Record<string, { id: string; full_name: string | null; phone: string | null }>);
        }
      }

      const enrichedShipments = (data || []).map(s => ({
        ...s,
        merchant: s.order?.merchant_id ? merchantMap[s.order.merchant_id] : undefined,
        customer: s.order?.customer_id ? customerMap[s.order.customer_id] : undefined,
      }));

      setShipments(enrichedShipments);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch shipments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortOrder, page, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tracking')
        .select('status, is_delayed');

      if (error) throw error;

      const stats: ShipmentStats = {
        total: data?.length || 0,
        inTransit: data?.filter(s => s.status === 'in_transit').length || 0,
        delivered: data?.filter(s => s.status === 'delivered').length || 0,
        delayed: data?.filter(s => s.is_delayed).length || 0,
        failed: data?.filter(s => s.status === 'failed' || s.status === 'returned').length || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching shipment stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
    fetchStats();
  }, [fetchShipments, fetchStats]);

  // Real-time subscriptions
  useEffect(() => {
    const trackingChannel = supabase
      .channel('admin-tracking-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracking' },
        () => {
          fetchShipments();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trackingChannel);
    };
  }, [fetchShipments, fetchStats]);

  return {
    shipments,
    loading,
    stats,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    totalPages,
    refetch: fetchShipments,
  };
}

export function useAdminShipmentDetails(shipmentId: string) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [issues, setIssues] = useState<ShipmentIssue[]>([]);
  const [actionLogs, setActionLogs] = useState<ShipmentActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchShipmentDetails = useCallback(async () => {
    if (!shipmentId) return;
    
    setLoading(true);
    try {
      // Fetch shipment with order details
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('tracking')
        .select(`
          *,
          order:orders!tracking_order_id_fkey (
            id,
            product_name,
            product_description,
            amount,
            status,
            customer_id,
            merchant_id,
            merchant_name,
            created_at
          )
        `)
        .eq('id', shipmentId)
        .single();

      if (shipmentError) throw shipmentError;

      // Fetch merchant details
      let merchant = null;
      if (shipmentData.order?.merchant_id) {
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('id, business_name, email, phone, status')
          .eq('user_id', shipmentData.order.merchant_id)
          .single();
        merchant = merchantData;
      }

      // Fetch customer profile
      let customer = null;
      if (shipmentData.order?.customer_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .eq('user_id', shipmentData.order.customer_id)
          .single();
        customer = profileData ? { id: profileData.user_id, ...profileData } : null;
      }

      setShipment({
        ...shipmentData,
        merchant,
        customer,
      });

      // Fetch tracking events
      const { data: eventsData, error: eventsError } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('tracking_id', shipmentId)
        .order('occurred_at', { ascending: false });

      if (eventsError) throw eventsError;
      setTrackingEvents(eventsData || []);

      // Fetch issues
      const { data: issuesData, error: issuesError } = await supabase
        .from('shipment_issues')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;
      setIssues(issuesData || []);

      // Fetch action logs
      const { data: logsData, error: logsError } = await supabase
        .from('shipment_actions_log')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setActionLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch shipment details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [shipmentId, toast]);

  useEffect(() => {
    fetchShipmentDetails();
  }, [fetchShipmentDetails]);

  // Real-time subscriptions
  useEffect(() => {
    if (!shipmentId) return;

    const channel = supabase
      .channel(`admin-shipment-${shipmentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracking', filter: `id=eq.${shipmentId}` },
        () => fetchShipmentDetails()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracking_events', filter: `tracking_id=eq.${shipmentId}` },
        () => fetchShipmentDetails()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipment_issues', filter: `shipment_id=eq.${shipmentId}` },
        () => fetchShipmentDetails()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipment_actions_log', filter: `shipment_id=eq.${shipmentId}` },
        () => fetchShipmentDetails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId, fetchShipmentDetails]);

  const updateShipmentStatus = async (newStatus: string, notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'update_status',
          shipmentId,
          status: newStatus,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Shipment status changed to ${newStatus}`,
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipment status',
        variant: 'destructive',
      });
    }
  };

  const markDelayed = async (isDelayed: boolean, notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'mark_delayed',
          shipmentId,
          isDelayed,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: isDelayed ? 'Marked Delayed' : 'Delay Cleared',
        description: isDelayed ? 'Shipment marked as delayed' : 'Delay status cleared',
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error marking delayed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update delay status',
        variant: 'destructive',
      });
    }
  };

  const updateExpectedDelivery = async (date: string, notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'update_expected_delivery',
          shipmentId,
          expectedDeliveryDate: date,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Delivery Date Updated',
        description: 'Expected delivery date has been updated',
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error updating delivery date:', error);
      toast({
        title: 'Error',
        description: 'Failed to update expected delivery date',
        variant: 'destructive',
      });
    }
  };

  const markDelivered = async (notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'mark_delivered',
          shipmentId,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Marked Delivered',
        description: 'Shipment has been marked as delivered',
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark as delivered',
        variant: 'destructive',
      });
    }
  };

  const triggerReturn = async (notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'trigger_return',
          shipmentId,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Return Initiated',
        description: 'Return process has been initiated',
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error triggering return:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate return',
        variant: 'destructive',
      });
    }
  };

  const createIssue = async (issueType: string, description: string, orderImpact?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'create_issue',
          shipmentId,
          issueType,
          description,
          orderImpact,
        },
      });

      if (error) throw error;

      toast({
        title: 'Issue Created',
        description: 'Shipment issue has been created',
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error creating issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to create issue',
        variant: 'destructive',
      });
    }
  };

  const updateIssueStatus = async (issueId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'update_issue_status',
          shipmentId,
          issueId,
          issueStatus: status,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Issue Updated',
        description: `Issue status changed to ${status}`,
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error updating issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to update issue',
        variant: 'destructive',
      });
    }
  };

  const addAdminNote = async (notes: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-shipment-action', {
        body: {
          action: 'add_note',
          shipmentId,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Note Added',
        description: 'Admin note has been added',
      });

      await fetchShipmentDetails();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  return {
    shipment,
    trackingEvents,
    issues,
    actionLogs,
    loading,
    refetch: fetchShipmentDetails,
    updateShipmentStatus,
    markDelayed,
    updateExpectedDelivery,
    markDelivered,
    triggerReturn,
    createIssue,
    updateIssueStatus,
    addAdminNote,
  };
}
