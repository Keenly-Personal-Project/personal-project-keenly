import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { Loader2, BookOpen, FlaskConical, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const defaultClasses = [
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
  const [classes, setClasses] = useState(() => {
    const saved = localStorage.getItem('keen_classes');
    return saved ? JSON.parse(saved) : defaultClasses;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

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
    setClasses((prev: typeof defaultClasses) => [...prev, { name: newClassName.trim(), icon: 'BookOpen' }]);
    setNewClassName('');
    setDialogOpen(false);
  };

  const handleRemoveClass = (index: number) => {
    setClasses((prev: typeof defaultClasses) => prev.filter((_: any, i: number) => i !== index));
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
              {classes.map((cls: { name: string; icon: string }, index: number) => {
                const Icon = iconMap[cls.icon] || BookOpen;
                const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <div key={`${cls.name}-${index}`} className="relative group">
                    <button
                      onClick={() => navigate(`/class/${slug}`)}
                      className="w-full flex flex-col rounded-xl border border-border overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-card"
                    >
                      <div className="flex items-center justify-center aspect-[3/4] bg-muted/50">
                        <Icon className="h-16 w-16 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="w-full py-3 bg-primary text-center">
                        <span className="text-sm font-semibold text-primary-foreground">{cls.name}</span>
                      </div>
                    </button>
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
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border aspect-[3/5] transition-all duration-200 hover:border-primary hover:bg-primary/5 cursor-pointer"
              >
                <Plus className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">Add Class</span>
              </button>
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
};

export default Index;
