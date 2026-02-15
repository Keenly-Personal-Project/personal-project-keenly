import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Image as ImageIcon, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

const sidebarTabs = [
  "Announcements",
  "Absentee List",
  "Meeting Recordings",
  "Events List",
  "Notes/Guides",
];

const quotes = [
  "Everything is unpredictable, calculus was made because an apple fell on someone's head.",
  "The only way to do great work is to love what you do.",
  "Education is the most powerful weapon which you can use to change the world.",
  "In the middle of difficulty lies opportunity.",
];

interface Announcement {
  id: string;
  brief: string;
  description: string;
  image?: string;
}

const ClassPage = () => {
  const { className } = useParams<{ className: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Announcements");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBrief, setNewBrief] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const slug = decodeURIComponent(className || "");
  const storageKey = `keen_announcements_${slug}`;

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(announcements));
  }, [announcements, storageKey]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
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
  const randomQuote = quotes[displayName.length % quotes.length];

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
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setNewBrief("");
    setNewDescription("");
    setNewImage("");
    setAddDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const renderContent = () => {
    if (activeTab === "Announcements") {
      return (
        <div className="rounded-xl border-2 border-border bg-card p-6 max-w-lg mx-auto min-h-[24rem]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Announcements</h3>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No announcements yet. Add one to get started.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="border border-border rounded-lg p-3 relative group">
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium">{ann.brief}</p>
                      {expandedId === ann.id && (
                        <div className="mt-2 space-y-2">
                          {ann.description && <p className="text-xs text-muted-foreground">{ann.description}</p>}
                          {ann.image && (
                            <img src={ann.image} alt="" className="rounded-md max-h-40 object-cover" />
                          )}
                        </div>
                      )}
                    </div>
                    {ann.image && !expandedId ? (
                      <div className="w-14 h-10 rounded border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={ann.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : !ann.image ? null : null}
                    <button
                      onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                      className="shrink-0 mt-0.5"
                    >
                      {expandedId === ann.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-2 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Title - pushed higher */}
        <div className="text-center mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground underline underline-offset-4">
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
              className={`whitespace-nowrap px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground border-primary px-5"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex gap-6">
          <div className="flex flex-col gap-2 w-48 shrink-0">
            {sidebarTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left py-4 rounded-lg border text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground border-primary px-6 w-[13rem]"
                    : "bg-card text-foreground border-border hover:bg-muted px-4 w-48"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1">
            {renderContent()}
          </div>

          <div className="w-56 shrink-0 flex items-start pt-12">
            <p className="text-sm text-muted-foreground italic text-center leading-relaxed">{randomQuote}</p>
          </div>
        </div>

        {/* Mobile content */}
        <div className="md:hidden">
          {renderContent()}
          <p className="text-sm text-muted-foreground italic text-center mt-4">{randomQuote}</p>
        </div>
      </main>

      {/* Add Announcement Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brief (shown in list)</Label>
              <Input
                placeholder="Short summary..."
                value={newBrief}
                onChange={(e) => setNewBrief(e.target.value)}
              />
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
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Picture (optional)</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} />
              {newImage && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewImage('')}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
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
