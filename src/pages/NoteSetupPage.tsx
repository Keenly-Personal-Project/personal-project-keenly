import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import NoteColorPicker from "@/components/NoteColorPicker";

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
}

const NoteSetupPage = () => {
  const { className } = useParams<{ className: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState("hsl(175, 70%, 40%)");

  const slug = decodeURIComponent(className || "");
  const notesKey = `keen_notes_${slug}`;

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

  const handleCreate = () => {
    if (!title.trim()) return;
    const saved = localStorage.getItem(notesKey);
    const notes: Note[] = saved ? JSON.parse(saved) : [];
    const newNote: Note = {
      id: Date.now().toString(),
      title: title.trim(),
      content: "",
      color: selectedColor,
    };
    const updated = [newNote, ...notes];
    localStorage.setItem(notesKey, JSON.stringify(updated));
    navigate(`/class/${className}/note/${newNote.id}`, { replace: true });
  };

  const isGradient = selectedColor.startsWith("linear-gradient");

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Header />
      <main className="container py-6 px-4 max-w-md mx-auto">
        <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Notes%2FGuides`)} className="gap-2 mb-8">
          <ArrowLeft className="h-4 w-4" /> All Notes
        </Button>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">Create a New Note</h1>
            <p className="text-sm text-muted-foreground">Give your note a name and pick a color</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Note Name</label>
            <Input placeholder="e.g. Chapter 5 Summary" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="text-base" />
          </div>

          <NoteColorPicker value={selectedColor} onChange={setSelectedColor} />

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Preview</label>
            <div
              className="aspect-[4/3] rounded-xl p-5 flex flex-col border border-border/50"
              style={{
                background: isGradient ? selectedColor + "22" : (selectedColor + "22"),
                borderColor: isGradient ? undefined : (selectedColor + "44"),
                ...(isGradient ? { borderImage: selectedColor + " 1" } : {}),
              }}
            >
              <p className="text-sm font-bold underline underline-offset-2 mb-2" style={{ color: isGradient ? undefined : selectedColor }}>
                {title || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground">Your note content will appear here...</p>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!title.trim()} className="w-full h-12 text-base font-semibold">
            Create Note
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NoteSetupPage;
