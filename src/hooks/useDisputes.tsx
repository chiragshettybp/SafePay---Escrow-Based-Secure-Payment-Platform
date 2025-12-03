import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';

export interface CreateDisputeData {
  order_id: string;
  reason: string;
  description: string;
  documents?: string[];
}

export function useDisputes() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const createDispute = useMutation({
    mutationFn: async (data: CreateDisputeData) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('disputes')
        .insert({
          order_id: data.order_id,
          customer_id: user.id,
          reason: data.reason,
          description: data.description,
          documents: data.documents || [],
        });

      if (error) throw error;

      // Update order status to disputed
      await supabase
        .from('orders')
        .update({ status: 'disputed' })
        .eq('id', data.order_id)
        .eq('customer_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
      toast({
        title: "Dispute Submitted",
        description: "Your dispute has been submitted for review.",
      });
    },
    onError: (error) => {
      console.error('Error creating dispute:', error);
      toast({
        title: "Error",
        description: "Failed to submit dispute. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadDocument = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('dispute-documents')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    return fileName;
  };

  return {
    createDispute: createDispute.mutate,
    isCreating: createDispute.isPending,
    uploadDocument,
  };
}
