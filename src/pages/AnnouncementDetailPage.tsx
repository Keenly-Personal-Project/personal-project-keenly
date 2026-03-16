import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, X, Pencil, Image as ImageIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Announcement {
  id: string;
  brief: string;
  description: string;
  image?: string;
  date?: string;
  publisherEmail?: string;
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
  const [editImage, setEditImage] = useState("");
  const [editDate, setEditDate] = useState("");
  const [imageViewOpen, setImageViewOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const slug = decodeURIComponent(className || "");
  const storageKey = `keen_announcements_${slug}`;

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

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

  const announcement = announcements.find(a => a.id === announcementId);

  const savedClasses = JSON.parse(localStorage.getItem('keen_classes') || '[]');
  const matchedClass = savedClasses.find(
    (cls: { name: string }) => cls.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
  const displayName = matchedClass?.name || slug.replace(/-/g, " ");

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      const updated = announcements.filter(a => a.id !== announcementId);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch { /* ignore */ }
      navigate(`/class/${className}`);
    }, 400);
  };

  const openEdit = () => {
    if (!announcement) return;
    setEditBrief(announcement.brief);
    setEditDescription(announcement.description);
    setEditImage(announcement.image || "");
    setEditDate(announcement.date ? new Date(announcement.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditOpen(true);
  };

  const handleEditSave = () => {
    const updated = announcements.map(a =>
      a.id === announcementId
        ? { ...a, brief: editBrief.trim(), description: editDescription.trim(), image: editImage || undefined, date: editDate ? new Date(editDate).toISOString() : a.date }
        : a
    );
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      const withoutImages = updated.map(a => ({ ...a, image: undefined }));
      try { localStorage.setItem(storageKey, JSON.stringify(withoutImages)); } catch { /* ignore */ }
    }
    setAnnouncements(updated);
    setEditOpen(false);
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `announcements/${slug}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('note-attachments').upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('note-attachments').getPublicUrl(filePath);
      setEditImage(urlData.publicUrl);
    } catch (err) {
      console.error("Image upload failed, falling back to base64", err);
      const reader = new FileReader();
      reader.onload = (ev) => setEditImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setImageUploading(false);
    }
  };

  const publisherEmail = announcement?.publisherEmail || user?.email || "";
  const publisherName = publisherEmail.split("@")[0];
  const publisherInitials = publisherName.slice(0, 2).toUpperCase();

  if (!announcement) {
    return (
      <div className="min-h-screen bg-background">
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(`/class/${className}`)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to {displayName}
        </Button>

        <div className={`rounded-xl border border-primary/40 bg-muted/40 p-6 space-y-4 transition-all duration-400 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Publisher info */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                {publisherInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">{publisherName}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-foreground break-words overflow-wrap-anywhere min-w-0 flex-1">{announcement.brief}</h1>
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

          {announcement.image && (
            <div
              className="rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setImageViewOpen(true)}
            >
              <img src={announcement.image} alt="" className="max-w-full max-h-96 object-contain mx-auto" />
            </div>
          )}
        </div>
      </main>

      {/* Full image viewer */}
      <Dialog open={imageViewOpen} onOpenChange={setImageViewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <img src={announcement.image} alt="" className="w-full h-full object-contain" />
        </DialogContent>
      </Dialog>

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

      {/* Edit Dialog */}
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
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Picture</Label>
              <Input type="file" accept="image/*" onChange={handleEditImageUpload} />
              {imageUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {editImage && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setEditImage('')} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
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
