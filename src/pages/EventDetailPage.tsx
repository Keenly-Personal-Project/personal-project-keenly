import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ImageViewer from "@/components/ImageViewer";

interface EventItem {
  id: string;
  title: string;
  description: string;
  images?: string[];
  color?: string;
  date?: string;
  publisherEmail?: string;
  publisherAvatar?: string | null;
}

const EventImageCarousel = ({ images }: { images: string[] }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const total = images.length;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) {
      timerRef.current = setInterval(() => {
        setDirection("right");
        setIsAnimating(true);
        setTimeout(() => {
          setCurrent((prev) => (prev + 1) % total);
          setTimeout(() => setIsAnimating(false), 20);
        }, 250);
      }, 4000);
    }
  }, [total]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const goTo = (next: number, dir: "left" | "right") => {
    if (isAnimating || next === current) return;
    setDirection(dir);
    setIsAnimating(true);
    startTimer();
    setTimeout(() => {
      setCurrent(next);
      setTimeout(() => setIsAnimating(false), 20);
    }, 250);
  };

  return (
    <div className="mb-8 mx-auto max-w-xl" onMouseEnter={startTimer} onMouseLeave={stopTimer}>
      <div className="relative">
        <div className="aspect-video rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/30">
          <div
            className="w-full h-full flex items-center justify-center transition-all duration-300 ease-in-out"
            style={{
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating
                ? `translateX(${direction === "right" ? "-40px" : "40px"})`
                : "translateX(0)",
            }}
          >
            <ImageViewer
              src={images[current]}
              alt={`Event image ${current + 1}`}
              imgClassName="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
            />
          </div>
        </div>
        {total > 1 && (
          <>
            <button
              onClick={() => goTo((current - 1 + total) % total, "left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goTo((current + 1) % total, "right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? "right" : "left")}
              className={`h-2 w-2 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EventDetailPage = () => {
  const { className, eventId } = useParams<{ className: string; eventId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEscapeBack(`/class/${className}?tab=Events%20List`, [deleteDialogOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!eventId) return;
      setLoadingEvent(true);
      const { data } = await (supabase.from as any)("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setEvent({
          id: data.id,
          title: data.title,
          description: data.description || "",
          images: Array.isArray(data.images) ? data.images : undefined,
          color: data.color || undefined,
          date: data.date || data.created_at,
          publisherEmail: data.publisher_email || "",
          publisherAvatar: data.publisher_avatar || null,
        });
      } else setEvent(null);
      setLoadingEvent(false);
    };
    load();
    const ch = supabase
      .channel(`event-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `id=eq.${eventId}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [eventId]);

  if (loading || loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  if (!event) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container py-6 px-4 max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground py-16">Event not found.</p>
          <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Events%20List`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Button>
        </main>
      </div>
    );
  }

  const isOwner = event.publisherEmail === user?.email;

  const handleDelete = async () => {
    const { error } = await (supabase.from as any)("events").delete().eq("id", eventId);
    if (error) { toast.error(error.message || "Failed to delete"); return; }
    toast("Event deleted");
    navigate(`/class/${className}?tab=Events%20List`);
  };

  return (
    <div className="min-h-screen animate-fade-in">
      <Header />
      <main className="container py-6 px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Events%20List`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Button>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/class/${className}/event/${eventId}/edit`)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-6 break-words" style={{ overflowWrap: "anywhere" }}>
          {event.title}
        </h1>

        {event.images && event.images.length > 0 && (
          <EventImageCarousel images={event.images} />
        )}

        {event.description && (
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-sm">
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>
              {event.description}
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventDetailPage;
