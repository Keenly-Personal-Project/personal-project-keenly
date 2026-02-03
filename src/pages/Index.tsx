import Header from "@/components/Header";
import Timetable from "@/components/Timetable";
import AbsenteeTracker from "@/components/AbsenteeTracker";
import AnnouncementsList from "@/components/AnnouncementsList";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Good Morning! 👋</h1>
          <p className="text-muted-foreground">Here's what's happening today.</p>
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
