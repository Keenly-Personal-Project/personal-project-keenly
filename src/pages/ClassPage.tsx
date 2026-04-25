import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import { generateHexCode } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Image as ImageIcon, Plus, X, Heart, Trash2, Mic, Shield, ShieldCheck, Crown, Users, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import AttendanceSection from "@/components/AttendanceSection";

const sidebarTabs = ["Announcements", "Attendance", "Recordings", "Events", "Notes/Guides", "Details"];

type KeenRole = "owner" | "admin" | "member";

const roleConfig: Record<KeenRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  owner: { label: "Owner", icon: Crown, color: "hsl(45, 93%, 47%)", description: "Full control — can assign roles and manage everything" },
  admin: { label: "Admin", icon: ShieldCheck, color: "hsl(210, 80%, 55%)", description: "Can update sections — announcements, events, notes, etc." },
  member: { label: "Member", icon: Shield, color: "hsl(var(--muted-foreground))", description: "View-only access to all sections" },
};

interface Announcement {
  id: string;
  brief: string;
  description: string;
  image?: string;
  images?: string[];
  date?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
}

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  images?: string[];
  color?: string;
  textColor?: string;
  date?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
}

const PendingJoinRequests = ({ slug }: { slug: string }) => {
  const [pendingRequests, setPendingRequests] = useState<{ id: string; user_id: string; email: string; created_at: string }[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("keen_join_requests")
        .select("id, user_id, email, created_at")
        .eq("class_slug", slug)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      setPendingRequests(data || []);
      setLoadingRequests(false);
    };
    fetchRequests();

    const channel = supabase
      .channel(`join-requests-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "keen_join_requests", filter: `class_slug=eq.${slug}` }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  if (loadingRequests || pendingRequests.length === 0) return null;

  return (
    <div className="rounded-lg border border-foreground/20 bg-card p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Pending Join Requests ({pendingRequests.length})</h4>
      </div>
      <div className="space-y-3">
        {pendingRequests.map((req) => (
          <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {req.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{req.email.split("@")[0]} requests to join</p>
                <p className="text-xs text-muted-foreground">{req.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={async () => {
                  const { error: memberError } = await supabase.from("keen_members").insert({
                    class_slug: slug,
                    user_id: req.user_id,
                    email: req.email,
                    role: "member",
                  });
                  if (memberError) {
                    toast.error("Failed to add member.");
                    return;
                  }
                  await supabase.from("keen_join_requests").update({ status: "approved" }).eq("id", req.id);
                  toast.success(`Approved ${req.email.split("@")[0]}!`);
                  setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                  window.dispatchEvent(new Event("keen_classes_updated"));
                }}
              >
                Allow
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={async () => {
                  await supabase.from("keen_join_requests").update({ status: "rejected" }).eq("id", req.id);
                  toast.info(`Declined ${req.email.split("@")[0]}'s request.`);
                  setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
}

function getImages(ann: Announcement): string[] {
  if (ann.images && ann.images.length > 0) return ann.images;
  if (ann.image) return [ann.image];
  return [];
}

const EventCardCarousel = ({ images }: { images: string[] }) => {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const total = images.length;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) {
      timerRef.current = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrent((prev) => (prev + 1) % total);
          setTimeout(() => setIsAnimating(false), 20);
        }, 250);
      }, 3000);
    }
  }, [total]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return (
    <div className="px-4" onMouseEnter={startTimer} onMouseLeave={stopTimer}>
      <div className="rounded-md overflow-hidden aspect-video flex items-center justify-center bg-black/10 relative">
        <div
          className="w-full h-full flex items-center justify-center transition-all duration-300 ease-in-out"
          style={{ opacity: isAnimating ? 0 : 1, transform: isAnimating ? "translateX(-30px)" : "translateX(0)" }}
        >
          <img src={images[current]} alt="" className="max-w-full max-h-full object-contain" />
        </div>
        {total > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === current ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function PublisherBadge({ email, avatarUrl }: { email: string; avatarUrl?: string | null }) {
  const name = email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 mb-2">
      <Avatar className="h-6 w-6">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-muted-foreground">{name}</span>
    </div>
  );
}

const ClassPage = () => {
  const { className } = useParams<{ className: string }>();
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "Announcements";
  const slug = decodeURIComponent(className || "");
  const storageKey = `keen_announcements_${slug}`;
  const notesKey = `keen_notes_${slug}`;
  const eventsKey = `keen_events_${slug}`;
  const favKey = `keen_event_favs_${slug}`;
  const recordingsKey = `keen_recordings_${slug}`;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [onlineMembers, setOnlineMembers] = useState<{ user_id: string; email: string; avatar_url?: string }[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBrief, setNewBrief] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [imageUploading, setImageUploading] = useState(false);
  // Source-of-truth role: read from DB (keen_members). Defaults to "member" for safety.
  const [previewRole, setPreviewRole] = useState<KeenRole>("member");
  const [roleLoading, setRoleLoading] = useState(true);
  const canEdit = previewRole === "owner" || previewRole === "admin";
  const canManage = previewRole === "owner";

  // Role management state
  const [keenMembers, setKeenMembers] = useState<{ id: string; user_id: string; email: string; role: KeenRole }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [transferOwnerTarget, setTransferOwnerTarget] = useState<{ id: string; email: string } | null>(null);
  const [keenCode, setKeenCode] = useState<string>("");

  // Fetch the shared Keen code from the database
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from as any)("keens")
        .select("code")
        .eq("slug", slug)
        .maybeSingle();
      if (!cancelled && data?.code) setKeenCode(data.code);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(notesKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem(eventsKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [favoritedEvents, setFavoritedEvents] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(favKey);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Fetch the current user's role from the database (source of truth).
  const fetchMyRole = useCallback(async () => {
    if (!user) return;
    setRoleLoading(true);
    const { data } = await (supabase.from as any)("keen_members")
      .select("role")
      .eq("class_slug", slug)
      .eq("user_id", user.id)
      .maybeSingle();
    const r = data?.role;
    setPreviewRole(r === "owner" || r === "admin" || r === "member" ? r : "member");
    setRoleLoading(false);
  }, [user, slug]);

  useEffect(() => { fetchMyRole(); }, [fetchMyRole]);

  // Listen for role changes (e.g., owner promotes/demotes you, removes you)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-role-${slug}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'keen_members', filter: `user_id=eq.${user.id}` }, () => {
        fetchMyRole();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug, user, fetchMyRole]);
  // Realtime Presence for online members
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`keen-presence-${slug}`);
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const members: { user_id: string; email: string; avatar_url?: string }[] = [];
      const seen = new Set<string>();
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((p: any) => {
          if (!seen.has(p.user_id)) {
            seen.add(p.user_id);
            members.push({ user_id: p.user_id, email: p.email, avatar_url: p.avatar_url });
          }
        });
      });
      setOnlineMembers(members);
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          email: user.email || '',
          avatar_url: profile?.avatar_url || null,
          online_at: new Date().toISOString(),
        });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [slug, user, profile?.avatar_url]);


  // Fetch keen members for role management
  const fetchKeenMembers = useCallback(async () => {
    if (!user || previewRole !== "owner") return;
    setLoadingMembers(true);
    const { data, error } = await (supabase.from as any)("keen_members")
      .select("id, user_id, email, role")
      .eq("class_slug", slug);
    if (!error && data) {
      setKeenMembers(data.map((m: any) => ({ id: m.id, user_id: m.user_id, email: m.email, role: m.role as KeenRole })));
    }
    setLoadingMembers(false);
  }, [user, slug, previewRole]);

  useEffect(() => {
    if (activeTab === "Details" && previewRole === "owner") {
      fetchKeenMembers();
    }
  }, [activeTab, previewRole, fetchKeenMembers]);

  const handleRoleChange = async (memberId: string, memberEmail: string, newRole: KeenRole) => {
    if (newRole === "owner") {
      setTransferOwnerTarget({ id: memberId, email: memberEmail });
      return;
    }
    const { error } = await (supabase.from as any)("keen_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) {
      toast.error("Failed to update role");
      return;
    }
    toast.success(`Role updated to ${roleConfig[newRole].label}`);
    fetchKeenMembers();
  };

  const confirmTransferOwnership = async () => {
    if (!transferOwnerTarget || !user) return;
    const myMembership = keenMembers.find(m => m.user_id === user.id && m.role === "owner");
    if (!myMembership) { toast.error("Could not find your membership"); return; }
    const { error: e1 } = await (supabase.from as any)("keen_members")
      .update({ role: "owner" })
      .eq("id", transferOwnerTarget.id);
    if (e1) { toast.error("Failed to transfer ownership"); return; }
    const { error: e2 } = await (supabase.from as any)("keen_members")
      .update({ role: "member" })
      .eq("id", myMembership.id);
    if (e2) { toast.error("Failed to update your role"); return; }
    toast.success(`Ownership transferred to ${transferOwnerTarget.email.split("@")[0]}`);
    setPreviewRole("member");
    setTransferOwnerTarget(null);
    fetchKeenMembers();
  };

  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: string; email: string } | null>(null);
  const confirmRemoveMember = async () => {
    if (!removeMemberTarget) return;
    const { error } = await (supabase.from as any)("keen_members")
      .delete()
      .eq("id", removeMemberTarget.id);
    if (error) { toast.error("Failed to remove member"); return; }
    toast.success(`${removeMemberTarget.email.split("@")[0]} removed from the Keen`);
    setRemoveMemberTarget(null);
    fetchKeenMembers();
  };

  interface Recording {
    id: string;
    title: string;
    description: string;
    mediaUrl: string;
    mediaType: string;
    mediaName: string;
    duration: number;
    date?: string;
    userId?: string;
    publisherEmail?: string;
    publisherAvatar?: string | null;
  }

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  // Fetch recordings from DB
  useEffect(() => {
    const fetchRecordings = async () => {
      setLoadingRecordings(true);
      const { data, error } = await (supabase.from as any)("meeting_recordings")
        .select("*")
        .eq("class_name", slug)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch meeting recordings", error);
        setRecordings([]);
        setLoadingRecordings(false);
        return;
      }

      if (data) {
        setRecordings(data.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          mediaUrl: r.media_url,
          mediaType: r.media_type,
          mediaName: r.media_name,
          duration: r.duration || 0,
          date: r.created_at,
          userId: r.user_id,
        })));
      }
      setLoadingRecordings(false);
    };
    fetchRecordings();
  }, [slug]);

  const [deleteRecordingId, setDeleteRecordingId] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  useEscapeBack("/", [addDialogOpen, !!deleteEventId]);

  const toggleFavorite = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritedEvents((prev) => {
      const next = new Set(prev);
      const wasFav = next.has(eventId);
      if (wasFav) next.delete(eventId);
      else {
        next.add(eventId);
        toast("Saved for you");
      }
      localStorage.setItem(favKey, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem(notesKey);
    if (saved) setNotes(JSON.parse(saved));
  }, [activeTab, notesKey]);

  useEffect(() => {
    const saved = localStorage.getItem(eventsKey);
    if (saved) setEvents(JSON.parse(saved));
  }, [activeTab, eventsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(announcements));
    } catch (e) {
      console.warn("LocalStorage quota exceeded for announcements. Clearing images from stored data.");
      const withoutImages = announcements.map((a) => ({ ...a, image: undefined, images: undefined }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(withoutImages));
      } catch {
        console.error("Still cannot save announcements to localStorage");
      }
    }
  }, [announcements, storageKey]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const savedClasses = JSON.parse(localStorage.getItem("keen_classes") || "[]");
  const matchedClass = savedClasses.find(
    (cls: { name: string }) => cls.name.toLowerCase().replace(/\s+/g, "-") === slug,
  );
  const displayName = matchedClass?.name || slug.replace(/-/g, " ");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const filePath = `announcements/${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error } = await supabase.storage.from("note-attachments").upload(filePath, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("note-attachments").getPublicUrl(filePath);
        setNewImages((prev) => [...prev, urlData.publicUrl]);
      }
    } catch (err) {
      console.error("Image upload failed, falling back to base64", err);
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (ev) => setNewImages((prev) => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      }
    } finally {
      setImageUploading(false);
    }
  };

  const handleAddAnnouncement = () => {
    if (!newBrief.trim()) return;
    const newAnn: Announcement = {
      id: Date.now().toString(),
      brief: newBrief.trim(),
      description: newDescription.trim(),
      images: newImages.length > 0 ? newImages : undefined,
      date: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
      publisherEmail: user?.email || "Unknown",
      publisherAvatar: profile?.avatar_url || null,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    setNewBrief("");
    setNewDescription("");
    setNewImages([]);
    setNewDate(new Date().toISOString().split("T")[0]);
    setAddDialogOpen(false);
  };

  const renderContent = () => {
    const contentWrapper = (children: React.ReactNode, title: string) => (
      <div className="rounded-xl border border-foreground/30 bg-muted/30 p-6 min-h-[38rem]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {canEdit && (title === "Announcements" || title === "Events") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              onClick={() => {
                if (title === "Events") navigate(`/class/${className}/event/new`);
                else setAddDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          )}
        </div>
        {children}
      </div>
    );

    if (activeTab === "Announcements") {
      return contentWrapper(
        announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            No announcements yet. Add one to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const email = ann.publisherEmail || user?.email || "";
              const imgs = getImages(ann);

              return (
                <article
                  key={ann.id}
                  onClick={() => navigate(`/class/${className}/announcement/${ann.id}`)}
                  className="group p-5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all cursor-pointer border-2 border-primary hover:border-primary/80 overflow-hidden"
                >
                  <PublisherBadge email={email} avatarUrl={ann.publisherAvatar} />

                  <h3
                    className="font-bold text-foreground underline underline-offset-2 break-words mb-1"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {ann.brief}
                  </h3>

                  {ann.description && (
                    <p
                      className="text-sm text-muted-foreground leading-relaxed mb-3 break-words line-clamp-3"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {ann.description}
                    </p>
                  )}

                  {imgs.length > 0 && (
                    <div
                      className={`grid gap-2 mb-2 ${imgs.length === 1 ? "grid-cols-1 max-w-md" : imgs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
                    >
                      {imgs.slice(0, 3).map((img, i) => (
                        <div key={i} className="rounded-md overflow-hidden border border-border bg-muted/30">
                          <img src={img} alt="" className="w-full object-contain max-h-64" />
                        </div>
                      ))}
                    </div>
                  )}
                  {imgs.length > 3 && (
                    <p className="text-xs text-muted-foreground mb-2">
                      +{imgs.length - 3} more image{imgs.length - 3 > 1 ? "s" : ""}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(ann.date) || "No date"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ),
        "Announcements",
      );
    }
    if (activeTab === "Notes/Guides") {
      const handleAddNote = () => {
        navigate(`/class/${className}/note/new`);
      };

      return contentWrapper(
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {notes.map((note) => {
            const noteEmail = note.publisherEmail || user?.email || "";
            return (
              <button
                key={note.id}
                onClick={() => navigate(`/class/${className}/note/${note.id}`)}
                className="aspect-square p-5 text-left hover:opacity-80 transition-all cursor-pointer flex flex-col"
                style={{
                  borderRadius: "0.75rem",
                  WebkitBorderRadius: "0.75rem",
                  background: note.color?.includes("gradient")
                    ? `linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, ${note.color} border-box`
                    : "hsl(var(--card))",
                  border: note.color?.includes("gradient")
                    ? "3px solid transparent"
                    : `3px solid ${note.color || "hsl(var(--border))"}`,
                  overflow: "hidden",
                }}
              >
                <PublisherBadge email={noteEmail} avatarUrl={note.publisherAvatar} />
                <p
                  className="text-sm font-bold underline underline-offset-2 mb-2 shrink-0"
                  style={{ color: note.color || "hsl(var(--foreground))" }}
                >
                  {note.title || "Untitled"}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-[8] flex-1 overflow-hidden">
                  {(() => {
                    try {
                      const parsed = JSON.parse(note.content);
                      if (Array.isArray(parsed)) {
                        const textBlock = parsed.find((b: any) => b.type === "text" && b.data?.content?.trim());
                        return textBlock ? textBlock.data.content.trim().substring(0, 200) : "Empty note...";
                      }
                    } catch {}
                    return note.content || "Empty note...";
                  })()}
                </p>
              </button>
            );
          })}
          {canEdit && (
            <button
              onClick={handleAddNote}
              className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Add notes</span>
            </button>
          )}
        </div>,
        "Notes/Guides",
      );
    }
    if (activeTab === "Recordings") {
      const deleteRecording = async (id: string) => {
        const { error } = await (supabase.from as any)("meeting_recordings").delete().eq("id", id);
        if (error) {
          toast.error("Failed to delete recording.");
          return;
        }
        setRecordings((prev) => prev.filter((r) => r.id !== id));
        setDeleteRecordingId(null);
        toast.success("Recording deleted");
      };

      return contentWrapper(
        <div className="grid grid-cols-1 gap-4">
          {canEdit && (
            <button
              onClick={() => navigate(`/class/${className}/recording/new`)}
              className="w-full rounded-xl border border-foreground/30 flex items-center justify-center py-12 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Plus className="h-8 w-8 text-foreground" />
            </button>
          )}

          {recordings.map((rec) => {
            const email = rec.publisherEmail || user?.email || "";
            return (
              <div key={rec.id} className="rounded-xl border border-foreground/30 bg-card overflow-hidden">
                <div className="p-4 pb-2">
                  <PublisherBadge email={email} avatarUrl={rec.publisherAvatar} />
                  <h3 className="text-sm font-semibold text-foreground">{rec.title}</h3>
                </div>

                {/* Media preview */}
                <div className="px-4">
                  {rec.mediaType.startsWith("video/") ? (
                    <video controls className="w-full rounded-md" src={rec.mediaUrl} />
                  ) : (
                    <audio controls className="w-full" src={rec.mediaUrl} />
                  )}
                </div>

                {rec.description && (
                  <p className="px-4 pt-2 text-sm text-muted-foreground whitespace-pre-wrap">{rec.description}</p>
                )}

                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground">{formatDate(rec.date)}</span>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-7 px-2"
                      onClick={() => setDeleteRecordingId(rec.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Delete recording confirmation */}
          <AlertDialog open={!!deleteRecordingId} onOpenChange={() => setDeleteRecordingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteRecordingId && deleteRecording(deleteRecordingId)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>,
        "Recordings",
      );
    }
    if (activeTab === "Events") {
      return contentWrapper(
        events.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            No events yet. Add one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => {
              const email = ev.publisherEmail || user?.email || "";
              const isFav = favoritedEvents.has(ev.id);
              const evColor = ev.color || "hsl(var(--primary))";
              const isGradient = evColor.includes("gradient");
              const textCol = ev.textColor || undefined;
              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/class/${className}/event/${ev.id}`)}
                  className="overflow-hidden flex flex-col cursor-pointer hover:opacity-90 transition-all"
                  style={{
                    borderRadius: "0.75rem",
                    background: isGradient ? evColor : evColor,
                    color: textCol,
                  }}
                >
                  {/* Publisher badge */}
                  <div className="flex items-center gap-2 px-4 pt-4">
                    <Avatar className="h-8 w-8">
                      {ev.publisherAvatar && <AvatarImage src={ev.publisherAvatar} alt={email} />}
                      <AvatarFallback className="bg-background/30 text-inherit text-[10px] font-semibold">
                        {email.split("@")[0].slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium leading-tight" style={{ color: textCol || "inherit" }}>
                        {email.split("@")[0]}
                      </span>
                      <span className="text-[10px] leading-tight opacity-70" style={{ color: textCol || "inherit" }}>
                        {formatDate(ev.date)}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-center font-bold underline underline-offset-2 px-4 pt-3 pb-2 break-words"
                    style={{ overflowWrap: "anywhere", color: textCol || "inherit" }}
                  >
                    {ev.title}
                  </h3>

                  {/* Images */}
                  {ev.images && ev.images.length > 0 && <EventCardCarousel images={ev.images} />}

                  {/* Description */}
                  {ev.description && (
                    <p
                      className="text-sm leading-relaxed px-4 pt-3 break-words line-clamp-3 opacity-80"
                      style={{ overflowWrap: "anywhere", color: textCol || "inherit" }}
                    >
                      {ev.description}
                    </p>
                  )}

                  {/* Favorite & Delete */}
                  <div className="mt-auto px-4 pb-4 pt-3 flex items-center justify-between">
                    <button onClick={(e) => toggleFavorite(ev.id, e)} className="transition-transform active:scale-90">
                      <Heart
                        className={`h-5 w-5 transition-colors ${isFav ? "fill-destructive text-destructive" : "opacity-60 hover:opacity-100"}`}
                        style={{ color: isFav ? undefined : textCol || "currentColor" }}
                      />
                    </button>
                    {canEdit && ev.publisherEmail === user?.email && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteEventId(ev.id); }}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" style={{ color: textCol || "currentColor" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ),
        "Events",
      );
    }
    if (activeTab === "Attendance") {
      return contentWrapper(
        <AttendanceSection classSlug={slug} previewRole={previewRole} />,
        "Attendance",
      );
    }
    if (activeTab === "Details") {
      const currentRole = roleConfig[previewRole];
      const RoleIcon = currentRole.icon;

      return (
        <div className="rounded-xl border border-foreground/30 bg-muted/30 p-6 min-h-[38rem]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
          </div>

          {/* Keen Code */}
          {keenCode && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-card">
              <p className="text-xs font-medium text-muted-foreground mb-1">Keen Code</p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-bold tracking-[0.3em] text-foreground">{keenCode}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(keenCode);
                    toast.success("Code copied to clipboard!");
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Share this code so others can request to join this Keen.</p>
            </div>
          )}

          {/* Online Members */}
          {onlineMembers.length > 0 && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs font-medium text-muted-foreground">
                  {onlineMembers.length} member{onlineMembers.length !== 1 ? "s" : ""} online
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {onlineMembers.map((m) => {
                  const name = m.email.split("@")[0];
                  const initials = name.slice(0, 2).toUpperCase();
                  return (
                    <div key={m.user_id} className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          {m.avatar_url && <AvatarImage src={m.avatar_url} alt={name} />}
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                      </div>
                      <span className="text-xs text-foreground font-medium">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-foreground/20 bg-card p-5 mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="You" />}
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {(user?.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{user?.email?.split("@")[0] || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="gap-1 px-3 py-1 text-xs font-semibold border-0"
                  style={{ backgroundColor: currentRole.color, color: "#fff" }}
                >
                  <RoleIcon className="h-3 w-3" />
                  {currentRole.label}
                </Badge>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{currentRole.description}</p>
          </div>

          {/* Role Assignment (Owner only) */}
          {previewRole === "owner" && (
            <div className="rounded-lg border border-foreground/20 bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Manage Roles</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                As the owner, you can assign and change roles for members of this Keen.
              </p>
              
              {loadingMembers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : keenMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No members found. Invite members to manage their roles here.
                </p>
              ) : (
                <div className="space-y-3">
                  {keenMembers
                    .sort((a, b) => {
                      const order: Record<string, number> = { owner: 0, admin: 1, member: 2 };
                      return (order[a.role] ?? 3) - (order[b.role] ?? 3);
                    })
                    .map((member) => {
                      const mCfg = roleConfig[member.role];
                      const MIcon = mCfg.icon;
                      const isSelf = member.user_id === user?.id;
                      const memberName = member.email.split("@")[0];
                      return (
                        <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {isSelf && profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                {memberName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {memberName}{isSelf ? " (You)" : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          {isSelf ? (
                            <Badge
                              className="gap-1 px-2.5 py-0.5 text-[10px] font-semibold border-0"
                              style={{ backgroundColor: mCfg.color, color: "#fff" }}
                            >
                              <MIcon className="h-2.5 w-2.5" />
                              {mCfg.label}
                            </Badge>
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(val) => handleRoleChange(member.id, member.email, val as KeenRole)}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-1.5">
                                    <Shield className="h-3 w-3" /> Member
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-3 w-3" /> Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="owner">
                                  <div className="flex items-center gap-1.5">
                                    <Crown className="h-3 w-3" /> Owner
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Transfer Ownership Confirmation */}
          <AlertDialog open={!!transferOwnerTarget} onOpenChange={(open) => !open && setTransferOwnerTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to transfer ownership to <strong>{transferOwnerTarget?.email.split("@")[0]}</strong>?
                  You will become a regular member and lose owner privileges.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmTransferOwnership}>
                  Transfer Ownership
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Non-owner info */}
          {previewRole !== "owner" && (
            <div className="rounded-lg border border-foreground/20 bg-card p-5">
              <p className="text-xs text-muted-foreground italic">
                Only the owner can manage roles in this Keen.
              </p>
            </div>
          )}
          {/* Pending Join Requests (Owner/Admin only) */}
          {canEdit && <PendingJoinRequests slug={slug} />}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm italic">No content yet for {activeTab}.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-6 px-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-2 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center -mt-4 mb-2" style={{ marginTop: "-0.75rem" }}>
          <h1
            className="text-3xl md:text-4xl font-bold text-foreground underline underline-offset-4"
            style={{ fontFamily: "'Amatic SC', cursive" }}
          >
            {displayName}
          </h1>
        </div>
        <div className="text-center mb-6">
          <p className="text-xl md:text-2xl text-foreground mt-3">{activeTab}</p>
        </div>
        {/* Mobile tab bar */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4">
          {sidebarTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg border text-xs font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground border-primary px-5" : "bg-card text-foreground border-border"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Semicircle hover nav (desktop) */}
        <div className="hidden md:block fixed left-0 top-1/2 -translate-y-1/2 z-30 group">
          <div className="flex items-center">
            {/* Semicircle trigger */}
            <div className="w-5 h-20 bg-primary rounded-r-full flex items-center justify-center cursor-pointer shadow-md group-hover:w-6 transition-all duration-200">
              <span className="text-primary-foreground text-xs font-bold select-none">&gt;</span>
            </div>
            {/* Flyout menu – separate boxes */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
              <div className="flex flex-col items-start gap-2">
                {sidebarTabs.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-left py-4 rounded-lg border text-sm font-medium transition-all duration-200 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 hover:translate-x-1 ${
                      activeTab === tab
                        ? "bg-primary text-primary-foreground border-primary px-6 w-[13rem]"
                        : "bg-card text-foreground border-foreground/30 hover:bg-muted px-4 w-48"
                    }`}
                    style={{ transitionDelay: `${i * 50}ms`, animationDelay: `${i * 50}ms` }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content area – full width */}
        <div className="w-full">{renderContent()}</div>
      </main>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brief (shown in list)</Label>
              <Input placeholder="Short summary..." value={newBrief} onChange={(e) => setNewBrief(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                placeholder="Detailed description..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Pictures (optional)
              </Label>
              <Input type="file" accept="image/*" multiple onChange={handleImageUpload} />
              {imageUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {newImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {newImages.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAnnouncement}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => { if (!open) setDeleteEventId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteEventId) return;
                const updated = events.filter((ev) => ev.id !== deleteEventId);
                setEvents(updated);
                localStorage.setItem(eventsKey, JSON.stringify(updated));
                setDeleteEventId(null);
                toast("Event deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassPage;
