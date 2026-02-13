import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { Loader2 } from 'lucide-react';
import {
  BookOpen, FlaskConical, Globe, Calculator,
  Palette, Music, Dumbbell, Code, Languages, History
} from 'lucide-react';

const classes = [
  { name: "English", icon: BookOpen, color: "bg-primary/10 text-primary border-primary/20" },
  { name: "Science", icon: FlaskConical, color: "bg-accent text-accent-foreground border-accent-foreground/20" },
  { name: "Geography", icon: Globe, color: "bg-primary/10 text-primary border-primary/20" },
  { name: "Mathematics", icon: Calculator, color: "bg-accent text-accent-foreground border-accent-foreground/20" },
  { name: "Art", icon: Palette, color: "bg-primary/10 text-primary border-primary/20" },
  { name: "Music", icon: Music, color: "bg-accent text-accent-foreground border-accent-foreground/20" },
  { name: "Physical Ed", icon: Dumbbell, color: "bg-primary/10 text-primary border-primary/20" },
  { name: "Computer Science", icon: Code, color: "bg-accent text-accent-foreground border-accent-foreground/20" },
  { name: "Languages", icon: Languages, color: "bg-primary/10 text-primary border-primary/20" },
  { name: "History", icon: History, color: "bg-accent text-accent-foreground border-accent-foreground/20" },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
        <div className="rounded-2xl border border-border bg-card p-6 md:p-10 min-h-[calc(100vh-8rem)]">
          <h1
            className="text-4xl md:text-5xl font-bold text-foreground mb-8"
            style={{ fontFamily: "'Kablammo', cursive" }}
          >
            Keen's.
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {classes.map((cls) => {
              const Icon = cls.icon;
              const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
              return (
                <button
                  key={cls.name}
                  onClick={() => navigate(`/class/${slug}`)}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer ${cls.color}`}
                >
                  <Icon className="h-8 w-8" />
                  <span className="text-sm font-semibold">{cls.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
