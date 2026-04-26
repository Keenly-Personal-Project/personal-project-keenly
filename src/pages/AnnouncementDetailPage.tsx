import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, X, Pencil, Image as ImageIcon, Trash2 } from "lucide-react";
import ImageViewer from "@/components/ImageViewer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Announcement {
  id: string;
  brief: string;
  description: string;
  images?: string[];
  date?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
  classSlug: string;
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
}

const AnnouncementDetailPage = () => {
  const { className, announcementId } = useParams<{ className: string; announcementId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBrief, setEditBrief] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editDate, setEditDate] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingAnn, setLoadingAnn] = useState(true);

  const slug = decodeURIComponent(className || "");

  // Load + realtime subscribe
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!announcementId) return;
      setLoadingAnn(true);
      const { data } = await (supabase.from as any)("announcements")
        .select("*")
        .eq("id", announcementId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setAnnouncement({
          id: data.id,
          brief: data.brief,
          description: data.description || "",
          images: Array.isArray(data.images) ? data.images : undefined,
          date: data.date || data.created_at,
          publisherEmail: data.publisher_email || "",
          publisherAvatar: data.publisher_avatar || null,
          classSlug: data.class_slug,
        });
      } else {
        setAnnouncement(null);
      }
      setLoadingAnn(false);
    };
    load();

    const ch = supabase
      .channel(`ann-${announcementId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `id=eq.${announcementId}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [announcementId]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEscapeBack(`/class/${className}`, [showDeleteConfirm, editOpen]);

  if (loading || loadingAnn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const displayName = slug.replace(/-/g, " ");

  const handleDelete = async () => {
    if (!announcement) return;
    setIsDeleting(true);
    const { error } = await (supabase.from as any)("announcements").delete().eq("id", announcement.id);
    if (error) {
      toast.error(error.message || "Failed to delete");
      setIsDeleting(false);
      return;
    }
    setTimeout(() => navigate(`/class/${className}`), 300);
  };

  const handleDeleteImage = async (imgIndex: number) => {
    if (!announcement) return;
    const currentImgs = announcement.images || [];
    const newImgs = currentImgs.filter((_, i) => i !== imgIndex);
    const { error } = await (supabase.from as any)("announcements")
      .update({ images: newImgs.length > 0 ? newImgs : null })
      .eq("id", announcement.id);
    if (error) toast.error("Failed to update images");
  };

  const openEdit = () => {
    if (!announcement) return;
    setEditBrief(announcement.brief);
    setEditDescription(announcement.description);
    setEditImages(announcement.images || []);
    setEditDate(announcement.date ? new Date(announcement.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!announcement) return;
    const { error } = await (supabase.from as any)("announcements")
      .update({
        brief: editBrief.trim(),
        description: editDescription.trim(),
        images: editImages.length > 0 ? editImages : null,
        date: editDate ? new Date(editDate).toISOString() : announcement.date,
      })
      .eq("id", announcement.id);
    if (error) { toast.error(error.message || "Failed to save"); return; }
    setEditOpen(false);
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setEditImages(prev => [...prev, urlData.publicUrl]);
      }
    } catch (err) {
      console.error("Image upload failed, falling back to base64", err);
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (ev) => setEditImages(prev => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      }
    } finally {
      setImageUploading(false);
    }
  };

  const publisherEmail = announcement?.publisherEmail || user?.email || "";
  const publisherName = publisherEmail.split("@")[0];
  const publisherInitials = publisherName.slice(0, 2).toUpperCase();

  if (!announcement) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container py-6 px-4">
          <Button variant="ghost" onClick={() => navigate(`/class/${className}`)} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <p className="text-center text-muted-foreground">Announcement not found.</p>
        </main>
      </div>
    );
  }

  const imgs = announcement.images || [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-6 px-4 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(`/class/${className}`)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to {displayName}
        </Button>

        <div className={`rounded-xl border border-primary/40 bg-muted/40 p-6 space-y-4 transition-all duration-400 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-7 w-7">
              {announcement.publisherAvatar && <AvatarImage src={announcement.publisherAvatar} alt={publisherName} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                {publisherInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">{publisherName}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-foreground break-words min-w-0 flex-1" style={{ overflowWrap: 'anywhere' }}>{announcement.brief}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{formatDate(announcement.date)}</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {announcement.description && (
            <p className="text-sm text-muted-foreground leading-relaxed break-words" style={{ overflowWrap: 'anywhere' }}>{announcement.description}</p>
          )}

          {imgs.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imgs.map((img, i) => (
                <div
                  key={i}
                  className="relative group/img rounded-lg overflow-hidden border border-border"
                >
                  <ImageViewer
                    src={img}
                    alt=""
                    imgClassName="w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(i); }}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                    title="Delete image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>


      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this announcement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brief</Label>
              <Input value={editBrief} onChange={(e) => setEditBrief(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Pictures</Label>
              <Input type="file" accept="image/*" multiple onChange={handleEditImageUpload} />
              {imageUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {editImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {editImages.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => setEditImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementDetailPage;
