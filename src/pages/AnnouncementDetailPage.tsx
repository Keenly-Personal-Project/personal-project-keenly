import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, X } from "lucide-react";
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

interface Announcement {
  id: string;
  brief: string;
  description: string;
  image?: string;
}

const AnnouncementDetailPage = () => {
  const { className, announcementId } = useParams<{ className: string; announcementId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      localStorage.setItem(storageKey, JSON.stringify(updated));
      navigate(`/class/${className}`);
    }, 400);
  };

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

        <div className={`rounded-xl border-2 border-border bg-card p-6 space-y-4 transition-all duration-400 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-foreground">{announcement.brief}</h1>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {announcement.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{announcement.description}</p>
          )}

          {announcement.image && (
            <img src={announcement.image} alt="" className="rounded-lg w-full max-h-96 object-cover border border-border" />
          )}
        </div>
      </main>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this announcement. This action cannot be undone.
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

export default AnnouncementDetailPage;
