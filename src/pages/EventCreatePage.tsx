import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Image as ImageIcon, X } from "lucide-react";

const EventCreatePage = () => {
  const { className } = useParams<{ className: string }>();
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const slug = decodeURIComponent(className || "");
  const eventsKey = `keen_events_${slug}`;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const filePath = `events/${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error } = await supabase.storage.from("note-attachments").upload(filePath, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("note-attachments").getPublicUrl(filePath);
        setImages((prev) => [...prev, urlData.publicUrl]);
      }
    } catch (err) {
      console.error("Upload failed, falling back to base64", err);
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (ev) => setImages((prev) => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      }
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = () => {
    if (!title.trim()) return;
    const saved = localStorage.getItem(eventsKey);
    const events = saved ? JSON.parse(saved) : [];
    const newEvent = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      images: images.length > 0 ? images : undefined,
      date: new Date().toISOString(),
      publisherEmail: user?.email || "Unknown",
      publisherAvatar: profile?.avatar_url || null,
    };
    localStorage.setItem(eventsKey, JSON.stringify([newEvent, ...events]));
    navigate(`/class/${className}?tab=Events%20List`);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Header />
      <main className="container py-6 px-4 max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => navigate(`/class/${className}?tab=Events%20List`)} className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Button>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">Create New Event</h1>
            <p className="text-sm text-muted-foreground">Fill in the details and publish your event</p>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Event title..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Event Pictures (optional)
            </Label>
            <Input type="file" accept="image/*" multiple onChange={handleImageUpload} />
            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Describe your event..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
          </div>

          <Button onClick={handlePublish} disabled={!title.trim()} className="w-full h-12 text-base font-semibold">
            Publish Event
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EventCreatePage;
