import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from "@/components/Header";
import Timetable from "@/components/Timetable";
import AbsenteeTracker from "@/components/AbsenteeTracker";
import AnnouncementsList from "@/components/AnnouncementsList";
import CheckInButton from "@/components/CheckInButton";
import { Loader2 } from 'lucide-react';

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Good Morning! 👋</h1>
            <p className="text-muted-foreground">Here's what's happening today.</p>
          </div>
          <CheckInButton />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timetable - Full width on mobile, half on desktop */}
          <div className="lg:col-span-2">
            <Timetable />
          </div>

          {/* Absentee and Announcements side by side on desktop */}
          <AbsenteeTracker />
          <AnnouncementsList />
        </div>
      </main>
    </div>
  );
};

export default Index;
