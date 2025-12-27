import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  auth_provider: 'email' | 'phone' | 'both' | 'google' | 'apple' | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export function useProfile() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: updated, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload avatar mutation
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile,
    uploadAvatar,
  };
}
