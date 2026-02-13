import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";

const ClassPage = () => {
  const { className } = useParams<{ className: string }>();
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

  const displayName = decodeURIComponent(className || "").replace(/-/g, " ");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "'Kablammo', cursive" }}>
          {displayName}
        </h1>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-lg">This page is ready to be customized for <span className="font-semibold text-foreground">{displayName}</span>.</p>
        </div>
      </main>
    </div>
  );
};

export default ClassPage;
