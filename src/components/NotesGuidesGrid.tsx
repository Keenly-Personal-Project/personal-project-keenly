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
import { useUserDirectory } from "@/hooks/useUserDirectory";

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
  parentId?: string | null;
}

function PublisherBadge({ email, avatarUrl }: { email: string; avatarUrl?: string | null }) {
  const directory = useUserDirectory();
  const name = directory.getName(email);
  const initials = name.slice(0, 2).toUpperCase();
  const resolvedAvatar = directory.getAvatar(email) || avatarUrl;
  return (
    <div className="flex items-center gap-2 mb-2">
      <Avatar className="h-6 w-6">
        {resolvedAvatar && <AvatarImage src={resolvedAvatar} alt={name} />}
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
  onNoteMoved?: (noteId: string, folderId: string | null) => void;
  onFolderMoved?: (folderId: string, parentId: string | null) => void;
}

const getDragPayload = (e: React.DragEvent) => {
  const typedNote = e.dataTransfer.getData("application/x-keen-note-id");
  const typedFolder = e.dataTransfer.getData("application/x-keen-folder-id");
  const plain = e.dataTransfer.getData("text/plain");
  if (typedNote) return { type: "note" as const, id: typedNote };
  if (typedFolder) return { type: "folder" as const, id: typedFolder };
  if (plain.startsWith("note:")) return { type: "note" as const, id: plain.slice(5) };
  if (plain.startsWith("folder:")) return { type: "folder" as const, id: plain.slice(7) };
  return null;
};

export default function NotesGuidesGrid({ classSlug, className, notes, folders, canEdit, onNoteMoved, onFolderMoved }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<{ note: Note; x: number; y: number } | null>(null);
  const [folderMenuFor, setFolderMenuFor] = useState<{ folder: NoteFolder; x: number; y: number } | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  // Move-to-folder dialog (works for notes OR folders)
  const [moveDialogFor, setMoveDialogFor] = useState<Note | null>(null);
  const [moveFolderDialogFor, setMoveFolderDialogFor] = useState<NoteFolder | null>(null);

  // Rename folder
  const [renameFolder, setRenameFolder] = useState<NoteFolder | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete folder
  const [deleteFolder, setDeleteFolder] = useState<NoteFolder | null>(null);

  // Color folder
  const [colorFolder, setColorFolder] = useState<NoteFolder | null>(null);
  const [colorValue, setColorValue] = useState<string>("hsl(45, 85%, 50%)");

  // New folder dialog (also handles "Create folder from this note" and "New subfolder")
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSeedNoteId, setNewFolderSeedNoteId] = useState<string | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  // Long-press detection
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  useEffect(() => {
    const close = () => { setMenuFor(null); setFolderMenuFor(null); };
    if (menuFor || folderMenuFor) {
      window.addEventListener("click", close);
      window.addEventListener("scroll", close, true);
      return () => {
        window.removeEventListener("click", close);
        window.removeEventListener("scroll", close, true);
      };
    }
  }, [menuFor, folderMenuFor]);

  const startPress = (note: Note, e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressFired.current = false;
    const x = e.clientX;
    const y = e.clientY;
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
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
    if (longPressFired.current) {
      longPressFired.current = false;
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
    onNoteMoved?.(noteId, folderId);
    toast.success(folderId ? "Moved to folder" : "Removed from folder");
    setMoveDialogFor(null);
  };

  const createFolder = async (name: string, seedNoteId?: string | null, parentId?: string | null) => {
    if (!user) return;
    const trimmed = name.trim() || "New Folder";
    const payload: any = { class_slug: classSlug, user_id: user.id, name: trimmed };
    if (parentId) payload.parent_id = parentId;
    const { data, error } = await (supabase.from as any)("note_folders")
      .insert(payload)
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
    setOpenFolderIds((prev) => {
      const next = new Set([...prev, data.id]);
      if (parentId) next.add(parentId);
      return next;
    });
    setNewFolderOpen(false);
    setNewFolderName("");
    setNewFolderSeedNoteId(null);
    setNewFolderParentId(null);
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
    // Child folders will have parent_id set to null via ON DELETE SET NULL
    const { error } = await (supabase.from as any)("note_folders").delete().eq("id", deleteFolder.id);
    if (error) {
      toast.error("Couldn't delete folder");
      return;
    }
    toast.success("Folder deleted (contents kept)");
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

  // Compute descendant folder ids of a folder (to prevent moving into self/descendant)
  const getDescendantIds = (folderId: string): Set<string> => {
    const out = new Set<string>([folderId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
          out.add(f.id);
          added = true;
        }
      }
    }
    return out;
  };

  const moveFolderToFolder = async (folderId: string, newParentId: string | null) => {
    if (!canEdit) return;
    if (newParentId && getDescendantIds(folderId).has(newParentId)) {
      toast.error("Can't move a folder into itself");
      return;
    }
    const { error } = await (supabase.from as any)("note_folders")
      .update({ parent_id: newParentId })
      .eq("id", folderId);
    if (error) {
      toast.error("Couldn't move folder");
      return;
    }
    onFolderMoved?.(folderId, newParentId);
    toast.success(newParentId ? "Folder moved" : "Folder moved to top level");
    setMoveFolderDialogFor(null);
  };

  // Drop handler on a folder
  const handleDropOnFolder = (folderId: string, payload?: ReturnType<typeof getDragPayload>) => {
    const draggedNoteId = payload?.type === "note" ? payload.id : dragNoteId;
    const draggedFolderId = payload?.type === "folder" ? payload.id : dragFolderId;
    if (draggedNoteId) {
      moveNoteToFolder(draggedNoteId, folderId);
      setDragNoteId(null);
      setDragOverFolderId(null);
      return;
    }
    if (draggedFolderId && draggedFolderId !== folderId) {
      moveFolderToFolder(draggedFolderId, folderId);
      setDragFolderId(null);
      setDragOverFolderId(null);
      return;
    }
  };
  const handleDropOnRoot = (payload?: ReturnType<typeof getDragPayload>) => {
    const draggedNoteId = payload?.type === "note" ? payload.id : dragNoteId;
    const draggedFolderId = payload?.type === "folder" ? payload.id : dragFolderId;
    if (draggedNoteId) {
      moveNoteToFolder(draggedNoteId, null);
      setDragNoteId(null);
      setDragOverRoot(false);
      return;
    }
    if (draggedFolderId) {
      moveFolderToFolder(draggedFolderId, null);
      setDragFolderId(null);
      setDragOverRoot(false);
      return;
    }
  };

  const rootNotes = notes.filter((n) => !n.folderId);
  const notesInFolder = (folderId: string) => notes.filter((n) => n.folderId === folderId);
  const childFoldersOf = (folderId: string | null) =>
    folders.filter((f) => (f.parentId || null) === folderId);
  const rootFolders = childFoldersOf(null);

  const renderNote = (note: Note) => {
    const noteEmail = note.publisherEmail || user?.email || "";
    return (
      <div
        key={note.id}
        draggable={canEdit}
        onDragStart={(e) => {
          if (!canEdit) return;
          setDragNoteId(note.id);
          setDragFolderId(null);
          e.dataTransfer.effectAllowed = "move";
          try {
            e.dataTransfer.setData("application/x-keen-note-id", note.id);
            e.dataTransfer.setData("text/plain", `note:${note.id}`);
          } catch {}
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

  const renderFolder = (folder: NoteFolder, depth: number = 0) => {
    const isOpen = openFolderIds.has(folder.id);
    const childFolders = childFoldersOf(folder.id);
    const folderNotes = notesInFolder(folder.id);
    const count = folderNotes.length + childFolders.length;
    const dragOver = dragOverFolderId === folder.id;
    const beingDragged = dragFolderId === folder.id;
    // Disallow dropping a folder onto itself or one of its descendants
    const droppingForbidden = !!dragFolderId && getDescendantIds(folder.id).has(dragFolderId);

    return (
      <div
        key={folder.id}
        draggable={canEdit}
        onDragStart={(e) => {
          if (!canEdit) return;
          e.stopPropagation();
          setDragFolderId(folder.id);
          setDragNoteId(null);
          e.dataTransfer.effectAllowed = "move";
          // Required for Firefox / some mobile browsers — drag is cancelled without data.
          try {
            e.dataTransfer.setData("application/x-keen-folder-id", folder.id);
            e.dataTransfer.setData("text/plain", `folder:${folder.id}`);
          } catch {}
        }}
        onDragEnd={() => setDragFolderId(null)}
        onDragOver={(e) => {
          if (!canEdit) return;
          if (!dragNoteId && !dragFolderId) return;
          if (droppingForbidden) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(folder.id);
        }}
        onDragLeave={() => setDragOverFolderId((cur) => (cur === folder.id ? null : cur))}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const payload = getDragPayload(e);
          if (payload?.type === "folder" && getDescendantIds(payload.id).has(folder.id)) return;
          handleDropOnFolder(folder.id, payload);
        }}
        onContextMenu={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          e.stopPropagation();
          setFolderMenuFor({ folder, x: e.clientX, y: e.clientY });
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpenFolderIds((prev) => {
            const next = new Set(prev);
            next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
            return next;
          });
        }}
        className={`group relative rounded-2xl border-2 border-dashed p-3 pr-24 cursor-pointer transition-all self-start ${
          isOpen ? "col-span-2 md:col-span-3" : ""
        } ${beingDragged ? "opacity-40" : ""} ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "hover:opacity-90"
        }`}
        style={
          dragOver
            ? undefined
            : folder.color
            ? {
                background: folder.color.includes("gradient")
                  ? folder.color
                  : `${folder.color}22`,
                borderColor: folder.color.includes("gradient") ? "transparent" : folder.color,
              }
            : { borderColor: "hsl(45 90% 55% / 0.5)", background: "hsl(45 90% 55% / 0.08)" }
        }
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <FolderOpen className="h-5 w-5 shrink-0" style={{ color: folder.color && !folder.color.includes("gradient") ? folder.color : "hsl(38 92% 45%)" }} />
          ) : (
            <Folder className="h-5 w-5 shrink-0" style={{ color: folder.color && !folder.color.includes("gradient") ? folder.color : "hsl(38 92% 45%)" }} />
          )}
          <p className="text-sm font-semibold text-foreground truncate flex-1">{folder.name}</p>
          <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </div>
        {canEdit && (
          <div className="absolute top-1 right-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setNewFolderParentId(folder.id); setNewFolderSeedNoteId(null); setNewFolderName(""); setNewFolderOpen(true); }}
              className="p-1 rounded hover:bg-background/80"
              aria-label="New subfolder"
              title="New subfolder"
            >
              <FolderPlus className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMoveFolderDialogFor(folder); }}
              className="p-1 rounded hover:bg-background/80"
              aria-label="Move folder"
              title="Move folder"
            >
              <MoveRight className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setColorFolder(folder); setColorValue(folder.color || "hsl(45, 85%, 50%)"); }}
              className="p-1 rounded hover:bg-background/80"
              aria-label="Folder color"
            >
              <Palette className="h-3 w-3 text-muted-foreground" />
            </button>
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

        {/* Open: show child folders + notes inline */}
        {isOpen && (
          <div onClick={(e) => e.stopPropagation()} className="mt-3 space-y-3">
            {childFolders.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-start">
                {childFolders.map((cf) => renderFolder(cf, depth + 1))}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {folderNotes.length === 0 && childFolders.length === 0 ? (
                <p className="col-span-2 md:col-span-3 text-[11px] text-muted-foreground italic text-center py-2">
                  Empty — drag a note or folder here.
                </p>
              ) : (
                folderNotes.map((n) => <div key={n.id}>{renderNote(n)}</div>)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit) return;
        if (!dragNoteId && !dragFolderId) return;
        // root drop only when not over a folder
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
    >
      {/* Top toolbar */}
      {canEdit && (
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => { setNewFolderSeedNoteId(null); setNewFolderParentId(null); setNewFolderName(""); setNewFolderOpen(true); }}>
            <FolderPlus className="h-3.5 w-3.5" /> New Folder
          </Button>
          <span className="text-[11px] text-muted-foreground italic">Tip: long-press a note for options. Drag notes or folders onto another folder to nest them.</span>
        </div>
      )}

      {/* Folders row (top-level only; nested ones render inside) */}
      {rootFolders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 items-start">
          {rootFolders.map((folder) => renderFolder(folder, 0))}
        </div>
      )}

      {/* Root notes */}
      <div
        onDragOver={(e) => {
          if (!canEdit) return;
          if (!dragNoteId && !dragFolderId) return;
          e.preventDefault();
          setDragOverRoot(true);
        }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={(e) => {
          e.preventDefault();
          handleDropOnRoot();
        }}
        className={`grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg p-1 transition-colors ${
          dragOverRoot && (dragNoteId || dragFolderId) ? "bg-muted/40" : ""
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

      {/* Folder context menu (right-click / long-press on folder) */}
      {folderMenuFor && canEdit && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-[200px] rounded-md border border-border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: Math.min(folderMenuFor.x, window.innerWidth - 220),
            top: Math.min(folderMenuFor.y, window.innerHeight - 220),
          }}
        >
          <button
            onClick={() => {
              setNewFolderParentId(folderMenuFor.folder.id);
              setNewFolderSeedNoteId(null);
              setNewFolderName("");
              setNewFolderOpen(true);
              setFolderMenuFor(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" /> New subfolder
          </button>
          <button
            onClick={() => { setMoveFolderDialogFor(folderMenuFor.folder); setFolderMenuFor(null); }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <MoveRight className="h-4 w-4" /> Move folder to…
          </button>
          {folderMenuFor.folder.parentId && (
            <button
              onClick={() => { moveFolderToFolder(folderMenuFor.folder.id, null); setFolderMenuFor(null); }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              <X className="h-4 w-4" /> Move to top level
            </button>
          )}
        </div>
      )}

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={(o) => !o && setNewFolderOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {newFolderSeedNoteId
                ? "Create folder from note"
                : newFolderParentId
                ? `New subfolder in "${folders.find((f) => f.id === newFolderParentId)?.name || "folder"}"`
                : "New folder"}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(newFolderName, newFolderSeedNoteId, newFolderParentId); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewFolderOpen(false); setNewFolderParentId(null); }}>Cancel</Button>
            <Button onClick={() => createFolder(newFolderName, newFolderSeedNoteId, newFolderParentId)}>Create</Button>
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

      {/* Move-folder dialog */}
      <Dialog open={!!moveFolderDialogFor} onOpenChange={(o) => !o && setMoveFolderDialogFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Move "{moveFolderDialogFor?.name}" into…</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            <button
              onClick={() => moveFolderDialogFor && moveFolderToFolder(moveFolderDialogFor.id, null)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground"
            >
              <X className="h-4 w-4" /> Top level (no parent)
            </button>
            {(() => {
              if (!moveFolderDialogFor) return null;
              const forbidden = getDescendantIds(moveFolderDialogFor.id);
              const candidates = folders.filter((f) => !forbidden.has(f.id));
              if (candidates.length === 0) {
                return <p className="text-xs text-muted-foreground italic text-center py-3">No other folders available.</p>;
              }
              return candidates.map((f) => (
                <button
                  key={f.id}
                  onClick={() => moveFolderDialogFor && moveFolderToFolder(moveFolderDialogFor.id, f.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground"
                >
                  <Folder className="h-4 w-4 text-amber-500" /> {f.name}
                </button>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>
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

      {/* Folder color */}
      <Dialog open={!!colorFolder} onOpenChange={(o) => !o && setColorFolder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Folder color</DialogTitle></DialogHeader>
          <NoteColorPicker value={colorValue} onChange={setColorValue} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setColorFolder(null)}>Cancel</Button>
            <Button onClick={saveFolderColor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
