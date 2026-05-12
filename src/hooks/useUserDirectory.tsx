import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DirectoryEntry {
  user_id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface DirectoryCtx {
  byEmail: Map<string, DirectoryEntry>;
  byUserId: Map<string, DirectoryEntry>;
  getName: (emailOrId: string | null | undefined) => string;
  getAvatar: (emailOrId: string | null | undefined) => string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DirectoryCtx | null>(null);

const fallbackName = (email?: string | null) => {
  if (!email) return "User";
  return email.includes("@") ? email.split("@")[0] : email;
};

export const UserDirectoryProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, email, username, avatar_url");
    if (data) setEntries(data as DirectoryEntry[]);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("profiles-directory")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const { byEmail, byUserId } = useMemo(() => {
    const e = new Map<string, DirectoryEntry>();
    const u = new Map<string, DirectoryEntry>();
    for (const x of entries) {
      if (x.email) e.set(x.email.toLowerCase(), x);
      if (x.user_id) u.set(x.user_id, x);
    }
    return { byEmail: e, byUserId: u };
  }, [entries]);

  const getEntry = useCallback((key?: string | null) => {
    if (!key) return undefined;
    if (key.includes("@")) return byEmail.get(key.toLowerCase());
    return byUserId.get(key);
  }, [byEmail, byUserId]);

  const getName = useCallback((key?: string | null) => {
    const e = getEntry(key);
    return e?.username || fallbackName(e?.email || (key && key.includes("@") ? key : null));
  }, [getEntry]);

  const getAvatar = useCallback((key?: string | null) => {
    return getEntry(key)?.avatar_url || null;
  }, [getEntry]);

  const value: DirectoryCtx = { byEmail, byUserId, getName, getAvatar, refresh: fetchAll };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUserDirectory = () => {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // graceful fallback if not wrapped
    return {
      byEmail: new Map(),
      byUserId: new Map(),
      getName: (k?: string | null) => fallbackName(k),
      getAvatar: () => null,
      refresh: async () => {},
    } as DirectoryCtx;
  }
  return ctx;
};
