import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, X, Image as ImageIcon } from "lucide-react";

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
    const updated = announcements.filter(a => a.id !== announcementId);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    navigate(`/class/${className}`);
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

        <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-foreground">{announcement.brief}</h1>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0" onClick={handleDelete}>
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
    </div>
  );
};

export default AnnouncementDetailPage;
