import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AvailabilityMode = "live" | "discrete" | "offline";

export interface Profile {
  id: string;
  user_id: string;
  avatar_url: string | null;
  text_status: string;
  availability_mode: AvailabilityMode;
  username: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
      return;
    }

    if (!data) {
      // Create profile
      const { data: newProfile, error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, availability_mode: "live", text_status: "" })
        .select()
        .single();
      if (!insertErr && newProfile) {
        setProfile(newProfile as unknown as Profile);
      }
    } else {
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Pick<Profile, "avatar_url" | "text_status" | "availability_mode" | "username">>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();
    if (!error && data) {
      setProfile(data as unknown as Profile);
    }
    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) { console.error("Upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateProfile({ avatar_url: url });
    return url;
  };

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetchProfile };
};
