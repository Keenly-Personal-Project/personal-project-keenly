import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Folder, FolderOpen, FolderPlus, Trash2, Pencil, ChevronRight, MoveRight, X, Palette } from "lucide-react";
import NoteColorPicker from "@/components/NoteColorPicker";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
  folderId?: string | null;
}

export interface NoteFolder {
  id: string;
  name: string;
  color?: string | null;
}

function PublisherBadge({ email, avatarUrl }: { email: string; avatarUrl?: string | null }) {
  const name = email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 mb-2">
      <Avatar className="h-6 w-6">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-muted-foreground">{name}</span>
    </div>
  );
}

function previewText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const tb = parsed.find((b: any) => b.type === "text" && b.data?.content?.trim());
      return tb ? tb.data.content.trim().substring(0, 200) : "Empty note...";
    }
  } catch {}
  return content || "Empty note...";
}

interface Props {
  classSlug: string;
  className: string;
  notes: Note[];
  folders: NoteFolder[];
  canEdit: boolean;
}

export default function NotesGuidesGrid({ classSlug, className, notes, folders, canEdit }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<{ note: Note; x: number; y: number } | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  // Move-to-folder dialog
  const [moveDialogFor, setMoveDialogFor] = useState<Note | null>(null);

  // Rename folder
  const [renameFolder, setRenameFolder] = useState<NoteFolder | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete folder
  const [deleteFolder, setDeleteFolder] = useState<NoteFolder | null>(null);

  // Color folder
  const [colorFolder, setColorFolder] = useState<NoteFolder | null>(null);
  const [colorValue, setColorValue] = useState<string>("hsl(45, 85%, 50%)");

  // New folder dialog (also handles "Create folder from this note")
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSeedNoteId, setNewFolderSeedNoteId] = useState<string | null>(null);

  // Long-press detection
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    const close = () => setMenuFor(null);
    if (menuFor) {
      window.addEventListener("click", close);
      window.addEventListener("scroll", close, true);
      return () => {
        window.removeEventListener("click", close);
        window.removeEventListener("scroll", close, true);
      };
    }
  }, [menuFor]);

  const startPress = (note: Note, e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    pressTimer.current = window.setTimeout(() => {
      setMenuFor({ note, x, y });
      pressTimer.current = null;
    }, 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleNoteClick = (note: Note) => {
    if (pressTimer.current === null) {
      // Long-press already fired; ignore click
      return;
    }
    cancelPress();
    navigate(`/class/${className}/note/${note.id}`);
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    if (!canEdit) return;
    const { error } = await (supabase.from as any)("notes")
      .update({ folder_id: folderId })
      .eq("id", noteId);
    if (error) {
      toast.error("Couldn't move note");
      return;
    }
    toast.success(folderId ? "Moved to folder" : "Removed from folder");
    setMoveDialogFor(null);
  };

  const createFolder = async (name: string, seedNoteId?: string | null) => {
    if (!user) return;
    const trimmed = name.trim() || "New Folder";
    const { data, error } = await (supabase.from as any)("note_folders")
      .insert({ class_slug: classSlug, user_id: user.id, name: trimmed })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Couldn't create folder");
      return;
    }
    if (seedNoteId) {
      await (supabase.from as any)("notes").update({ folder_id: data.id }).eq("id", seedNoteId);
    }
    toast.success("Folder created");
    setOpenFolderIds((prev) => new Set([...prev, data.id]));
    setNewFolderOpen(false);
    setNewFolderName("");
    setNewFolderSeedNoteId(null);
  };

  const renameFolderSubmit = async () => {
    if (!renameFolder) return;
    const name = renameValue.trim() || "Untitled";
    const { error } = await (supabase.from as any)("note_folders")
      .update({ name })
      .eq("id", renameFolder.id);
    if (error) {
      toast.error("Couldn't rename folder");
      return;
    }
    toast.success("Folder renamed");
    setRenameFolder(null);
  };

  const deleteFolderConfirm = async () => {
    if (!deleteFolder) return;
    // Notes inside will have folder_id set to null via ON DELETE SET NULL
    const { error } = await (supabase.from as any)("note_folders").delete().eq("id", deleteFolder.id);
    if (error) {
      toast.error("Couldn't delete folder");
      return;
    }
    toast.success("Folder deleted (notes kept)");
    setDeleteFolder(null);
  };

  const saveFolderColor = async () => {
    if (!colorFolder) return;
    const { error } = await (supabase.from as any)("note_folders")
      .update({ color: colorValue })
      .eq("id", colorFolder.id);
    if (error) {
      toast.error("Couldn't update color");
      return;
    }
    toast.success("Folder color updated");
    setColorFolder(null);
  };

  // Drop handler on a folder
  const handleDropOnFolder = (folderId: string) => {
    if (!dragNoteId) return;
    moveNoteToFolder(dragNoteId, folderId);
    setDragNoteId(null);
    setDragOverFolderId(null);
  };
  const handleDropOnRoot = () => {
    if (!dragNoteId) return;
    moveNoteToFolder(dragNoteId, null);
    setDragNoteId(null);
    setDragOverRoot(false);
  };

  const rootNotes = notes.filter((n) => !n.folderId);
  const notesInFolder = (folderId: string) => notes.filter((n) => n.folderId === folderId);

  const renderNote = (note: Note) => {
    const noteEmail = note.publisherEmail || user?.email || "";
    return (
      <div
        key={note.id}
        draggable={canEdit}
        onDragStart={(e) => {
          if (!canEdit) return;
          setDragNoteId(note.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDragNoteId(null)}
        onPointerDown={(e) => startPress(note, e)}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setMenuFor({ note, x: e.clientX, y: e.clientY });
        }}
        onClick={() => handleNoteClick(note)}
        className={`aspect-square p-5 text-left hover:opacity-80 transition-all cursor-pointer flex flex-col select-none ${
          dragNoteId === note.id ? "opacity-40" : ""
        }`}
        style={{
          borderRadius: "0.75rem",
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
          {previewText(note.content)}
        </p>
      </div>
    );
  };

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit || !dragNoteId) return;
        // root drop only when not over a folder
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
    >
      {/* Top toolbar */}
      {canEdit && (
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => { setNewFolderSeedNoteId(null); setNewFolderName(""); setNewFolderOpen(true); }}>
            <FolderPlus className="h-3.5 w-3.5" /> New Folder
          </Button>
          <span className="text-[11px] text-muted-foreground italic">Tip: long-press a note for options, or drag a note onto a folder.</span>
        </div>
      )}

      {/* Folders row */}
      {folders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {folders.map((folder) => {
            const isOpen = openFolderIds.has(folder.id);
            const count = notesInFolder(folder.id).length;
            const dragOver = dragOverFolderId === folder.id;
            return (
              <div
                key={folder.id}
                onDragOver={(e) => {
                  if (!canEdit || !dragNoteId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }}
                onDragLeave={() => setDragOverFolderId((cur) => (cur === folder.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDropOnFolder(folder.id);
                }}
                onClick={() =>
                  setOpenFolderIds((prev) => {
                    const next = new Set(prev);
                    next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
                    return next;
                  })
                }
                className={`group relative rounded-2xl border-2 border-dashed p-3 cursor-pointer transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <FolderOpen className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <p className="text-sm font-semibold text-foreground truncate flex-1">{folder.name}</p>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </div>
                {canEdit && (
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenameFolder(folder); setRenameValue(folder.name); }}
                      className="p-1 rounded hover:bg-background/80"
                      aria-label="Rename folder"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteFolder(folder); }}
                      className="p-1 rounded hover:bg-background/80"
                      aria-label="Delete folder"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                )}

                {/* Open: show contained notes inline */}
                {isOpen && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-3 grid grid-cols-2 gap-2">
                    {notesInFolder(folder.id).length === 0 ? (
                      <p className="col-span-2 text-[11px] text-muted-foreground italic text-center py-2">
                        Empty — drag a note here.
                      </p>
                    ) : (
                      notesInFolder(folder.id).map((n) => (
                        <div key={n.id} className="scale-95 origin-top-left">{renderNote(n)}</div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Root notes */}
      <div
        onDragOver={(e) => {
          if (!canEdit || !dragNoteId) return;
          e.preventDefault();
          setDragOverRoot(true);
        }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={(e) => {
          e.preventDefault();
          handleDropOnRoot();
        }}
        className={`grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg p-1 transition-colors ${
          dragOverRoot && dragNoteId ? "bg-muted/40" : ""
        }`}
      >
        {rootNotes.map(renderNote)}
        {canEdit && (
          <button
            onClick={() => navigate(`/class/${className}/note/new`)}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Add notes</span>
          </button>
        )}
      </div>

      {/* Long-press context menu */}
      {menuFor && canEdit && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-[200px] rounded-md border border-border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: Math.min(menuFor.x, window.innerWidth - 220),
            top: Math.min(menuFor.y, window.innerHeight - 180),
          }}
        >
          <button
            onClick={() => {
              setNewFolderSeedNoteId(menuFor.note.id);
              setNewFolderName("");
              setNewFolderOpen(true);
              setMenuFor(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" /> Create folder from this
          </button>
          <button
            onClick={() => { setMoveDialogFor(menuFor.note); setMenuFor(null); }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <MoveRight className="h-4 w-4" /> Move to folder…
          </button>
          {menuFor.note.folderId && (
            <button
              onClick={() => { moveNoteToFolder(menuFor.note.id, null); setMenuFor(null); }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <X className="h-4 w-4" /> Remove from folder
            </button>
          )}
        </div>
      )}

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={(o) => !o && setNewFolderOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{newFolderSeedNoteId ? "Create folder from note" : "New folder"}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(newFolderName, newFolderSeedNoteId); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => createFolder(newFolderName, newFolderSeedNoteId)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder */}
      <Dialog open={!!renameFolder} onOpenChange={(o) => !o && setRenameFolder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename folder</DialogTitle></DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") renameFolderSubmit(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolder(null)}>Cancel</Button>
            <Button onClick={renameFolderSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move-to-folder dialog */}
      <Dialog open={!!moveDialogFor} onOpenChange={(o) => !o && setMoveDialogFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Move "{moveDialogFor?.title}" to…</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {folders.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-3">No folders yet. Create one first.</p>
            )}
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => moveDialogFor && moveNoteToFolder(moveDialogFor.id, f.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground"
              >
                <Folder className="h-4 w-4 text-amber-500" /> {f.name}
              </button>
            ))}
            {moveDialogFor?.folderId && (
              <button
                onClick={() => moveNoteToFolder(moveDialogFor.id, null)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-muted-foreground"
              >
                <X className="h-4 w-4" /> Remove from folder
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete folder */}
      <AlertDialog open={!!deleteFolder} onOpenChange={(o) => !o && setDeleteFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder "{deleteFolder?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The notes inside will not be deleted — they will move back out of the folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFolderConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
