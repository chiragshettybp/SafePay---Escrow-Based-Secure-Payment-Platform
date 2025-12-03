import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

export function useOrderEvents(orderId: string) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['order-events', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrderEvent[];
    },
    enabled: !!user?.id && !!orderId,
  });
}
