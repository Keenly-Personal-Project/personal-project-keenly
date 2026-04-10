import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { generateHexCode, ClassInfo } from "@/components/Header";
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
  name: string;
  icon: string;
  image?: string;
  color?: string;
  code?: string;
}

const defaultClasses: ClassItem[] = [
  { name: "English", icon: "BookOpen" },
  { name: "Science", icon: "FlaskConical" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  FlaskConical,
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const saved = localStorage.getItem('keen_classes');
    return saved ? JSON.parse(saved) : defaultClasses;
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editColor, setEditColor] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editName, setEditName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Join/Create state
  const [keenPopoverOpen, setKeenPopoverOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Sync classes to localStorage and global registry
  useEffect(() => {
    localStorage.setItem('keen_classes', JSON.stringify(classes));
    const registry: ClassItem[] = JSON.parse(localStorage.getItem('keen_registry') || '[]');
    const registryCodes = new Set(registry.map(r => r.code));
    let updated = false;
    classes.forEach(cls => {
      if (cls.code && !registryCodes.has(cls.code)) {
        registry.push({ name: cls.name, icon: cls.icon, code: cls.code });
        updated = true;
      }
    });
    if (updated) localStorage.setItem('keen_registry', JSON.stringify(registry));
  }, [classes]);

  // Listen for class updates
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('keen_classes');
      if (saved) setClasses(JSON.parse(saved));
    };
    window.addEventListener('keen_classes_updated', handleUpdate);
    return () => window.removeEventListener('keen_classes_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleRemoveClass = (index: number) => {
    setDeletingIndex(index);
    setTimeout(() => {
      setClasses(prev => prev.filter((_, i) => i !== index));
      setDeletingIndex(null);
      setDeleteIndex(null);
    }, 300);
  };

  const openEditDialog = (index: number) => {
    setEditIndex(index);
    setEditColor(classes[index].color || '');
    setEditImage(classes[index].image || '');
    setEditName(classes[index].name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editIndex === null) return;
    setClasses(prev => prev.map((cls, i) =>
      i === editIndex ? { ...cls, name: editName.trim() || cls.name, color: editColor || undefined, image: editImage || undefined } : cls
    ));
    setEditDialogOpen(false);
    setEditIndex(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateKeen = () => {
    if (!newClassName.trim()) return;
    const allClasses = JSON.parse(localStorage.getItem("keen_classes") || "[]");
    const code = generateHexCode();
    const newClass = { name: newClassName.trim(), icon: "BookOpen", code };
    allClasses.push(newClass);
    localStorage.setItem("keen_classes", JSON.stringify(allClasses));
    setNewClassName("");
    setCreateDialogOpen(false);
    const slug = newClass.name.toLowerCase().replace(/\s+/g, "-");
    localStorage.setItem(`keen_preview_role_${slug}`, "owner");
    toast.success(`Keen created! Code: ${code}`);
    window.dispatchEvent(new Event("keen_classes_updated"));
    navigate(`/class/${slug}`);
  };

  const handleJoinKeen = () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) return;
    const currentClasses: ClassInfo[] = JSON.parse(localStorage.getItem("keen_classes") || "[]");
    const alreadyJoined = currentClasses.find(c => c.code === trimmed);
    if (alreadyJoined) {
      toast.info("You're already in this Keen!");
      setJoinCode("");
      setJoinDialogOpen(false);
      return;
    }
    const registry: ClassInfo[] = JSON.parse(localStorage.getItem("keen_registry") || "[]");
    const found = registry.find(c => c.code === trimmed);
    if (!found) {
      toast.error("No Keen found with that code.");
      return;
    }
    // Add to pending requests instead of directly joining
    const pendingSlug = found.name!.toLowerCase().replace(/\s+/g, "-");
    const pendingKey = `keen_pending_${pendingSlug}`;
    const pending: { email: string; timestamp: string }[] = JSON.parse(localStorage.getItem(pendingKey) || "[]");
    const userEmail = user?.email || "unknown@user.com";
    if (pending.find(p => p.email === userEmail)) {
      toast.info("You've already requested to join this Keen. Waiting for approval.");
      setJoinCode("");
      setJoinDialogOpen(false);
      return;
    }
    pending.push({ email: userEmail, timestamp: new Date().toISOString() });
    localStorage.setItem(pendingKey, JSON.stringify(pending));
    setJoinCode("");
    setJoinDialogOpen(false);
    toast.success(`Join request sent for "${found.name}"! Waiting for owner/admin approval.`);
  };

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
          <div className="w-full bg-primary py-6 px-8 flex items-center justify-center relative">
            <h1
              className="text-4xl md:text-5xl text-primary-foreground font-bold"
              style={{ fontFamily: "'Amatic SC', cursive", letterSpacing: '0.4em' }}
            >
              Keen's
            </h1>

            {/* Join/Create Keen button - absolute right */}
            <div className="absolute right-8">

            {/* Join/Create Keen button */}
            <Popover open={keenPopoverOpen} onOpenChange={setKeenPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="h-9 px-4 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/20 transition-colors flex items-center gap-1.5"
                  onMouseEnter={() => setKeenPopoverOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Join/Create Keen</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-48 p-1"
                align="end"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {classes.map((cls, index) => {
                const Icon = iconMap[cls.icon] || BookOpen;
                const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
                const labelColor = cls.color || undefined;
                return (
                  <div
                    key={`${cls.name}-${index}`}
                    className={`relative group transition-all duration-300 ${deletingIndex === index ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  >
                    <button
                      onClick={() => navigate(`/class/${slug}`)}
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
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditDialog(index); }}
                      className="absolute -top-1.5 right-5 h-5 w-5 rounded-full bg-card border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => setDeleteIndex(index)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Edit class dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize {editIndex !== null ? classes[editIndex]?.name : ''}</DialogTitle>
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
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteIndex !== null ? classes[deleteIndex]?.name : ''}" and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteIndex !== null && handleRemoveClass(deleteIndex)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
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
            onKeyDown={(e) => e.key === "Enter" && handleCreateKeen()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateKeen}>Create</Button>
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
            onKeyDown={(e) => e.key === "Enter" && handleJoinKeen()}
            className="uppercase tracking-widest text-center font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleJoinKeen}>Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
