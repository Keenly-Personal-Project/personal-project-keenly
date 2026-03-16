import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Image as ImageIcon, Plus, X, ChevronRight } from "lucide-react";

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
  date?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
}

const ClassPage = () => {
  const { className } = useParams<{ className: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "Announcements";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBrief, setNewBrief] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

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
    localStorage.setItem(storageKey, JSON.stringify(announcements));
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
  

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddAnnouncement = () => {
    if (!newBrief.trim()) return;
    const newAnn: Announcement = {
      id: Date.now().toString(),
      brief: newBrief.trim(),
      description: newDescription.trim(),
      image: newImage || undefined,
      date: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setNewBrief("");
    setNewDescription("");
    setNewImage("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setAddDialogOpen(false);
  };

  const renderContent = () => {
    const contentWrapper = (children: React.ReactNode, title: string) => (
      <div className="rounded-xl border border-foreground/30 bg-card p-6 max-w-5xl min-h-[38rem]">
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
            {announcements.map((ann) => (
              <article
                key={ann.id}
                onClick={() => navigate(`/class/${className}/announcement/${ann.id}`)}
                className="group p-4 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-all cursor-pointer border border-transparent hover:border-border"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {ann.brief}
                      </h3>
                    </div>
                    {ann.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {ann.description}
                      </p>
                    )}
                    {ann.image && (
                      <div className="w-full mb-2">
                        <img src={ann.image} alt="" className="w-full h-auto object-contain" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(ann.date)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </article>
            ))}
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
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => navigate(`/class/${className}/note/${note.id}`)}
              className="aspect-square rounded-xl border-2 p-5 text-left overflow-hidden hover:opacity-80 transition-all cursor-pointer flex flex-col"
              style={{
                backgroundColor: note.color ? note.color + "15" : undefined,
                borderColor: note.color || "hsl(var(--border))",
              }}
            >
              <p className="text-sm font-bold underline underline-offset-2 mb-2 shrink-0" style={{ color: note.color || "hsl(var(--foreground))" }}>
                {note.title || "Untitled"}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-[10] flex-1 overflow-hidden">
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
          ))}
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
        <p className="text-muted-foreground text-sm italic text-center py-8">No meeting recordings yet.</p>,
        "Meeting Recordings"
      );
    }
    if (activeTab === "Events List") {
      return contentWrapper(
        <p className="text-muted-foreground text-sm italic text-center py-8">No events yet.</p>,
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
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Picture (optional)</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} />
              {newImage && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setNewImage('')} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
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
