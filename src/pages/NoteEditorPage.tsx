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
import NoteColorPicker from "@/components/NoteColorPicker";
import TextFormattingToolbar, { TextFormat, defaultTextFormat } from "@/components/TextFormattingToolbar";
import { ChartType } from "@/components/EditableChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Check, Image as ImageIcon, Loader2, Table, BarChart3, Trash2, Link, Video,
  Palette, Upload, FileUp, Music,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

function parseVideoUrl(url: string): { embedUrl: string; isVertical: boolean } {
  const trimmed = url.trim();
  let embedUrl = trimmed;
  let isVertical = false;

  // YouTube Shorts
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([^?\s&]+)/);
  if (shortsMatch) {
    embedUrl = `https://www.youtube.com/embed/${shortsMatch[1]}`;
    isVertical = true;
    return { embedUrl, isVertical };
  }

  // Regular YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    return { embedUrl, isVertical: false };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return { embedUrl, isVertical: false };
  }

  // TikTok
  const tiktokMatch = trimmed.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tiktokMatch) {
    embedUrl = `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
    isVertical = true;
    return { embedUrl, isVertical };
  }

  // Instagram Reels
  const reelsMatch = trimmed.match(/instagram\.com\/(?:reel|reels)\/([^/?\s]+)/);
  if (reelsMatch) {
    embedUrl = `https://www.instagram.com/reel/${reelsMatch[1]}/embed/`;
    isVertical = true;
    return { embedUrl, isVertical };
  }

  return { embedUrl, isVertical: false };
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
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const genericFileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<NoteBlockEditorHandle>(null);
  const [textFormat, setTextFormat] = useState<TextFormat>(defaultTextFormat);

  const slug = decodeURIComponent(className || "");
  const notesKey = `keen_notes_${slug}`;

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(notesKey);
    return saved ? JSON.parse(saved) : [];
  });

  const currentNote = notes.find((n) => n.id === noteId);
  const [title, setTitle] = useState(currentNote?.title || "Untitled");
  const [noteColor, setNoteColor] = useState(currentNote?.color || "hsl(175, 70%, 40%)");
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
        n.id === noteId ? { ...n, title, content, color: noteColor } : n
      );
      if (notes.some((n) => n.id === noteId)) {
        localStorage.setItem(notesKey, JSON.stringify(updated));
        setSaved(true);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [title, blocks, noteId, notesKey, notes, noteColor]);

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

  if (!currentNote) {
    return (
      <div className="min-h-screen animate-fade-in">
        <Header />
        <main className="container py-6 px-4 max-w-3xl mx-auto">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <p className="font-medium">Note not found</p>
              <p className="text-sm text-destructive/80">This note may have been deleted or the link is invalid.</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Notes%2FGuides`)} className="gap-2 mt-4">
            <ArrowLeft className="h-4 w-4" /> Back to Notes
          </Button>
        </main>
      </div>
    );
  }

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

  const uploadToStorage = async (file: File): Promise<string | null> => {
    const userId = user?.id;
    if (!userId) return null;
    const filePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from('note-attachments').upload(filePath, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from('note-attachments').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("Uploading video...");
    const url = await uploadToStorage(file);
    if (url) {
      insertBlock({
        id: crypto.randomUUID(),
        type: "video",
        data: { fileUrl: url, title: file.name, isFile: true },
      });
      toast.success("Video uploaded!");
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("Uploading audio...");
    const url = await uploadToStorage(file);
    if (url) {
      insertBlock({
        id: crypto.randomUUID(),
        type: "audio" as any,
        data: { src: url, name: file.name },
      });
      toast.success("Audio uploaded!");
    }
  };

  const handleGenericFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("Uploading file...");
    const url = await uploadToStorage(file);
    if (url) {
      insertBlock({
        id: crypto.randomUUID(),
        type: "file" as any,
        data: { src: url, name: file.name, size: file.size, mimeType: file.type },
      });
      toast.success("File uploaded!");
    }
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

  const handleSaveColor = (color: string) => {
    setNoteColor(color);
    const updated = notes.map((n) =>
      n.id === noteId ? { ...n, color } : n
    );
    localStorage.setItem(notesKey, JSON.stringify(updated));
    setNotes(updated);
  };

  return (
    <div className={`min-h-screen animate-fade-in ${isDeleting ? "animate-fade-out" : ""}`}>
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
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setColorDialogOpen(true)}>
              <Palette className="h-4 w-4" /> Color
            </Button>
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {noteColor && (
          <div
            className="h-1.5 rounded-full mb-4"
            style={{ background: noteColor }}
          />
        )}

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-4"
        />

        {/* Insert toolbar */}
        <div className="flex items-center gap-1 mb-2 border border-border rounded-lg p-1.5 bg-muted/30 flex-wrap">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileUpload} />
          <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFileUpload} />
          <input ref={genericFileRef} type="file" className="hidden" onChange={handleGenericFileUpload} />

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
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setVideoDialogOpen(true)}>
            <Video className="h-3.5 w-3.5" /> Video
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => videoFileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload Video
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => audioFileRef.current?.click()}>
            <Music className="h-3.5 w-3.5" /> Audio
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => genericFileRef.current?.click()}>
            <FileUp className="h-3.5 w-3.5" /> File
          </Button>
        </div>

        {/* Text formatting toolbar */}
        <div className="border border-border rounded-lg p-1.5 bg-muted/30 mb-3">
          <TextFormattingToolbar format={textFormat} onChange={setTextFormat} />
        </div>

        <div className="min-h-[60vh]">
          <NoteBlockEditor ref={editorRef} blocks={blocks} onChange={setBlocks} textFormat={textFormat} />
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

      {/* Color editor dialog */}
      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Note Color</DialogTitle></DialogHeader>
          <NoteColorPicker value={noteColor} onChange={handleSaveColor} />
          <DialogFooter>
            <Button onClick={() => setColorDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert Video</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">Supports YouTube, YouTube Shorts, TikTok, Instagram Reels, and Vimeo.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!videoUrl.trim()) return;
              const { embedUrl, isVertical } = parseVideoUrl(videoUrl);
              insertBlock({ id: crypto.randomUUID(), type: "video", data: { embedUrl, title: "Video", isVertical } });
              setVideoUrl("");
              setVideoDialogOpen(false);
            }}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteEditorPage;
