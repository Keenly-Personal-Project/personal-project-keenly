import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Image as ImageIcon, Plus, X, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";

const sidebarTabs = [
  "Announcements",
  "Absentee List",
  "Meeting Recordings",
  "Events List",
  "Notes/Guides",
];

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
  date?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
}

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
  const [activeTab, setActiveTab] = useState(initialTab);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBrief, setNewBrief] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [imageUploading, setImageUploading] = useState(false);

  const slug = decodeURIComponent(className || "");
  const storageKey = `keen_announcements_${slug}`;
  const notesKey = `keen_notes_${slug}`;

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(notesKey);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const saved = localStorage.getItem(notesKey);
    if (saved) setNotes(JSON.parse(saved));
  }, [activeTab, notesKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(announcements));
    } catch (e) {
      console.warn("LocalStorage quota exceeded for announcements. Clearing images from stored data.");
      const withoutImages = announcements.map(a => ({ ...a, image: undefined, images: undefined }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(withoutImages));
      } catch {
        console.error("Still cannot save announcements to localStorage");
      }
    }
  }, [announcements, storageKey]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const savedClasses = JSON.parse(localStorage.getItem('keen_classes') || '[]');
  const matchedClass = savedClasses.find(
    (cls: { name: string }) => cls.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
  const displayName = matchedClass?.name || slug.replace(/-/g, " ");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `announcements/${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error } = await supabase.storage.from('note-attachments').upload(filePath, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('note-attachments').getPublicUrl(filePath);
        setNewImages(prev => [...prev, urlData.publicUrl]);
      }
    } catch (err) {
      console.error("Image upload failed, falling back to base64", err);
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (ev) => setNewImages(prev => [...prev, ev.target?.result as string]);
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
    setAnnouncements(prev => [newAnn, ...prev]);
    setNewBrief("");
    setNewDescription("");
    setNewImages([]);
    setNewDate(new Date().toISOString().split("T")[0]);
    setAddDialogOpen(false);
  };

  const renderContent = () => {
    const contentWrapper = (children: React.ReactNode, title: string) => (
      <div className="rounded-xl border border-foreground/30 bg-muted/30 p-6 max-w-5xl min-h-[38rem]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {title === "Announcements" && (
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setAddDialogOpen(true)}>
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
          <p className="text-sm text-muted-foreground italic text-center py-8">No announcements yet. Add one to get started.</p>
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

                  <h3 className="font-bold text-foreground underline underline-offset-2 break-words mb-1" style={{ overflowWrap: 'anywhere' }}>
                    {ann.brief}
                  </h3>

                  {ann.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 break-words line-clamp-3" style={{ overflowWrap: 'anywhere' }}>
                      {ann.description}
                    </p>
                  )}

                  {imgs.length > 0 && (
                    <div className={`grid gap-2 mb-2 ${imgs.length === 1 ? 'grid-cols-1 max-w-md' : imgs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {imgs.slice(0, 3).map((img, i) => (
                        <div key={i} className="rounded-md overflow-hidden border border-border bg-muted/30">
                          <img src={img} alt="" className="w-full object-contain max-h-64" />
                        </div>
                      ))}
                    </div>
                  )}
                  {imgs.length > 3 && (
                    <p className="text-xs text-muted-foreground mb-2">+{imgs.length - 3} more image{imgs.length - 3 > 1 ? 's' : ''}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(ann.date)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ),
        "Announcements"
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
                className="p-5 text-left hover:opacity-80 transition-all cursor-pointer flex flex-col"
                style={{
                  borderRadius: "0.75rem",
                  WebkitBorderRadius: "0.75rem",
                  background: note.color?.includes("gradient")
                    ? `linear-gradient(hsl(var(--background)), hsl(var(--background))) padding-box, ${note.color} border-box`
                    : undefined,
                  border: note.color?.includes("gradient")
                    ? "3px solid transparent"
                    : `3px solid ${note.color || "hsl(var(--border))"}`,
                  overflow: "hidden",
                }}
              >
                <PublisherBadge email={noteEmail} avatarUrl={note.publisherAvatar} />
                <p className="text-sm font-bold underline underline-offset-2 mb-2 shrink-0" style={{ color: note.color || "hsl(var(--foreground))" }}>
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
          <button
            onClick={handleAddNote}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Add notes</span>
          </button>
        </div>,
        "Notes/Guides"
      );
    }
    if (activeTab === "Meeting Recordings") {
      return contentWrapper(
        <div>
          <PublisherBadge email={user?.email || "Unknown"} avatarUrl={profile?.avatar_url} />
          <p className="text-muted-foreground text-sm italic text-center py-8">No meeting recordings yet.</p>
        </div>,
        "Meeting Recordings"
      );
    }
    if (activeTab === "Events List") {
      return contentWrapper(
        <div>
          <PublisherBadge email={user?.email || "Unknown"} avatarUrl={profile?.avatar_url} />
          <p className="text-muted-foreground text-sm italic text-center py-8">No events yet.</p>
        </div>,
        "Events List"
      );
    }
    if (activeTab === "Absentee List") {
      return contentWrapper(
        <p className="text-muted-foreground text-sm italic text-center py-8">Absentee tracking coming soon.</p>,
        "Absentee List"
      );
    }

    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm italic">No content yet for {activeTab}.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-2 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center -mt-4 mb-2" style={{ marginTop: '-0.75rem' }}>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground underline underline-offset-4" style={{ fontFamily: "'Amatic SC', cursive" }}>{displayName}</h1>
        </div>
        <div className="text-center mb-6">
          <p className="text-xl md:text-2xl text-foreground mt-3">{activeTab}</p>
        </div>
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4">
          {sidebarTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg border text-xs font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground border-primary px-5" : "bg-card text-foreground border-border"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="hidden md:flex gap-6">
          <div className="flex flex-col gap-2 w-48 shrink-0">
            {sidebarTabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`text-left py-4 rounded-lg border border-foreground/30 text-sm font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground border-primary px-6 w-[13rem]" : "bg-card text-foreground hover:bg-muted px-4 w-48"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1">{renderContent()}</div>
        </div>
        <div className="md:hidden">
          {renderContent()}
        </div>
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
              <Textarea placeholder="Detailed description..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Pictures (optional)</Label>
              <Input type="file" accept="image/*" multiple onChange={handleImageUpload} />
              {imageUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {newImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {newImages.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => setNewImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAnnouncement}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassPage;
