import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import NoteContentRenderer from "@/components/NoteContentRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, Image as ImageIcon, Loader2, Table, BarChart3, Trash2, Link, Eye, Edit3 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
}

const NoteEditorPage = () => {
  const { className, noteId } = useParams<{ className: string; noteId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saved, setSaved] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [activeView, setActiveView] = useState("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSaved(false);
    const timeout = setTimeout(() => {
      const updated = notes.map((n) =>
        n.id === noteId ? { ...n, title, content } : n
      );
      if (notes.some((n) => n.id === noteId)) {
        localStorage.setItem(notesKey, JSON.stringify(updated));
        setSaved(true);
      }
    }, 500);
    return () => clearTimeout(timeout);
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
      navigate(`/class/${className}?tab=Notes%2FGuides`, { replace: true });
    }, 300);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    setContent(newContent);
    setActiveView("edit");
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      insertAtCursor(`\n![${file.name}](${dataUrl})\n`);
    };
    reader.readAsDataURL(file);
  };

  const handleInsertImageUrl = () => {
    if (imageUrl.trim()) {
      insertAtCursor(`\n![image](${imageUrl.trim()})\n`);
      setImageUrl("");
      setImageDialogOpen(false);
    }
  };

  const handleInsertTable = () => {
    const rows = parseInt(tableRows) || 3;
    const cols = parseInt(tableCols) || 3;
    const header = "| " + Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(" | ") + " |";
    const separator = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
    const body = Array.from({ length: rows }, () =>
      "| " + Array.from({ length: cols }, () => "   ").join(" | ") + " |"
    ).join("\n");
    insertAtCursor(`\n${header}\n${separator}\n${body}\n`);
    setTableDialogOpen(false);
  };

  const handleInsertChart = () => {
    const chartTemplate = `\n--- Chart Data ---
Label, Value
Item A, 25
Item B, 40
Item C, 15
Item D, 20
--- End Chart ---\n`;
    insertAtCursor(chartTemplate);
  };

  const noteColor = currentNote?.color;

  return (
    <div className={`min-h-screen bg-background animate-fade-in ${isDeleting ? "animate-fade-out" : ""}`}>
      <Header />
      <main className="container py-6 px-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Notes%2FGuides`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            All Notes
          </Button>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {saved ? (
                <>
                  <Check className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />
                  Saved
                </>
              ) : (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              )}
            </span>
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Color accent bar */}
        {noteColor && (
          <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: noteColor }} />
        )}

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-4"
        />

        {/* Insert toolbar */}
        <div className="flex items-center gap-1 mb-3 border border-border rounded-lg p-1.5 bg-muted/30">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-3.5 w-3.5" />
            Image
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setImageDialogOpen(true)}>
            <Link className="h-3.5 w-3.5" />
            URL
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setTableDialogOpen(true)}>
            <Table className="h-3.5 w-3.5" />
            Table
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleInsertChart}>
            <BarChart3 className="h-3.5 w-3.5" />
            Chart
          </Button>
        </div>

        {/* Edit / Preview tabs */}
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="edit" className="gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              className="min-h-[60vh] border-none shadow-none focus-visible:ring-0 px-0 resize-none text-base leading-relaxed"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[60vh] py-2">
              {content.trim() ? (
                <NoteContentRenderer content={content} />
              ) : (
                <p className="text-muted-foreground text-sm italic">Nothing to preview yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete dialog */}
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

      {/* Image URL dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              placeholder="https://example.com/image.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertImageUrl}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table dialog */}
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Rows</Label>
              <Input type="number" min="1" max="20" value={tableRows} onChange={(e) => setTableRows(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Columns</Label>
              <Input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertTable}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteEditorPage;
