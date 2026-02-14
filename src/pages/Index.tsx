import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import { Loader2, BookOpen, FlaskConical } from 'lucide-react';

const classes = [
  { name: "English", icon: BookOpen },
  { name: "Science", icon: FlaskConical },
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
        <div className="rounded-2xl border border-border bg-card min-h-[calc(100vh-8rem)] overflow-hidden">
          {/* Banner */}
          <div className="w-full bg-primary py-6 px-8">
            <h1
              className="text-3xl md:text-4xl text-primary-foreground text-center"
              style={{ fontFamily: "'Kablammo', cursive" }}
            >
              Keen's
            </h1>
          </div>

          {/* Class cards grid */}
          <div className="p-6 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {classes.map((cls) => {
                const Icon = cls.icon;
                const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <button
                    key={cls.name}
                    onClick={() => navigate(`/class/${slug}`)}
                    className="group flex flex-col rounded-xl border border-border overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-card"
                  >
                    {/* Icon area */}
                    <div className="flex items-center justify-center aspect-[3/4] bg-muted/50">
                      <Icon className="h-16 w-16 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    {/* Label bar */}
                    <div className="w-full py-3 bg-primary text-center">
                      <span className="text-sm font-semibold text-primary-foreground">{cls.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
