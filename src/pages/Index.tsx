import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { Loader2, BookOpen, FlaskConical, Plus, X, Pencil, Image, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClassItem {
  name: string;
  icon: string;
  image?: string;
  color?: string;
}

const defaultClasses: ClassItem[] = [
  { name: "English", icon: "BookOpen" },
  { name: "Science", icon: "FlaskConical" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  FlaskConical,
};

const presetColors = [
  "hsl(175, 70%, 40%)",   // primary teal
  "hsl(280, 60%, 50%)",   // purple
  "hsl(340, 70%, 50%)",   // pink
  "hsl(200, 70%, 50%)",   // blue
  "hsl(38, 92%, 50%)",    // orange
  "hsl(145, 65%, 42%)",   // green
  "hsl(0, 72%, 55%)",     // red
  "hsl(260, 50%, 60%)",   // lavender
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const saved = localStorage.getItem('keen_classes');
    return saved ? JSON.parse(saved) : defaultClasses;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editColor, setEditColor] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('keen_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    setClasses(prev => [...prev, { name: newClassName.trim(), icon: 'BookOpen' }]);
    setNewClassName('');
    setDialogOpen(false);
  };

  const handleRemoveClass = (index: number) => {
    setClasses(prev => prev.filter((_, i) => i !== index));
  };

  const openEditDialog = (index: number) => {
    setEditIndex(index);
    setEditColor(classes[index].color || '');
    setEditImage(classes[index].image || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editIndex === null) return;
    setClasses(prev => prev.map((cls, i) =>
      i === editIndex ? { ...cls, color: editColor || undefined, image: editImage || undefined } : cls
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 px-4">
        <div className="rounded-2xl border border-border bg-card min-h-[calc(100vh-8rem)] overflow-hidden">
          {/* Banner */}
          <div className="w-full bg-primary py-6 px-8">
            <h1
              className="text-3xl md:text-4xl text-primary-foreground text-center"
              style={{ fontFamily: "'Brittany Signature', cursive", letterSpacing: '0.684em' }}
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
                  <div key={`${cls.name}-${index}`} className="relative group">
                    <button
                      onClick={() => navigate(`/class/${slug}`)}
                      className="w-full flex flex-col rounded-xl border border-border overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-card"
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
                        style={{ backgroundColor: labelColor || 'hsl(var(--primary))' }}
                      >
                        <span className="text-sm font-semibold text-primary-foreground">{cls.name}</span>
                      </div>
                    </button>
                    {/* Edit button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditDialog(index); }}
                      className="absolute top-2 right-8 h-6 w-6 rounded-full bg-card border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveClass(index)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add new card */}
              <button
                onClick={() => setDialogOpen(true)}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-all duration-200 hover:border-primary hover:bg-primary/5 cursor-pointer"
                style={{ aspectRatio: '3 / 4.75' }}
              >
                <Plus className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">Add Class</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add class dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new class</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit class dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize {editIndex !== null ? classes[editIndex]?.name : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${editColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
