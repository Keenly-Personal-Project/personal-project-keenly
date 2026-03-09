import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  title: string;
  content: string;
}

const NoteEditorPage = () => {
  const { className, noteId } = useParams<{ className: string; noteId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const slug = decodeURIComponent(className || "");
  const notesKey = `keen_notes_${slug}`;

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(notesKey);
    return saved ? JSON.parse(saved) : [];
  });

  const currentNote = notes.find((n) => n.id === noteId);
  const [title, setTitle] = useState(currentNote?.title || "Untitled");
  const [content, setContent] = useState(currentNote?.content || "");

  const saveNotes = useCallback(
    (updatedNotes: Note[]) => {
      localStorage.setItem(notesKey, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    },
    [notesKey]
  );

  // Auto-save on title/content change
  useEffect(() => {
    const updated = notes.map((n) =>
      n.id === noteId ? { ...n, title, content } : n
    );
    // Only save if note exists
    if (notes.some((n) => n.id === noteId)) {
      localStorage.setItem(notesKey, JSON.stringify(updated));
    }
  }, [title, content, noteId, notesKey, notes]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
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

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      const updated = notes.filter((n) => n.id !== noteId);
      saveNotes(updated);
      navigate(`/class/${className}`, { replace: true });
    }, 300);
  };

  return (
    <div className={`min-h-screen bg-background animate-fade-in ${isDeleting ? "animate-fade-out" : ""}`}>
      <Header />
      <main className="container py-6 px-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/class/${className}`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button variant="destructive" size="sm" className="gap-1" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-4"
        />

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          className="min-h-[60vh] border-none shadow-none focus-visible:ring-0 px-0 resize-none text-base leading-relaxed"
        />
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This note will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NoteEditorPage;
