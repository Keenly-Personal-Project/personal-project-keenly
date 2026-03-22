import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
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

  const goTo = (next: number, dir: "left" | "right") => {
    if (isAnimating || next === current) return;
    setDirection(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent(next);
      setTimeout(() => setIsAnimating(false), 20);
    }, 250);
  };

  return (
    <div className="mb-8 mx-auto max-w-xl">
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
  const slug = decodeURIComponent(className || "");
  const eventsKey = `keen_events_${slug}`;

  const [event, setEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem(eventsKey);
    if (saved) {
      const events: EventItem[] = JSON.parse(saved);
      const found = events.find((e) => e.id === eventId);
      if (found) setEvent(found);
    }
  }, [eventsKey, eventId]);

  if (loading) {
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

  return (
    <div className="min-h-screen animate-fade-in">
      <Header />
      <main className="container py-6 px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Events%20List`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/class/${className}/event/${eventId}/edit`)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-6 break-words" style={{ overflowWrap: "anywhere" }}>
          {event.title}
        </h1>

        {/* Images */}
        {event.images && event.images.length > 0 && (
          <EventImageCarousel images={event.images} />
        )}

        {/* Description */}
        {event.description && (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>
            {event.description}
          </div>
        )}
      </main>
    </div>
  );
};

export default EventDetailPage;
