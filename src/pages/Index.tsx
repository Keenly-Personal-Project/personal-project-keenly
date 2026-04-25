import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { generateHexCode } from "@/components/Header";
import { Loader2, BookOpen, FlaskConical, X, Pencil, Image, Palette, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NoteColorPicker from '@/components/NoteColorPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string | null;
  color?: string | null;
  code: string;
  created_by: string;
  role?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  FlaskConical,
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editName, setEditName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Join/Create state
  const [keenPopoverOpen, setKeenPopoverOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoadingClasses(true);
    // Get keens this user is a member of (via keen_members → keens)
    const { data: memberships, error: memberErr } = await (supabase.from as any)("keen_members")
      .select("class_slug, role")
      .eq("user_id", user.id);
    if (memberErr) {
      console.error(memberErr);
      setLoadingClasses(false);
      return;
    }
    const slugs = (memberships || []).map((m: any) => m.class_slug);
    if (slugs.length === 0) {
      setClasses([]);
      setLoadingClasses(false);
      return;
    }
    const { data: keens, error: keensErr } = await (supabase.from as any)("keens")
      .select("*")
      .in("slug", slugs);
    if (keensErr) {
      console.error(keensErr);
      setLoadingClasses(false);
      return;
    }
    const roleBySlug = new Map((memberships || []).map((m: any) => [m.class_slug, m.role]));
    setClasses((keens || []).map((k: any) => ({ ...k, role: roleBySlug.get(k.slug) })));
    setLoadingClasses(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) fetchClasses();
  }, [user, loading, navigate, fetchClasses]);

  // Refresh when other parts of the app indicate a change (e.g. join request approved)
  useEffect(() => {
    const handler = () => fetchClasses();
    window.addEventListener("keen_classes_updated", handler);
    return () => window.removeEventListener("keen_classes_updated", handler);
  }, [fetchClasses]);

  // Realtime: when this user is added to (or removed from) a Keen, refresh dashboard
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`keen_members_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keen_members", filter: `user_id=eq.${user.id}` },
        () => fetchClasses()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchClasses]);

  const handleRemoveClass = async (id: string) => {
    setDeletingId(id);
    const target = classes.find(c => c.id === id);
    setTimeout(async () => {
      if (target) {
        if (target.created_by === user?.id) {
          // Owner: delete the keen entirely
          await (supabase.from as any)("keens").delete().eq("id", id);
        } else {
          // Member: just leave
          await (supabase.from as any)("keen_members")
            .delete()
            .eq("class_slug", target.slug)
            .eq("user_id", user!.id);
        }
      }
      setClasses(prev => prev.filter(c => c.id !== id));
      setDeletingId(null);
      setDeleteId(null);
    }, 300);
  };

  const openEditDialog = (cls: ClassItem) => {
    if (cls.role !== "owner" && cls.role !== "admin") {
      toast.info("Only owners and admins can customize this Keen.");
      return;
    }
    setEditId(cls.id);
    setEditColor(cls.color || '');
    setEditImage(cls.image || '');
    setEditName(cls.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    const { error } = await (supabase.from as any)("keens")
      .update({
        name: editName.trim() || undefined,
        color: editColor || null,
        image: editImage || null,
      })
      .eq("id", editId);
    if (error) {
      toast.error("Failed to save changes.");
      return;
    }
    setEditDialogOpen(false);
    setEditId(null);
    fetchClasses();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateKeen = async () => {
    if (!newClassName.trim() || !user) return;
    setSubmitting(true);
    const name = newClassName.trim();
    const baseSlug = slugify(name);
    if (!baseSlug) {
      toast.error("Invalid Keen name.");
      setSubmitting(false);
      return;
    }

    // Try a few times in case of slug or code collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const code = generateHexCode();
      const { data, error } = await (supabase.from as any)("keens")
        .insert({ name, slug, code, icon: "BookOpen", created_by: user.id })
        .select()
        .single();
      if (!error && data) {
        toast.success(`Keen created! Code: ${code}`);
        setNewClassName("");
        setCreateDialogOpen(false);
        setSubmitting(false);
        await fetchClasses();
        navigate(`/class/${slug}`);
        return;
      }
      // Unique violation → retry; other errors → bail
      if (error && (error as any).code !== "23505") {
        console.error(error);
        toast.error("Failed to create Keen.");
        setSubmitting(false);
        return;
      }
    }
    toast.error("Could not create Keen, please try a different name.");
    setSubmitting(false);
  };

  const handleJoinKeen = useCallback(async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed || !user) return;
    setSubmitting(true);

    // Look up the Keen by its shared code
    const { data: keen, error: lookupErr } = await (supabase.from as any)("keens")
      .select("id, name, slug, created_by")
      .eq("code", trimmed)
      .maybeSingle();

    if (lookupErr || !keen) {
      toast.error("No Keen found with that code.");
      setSubmitting(false);
      return;
    }

    // Already a member?
    const { data: existingMember } = await (supabase.from as any)("keen_members")
      .select("id")
      .eq("class_slug", keen.slug)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingMember) {
      toast.info("You're already in this Keen!");
      setJoinCode("");
      setJoinDialogOpen(false);
      setSubmitting(false);
      return;
    }

    // Already requested?
    const { data: existingReq } = await supabase
      .from("keen_join_requests")
      .select("id")
      .eq("class_slug", keen.slug)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existingReq) {
      toast.info("You've already requested to join this Keen. Waiting for approval.");
      setJoinCode("");
      setJoinDialogOpen(false);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("keen_join_requests").insert({
      class_slug: keen.slug,
      user_id: user.id,
      email: user.email || "unknown@user.com",
    });
    if (error) {
      toast.error("Failed to send join request.");
      setSubmitting(false);
      return;
    }

    setJoinCode("");
    setJoinDialogOpen(false);
    setSubmitting(false);
    toast.success(`Join request sent for "${keen.name}"! Waiting for owner/admin approval.`);
  }, [joinCode, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container py-6 px-4">
        <div className="rounded-2xl border border-foreground/30 bg-card min-h-[calc(100vh-8rem)] overflow-hidden">
          {/* Banner */}
          <div className="w-full bg-primary py-4 sm:py-6 px-8 relative flex flex-col items-center justify-center">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl text-primary-foreground font-bold"
              style={{ fontFamily: "'Amatic SC', cursive", letterSpacing: '0.4em', paddingLeft: '0.4em' }}
            >
              Keen's
            </h1>

            {/* Join/Create Keen button - centered on mobile, top-right on desktop */}
            <div className="mt-2 md:mt-0 md:absolute md:top-4 md:right-8">
            <Popover open={keenPopoverOpen} onOpenChange={setKeenPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="h-8 sm:h-9 px-3 sm:px-4 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary-foreground/20 transition-colors flex items-center gap-1.5"
                  onMouseEnter={() => setKeenPopoverOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Join/Create Keen</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-48 p-1"
                align="center"
                onMouseLeave={() => setKeenPopoverOpen(false)}
              >
                <button
                  onClick={() => { setKeenPopoverOpen(false); setCreateDialogOpen(true); }}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Create Keen
                </button>
                <button
                  onClick={() => { setKeenPopoverOpen(false); setJoinDialogOpen(true); }}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Join Keen
                </button>
              </PopoverContent>
            </Popover>
            </div>
          </div>

          {/* Class cards grid */}
          <div className="p-6 md:p-10">
            {loadingClasses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">You haven't joined any Keens yet.</p>
                <p className="text-xs mt-1">Use the button above to create one or join with a code.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {classes.map((cls) => {
                  const Icon = iconMap[cls.icon] || BookOpen;
                  const labelColor = cls.color || undefined;
                  const canEdit = cls.role === "owner" || cls.role === "admin";
                  return (
                    <div
                      key={cls.id}
                      className={`relative group transition-all duration-300 ${deletingId === cls.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    >
                      <button
                        onClick={() => navigate(`/class/${cls.slug}`)}
                        className="w-full flex flex-col rounded-xl border border-foreground/30 overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-card"
                      >
                        <div className="flex items-center justify-center aspect-[3/4] bg-muted/50 overflow-hidden">
                          {cls.image ? (
                            <img src={cls.image} alt={cls.name} className="w-full h-full object-cover" />
                          ) : (
                            <Icon className="h-16 w-16 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                        </div>
                        <div
                          className="w-full py-3 text-center"
                          style={{ background: labelColor || 'hsl(var(--primary))' }}
                        >
                          <span className="text-sm font-semibold text-primary-foreground">{cls.name}</span>
                        </div>
                      </button>
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditDialog(cls); }}
                          className="absolute -top-1.5 right-5 h-5 w-5 rounded-full bg-card border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteId(cls.id)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit class dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize {editId ? classes.find(c => c.id === editId)?.name : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Class name" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Image className="h-4 w-4" /> Card Image</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} />
              {editImage && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setEditImage('')}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> Label Color</Label>
              <NoteColorPicker value={editColor || 'hsl(175, 70%, 40%)'} onChange={setEditColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete keen confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && classes.find(c => c.id === deleteId)?.created_by === user?.id
                ? `This will permanently delete "${classes.find(c => c.id === deleteId)?.name}" for everyone. This action cannot be undone.`
                : `You'll leave "${classes.find(c => c.id === deleteId)?.name}". You can rejoin later with the Keen code.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleRemoveClass(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteId && classes.find(c => c.id === deleteId)?.created_by === user?.id ? "Delete" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Keen Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new Keen</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Keen name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !submitting && handleCreateKeen()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateKeen} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Keen Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Keen</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Insert Keen code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !submitting && handleJoinKeen()}
            className="uppercase tracking-widest text-center font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleJoinKeen} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
