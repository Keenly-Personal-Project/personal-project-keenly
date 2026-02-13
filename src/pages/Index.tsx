import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { Loader2, BookOpen, FlaskConical } from 'lucide-react';

const classes = [
  { name: "English", icon: BookOpen, color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" },
  { name: "Science", icon: FlaskConical, color: "bg-accent text-accent-foreground border-accent-foreground/20 hover:bg-accent/80" },
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
            className="text-4xl md:text-5xl font-bold text-foreground mb-10 text-center"
            style={{ fontFamily: "'Kablammo', cursive" }}
          >
            Keen's
          </h1>

          <div className="flex justify-center gap-6">
            {classes.map((cls) => {
              const Icon = cls.icon;
              const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
              return (
                <button
                  key={cls.name}
                  onClick={() => navigate(`/class/${slug}`)}
                  className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 w-40 h-56 md:w-48 md:h-64 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer ${cls.color}`}
                >
                  <Icon className="h-12 w-12" />
                  <span className="text-base font-bold">{cls.name}</span>
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
