import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { Loader2, BookOpen, FlaskConical, X, Pencil, Image, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NoteColorPicker from '@/components/NoteColorPicker';

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

  // Sync classes to localStorage and global registry
  useEffect(() => {
    localStorage.setItem('keen_classes', JSON.stringify(classes));
    // Update global registry with any classes that have codes
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

  // Listen for class updates from header
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
          <div className="w-full bg-primary py-6 px-8">
            <h1
              className="text-4xl md:text-5xl text-primary-foreground text-center font-bold"
              style={{ fontFamily: "'Amatic SC', cursive", letterSpacing: '0.4em' }}
            >
              Keen's
            </h1>
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
                      <div
                        className="flex items-center justify-center aspect-[3/4] bg-muted/50 overflow-hidden"
                      >
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
                    {/* Edit button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditDialog(index); }}
                      className="absolute -top-1.5 right-5 h-5 w-5 rounded-full bg-card border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    {/* Remove button */}
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
            {/* Name */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Class name" />
            </div>

            {/* Image upload */}
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

            {/* Color picker */}
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
    </div>
  );
};

export default Index;
