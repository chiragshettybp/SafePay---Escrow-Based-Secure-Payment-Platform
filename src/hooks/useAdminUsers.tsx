import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
  email?: string;
  total_orders?: number;
  total_spend?: number;
  disputes_count?: number;
  last_activity?: string;
}

export interface UserWarning {
  id: string;
  user_id: string;
  admin_id: string;
  reason: string;
  notes: string | null;
  created_at: string;
}

export interface UserBan {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: string;
  reason: string;
  notes: string | null;
  duration_days: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Keep old interface shape for compatibility
interface UserBanDB {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: 'suspend' | 'ban';
  reason: string;
  notes: string | null;
  duration_days: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  search: string;
  accountStatus: string;
  dateFrom: string;
  dateTo: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    accountStatus: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters.accountStatus && filters.accountStatus !== 'all') {
        query = query.eq('account_status', filters.accountStatus);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      // Get order stats for each user
      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Fetch orders for this user
          const { data: orders } = await supabase
            .from('orders')
            .select('id, amount, status')
            .eq('customer_id', profile.user_id);

          // Fetch disputes for this user
          const { data: disputes } = await supabase
            .from('disputes')
            .select('id')
            .eq('customer_id', profile.user_id);

          const totalOrders = orders?.length || 0;
          const totalSpend = orders?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;
          const disputesCount = disputes?.length || 0;

          return {
            ...profile,
            total_orders: totalOrders,
            total_spend: totalSpend,
            disputes_count: disputesCount,
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    filters,
    setFilters,
    refetch: fetchUsers,
  };
}

export function useAdminUserDetails(userId: string) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [bans, setBans] = useState<UserBan[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch orders
      const { data: userOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch disputes
      const { data: userDisputes } = await supabase
        .from('disputes')
        .select('*, orders(product_name, amount)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch warnings
      const { data: userWarnings } = await supabase
        .from('user_warnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch bans
      const { data: userBans } = await supabase
        .from('user_bans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Calculate stats
      const totalOrders = userOrders?.length || 0;
      const completedOrders = userOrders?.filter(o => o.status === 'completed').length || 0;
      const cancelledOrders = userOrders?.filter(o => o.status === 'cancelled').length || 0;
      const totalSpend = userOrders?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;

      setUser({
        ...profile,
        total_orders: totalOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        total_spend: totalSpend,
        disputes_count: userDisputes?.length || 0,
      } as AdminUser);

      setOrders(userOrders || []);
      setDisputes(userDisputes || []);
      setWarnings(userWarnings || []);
      setBans(userBans || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  return {
    user,
    warnings,
    bans,
    orders,
    disputes,
    isLoading,
    refetch: fetchUserDetails,
  };
}

export function useAdminUserAction() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const executeAction = async (
    userId: string,
    action: 'warn' | 'suspend' | 'ban',
    reason: string,
    notes?: string,
    durationDays?: number
  ) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('admin-user-action', {
        body: {
          userId,
          action,
          reason,
          notes,
          durationDays,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Success',
        description: `User ${action} action completed successfully`,
      });

      return true;
    } catch (error) {
      console.error('Error executing user action:', error);
      toast({
        title: 'Error',
        description: `Failed to ${action} user`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    executeAction,
    isSubmitting,
  };
}
