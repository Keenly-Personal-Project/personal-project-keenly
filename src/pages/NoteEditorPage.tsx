import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import NoteBlockEditor, {
  NoteBlock,
  NoteBlockEditorHandle,
  contentToBlocks,
  blocksToContent,
} from "@/components/NoteBlockEditor";
import { ChartType } from "@/components/EditableChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Check, Image as ImageIcon, Loader2, Table, BarChart3, Trash2, Link, Video,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
  { value: "scatter", label: "Dot Chart" },
  { value: "cumulative", label: "Cumulative Frequency" },
  { value: "histogram", label: "Histogram" },
  { value: "donut", label: "Donut Chart" },
  { value: "stackedBar", label: "Stacked Bar Chart" },
];

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
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<NoteBlockEditorHandle>(null);

  const slug = decodeURIComponent(className || "");
  const notesKey = `keen_notes_${slug}`;

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(notesKey);
    return saved ? JSON.parse(saved) : [];
  });

  const currentNote = notes.find((n) => n.id === noteId);
  const [title, setTitle] = useState(currentNote?.title || "Untitled");
  const [blocks, setBlocks] = useState<NoteBlock[]>(() =>
    contentToBlocks(currentNote?.content || "")
  );

  const saveNotes = useCallback(
    (updatedNotes: Note[]) => {
      localStorage.setItem(notesKey, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    },
    [notesKey]
  );

  useEffect(() => {
    setSaved(false);
    const timeout = setTimeout(() => {
      const content = blocksToContent(blocks);
      const updated = notes.map((n) =>
        n.id === noteId ? { ...n, title, content } : n
      );
      if (notes.some((n) => n.id === noteId)) {
        localStorage.setItem(notesKey, JSON.stringify(updated));
        setSaved(true);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [title, blocks, noteId, notesKey, notes]);

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

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      const updated = notes.filter((n) => n.id !== noteId);
      saveNotes(updated);
      navigate(`/class/${className}?tab=Notes%2FGuides`, { replace: true });
    }, 300);
  };

  const insertBlock = (block: NoteBlock) => {
    if (editorRef.current) {
      editorRef.current.insertBlockAtCursor(block);
    } else {
      setBlocks((prev) => [...prev, block]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      insertBlock({
        id: crypto.randomUUID(),
        type: "image",
        data: { src: ev.target?.result as string, alt: file.name },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleInsertImageUrl = () => {
    if (imageUrl.trim()) {
      insertBlock({
        id: crypto.randomUUID(),
        type: "image",
        data: { src: imageUrl.trim(), alt: "image" },
      });
      setImageUrl("");
      setImageDialogOpen(false);
    }
  };

  const handleInsertTable = () => {
    const rows = parseInt(tableRows) || 3;
    const cols = parseInt(tableCols) || 3;
    insertBlock({
      id: crypto.randomUUID(),
      type: "table",
      data: {
        headers: Array.from({ length: cols }, (_, i) => `Header ${i + 1}`),
        rows: Array.from({ length: rows }, () => Array(cols).fill("")),
      },
    });
    setTableDialogOpen(false);
  };

  const handleInsertChart = () => {
    const isMulti = ["line", "area", "stackedBar"].includes(chartType);
    insertBlock({
      id: crypto.randomUUID(),
      type: "chart",
      data: {
        chartType,
        data: [
          { label: "Item A", value: 25 },
          { label: "Item B", value: 40 },
          { label: "Item C", value: 15 },
          { label: "Item D", value: 20 },
        ],
        ...(isMulti ? {
          labels: ["Item A", "Item B", "Item C", "Item D"],
          datasets: [{ name: "Series 1", color: "#6366f1", values: [25, 40, 15, 20] }],
          curveType: "monotone" as const,
        } : {}),
      },
    });
    setChartDialogOpen(false);
  };

  const noteColor = currentNote?.color;

  return (
    <div className={`min-h-screen bg-background animate-fade-in ${isDeleting ? "animate-fade-out" : ""}`}>
      <Header />
      <main className="container py-6 px-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Notes%2FGuides`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> All Notes
          </Button>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {saved ? (
                <><Check className="h-3 w-3 text-green-500" /> Saved</>
              ) : (
                <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
              )}
            </span>
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {noteColor && <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: noteColor }} />}

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-4"
        />

        {/* Insert toolbar */}
        <div className="flex items-center gap-1 mb-3 border border-border rounded-lg p-1.5 bg-muted/30">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-3.5 w-3.5" /> Image
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setImageDialogOpen(true)}>
            <Link className="h-3.5 w-3.5" /> URL
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setTableDialogOpen(true)}>
            <Table className="h-3.5 w-3.5" /> Table
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setChartDialogOpen(true)}>
            <BarChart3 className="h-3.5 w-3.5" /> Chart
          </Button>
        </div>

        <div className="min-h-[60vh]">
          <NoteBlockEditor ref={editorRef} blocks={blocks} onChange={setBlocks} />
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert Image from URL</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input placeholder="https://example.com/image.png" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertImageUrl}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert Table</DialogTitle></DialogHeader>
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

      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert Chart</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Chart Type</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChartDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertChart}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteEditorPage;
