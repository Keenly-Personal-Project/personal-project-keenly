import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";

const sidebarTabs = [
  "Announcements",
  "Absentee List",
  "Meeting Recordings",
  "Events List",
  "Notes/Guides",
];

const placeholderCards = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  text: "This is a placeholder announcement. Content will appear here once announcements are added to this class.",
}));

const quotes = [
  "Everything is unpredictable, calculus was made because an apple fell on someone's head.",
  "The only way to do great work is to love what you do.",
  "Education is the most powerful weapon which you can use to change the world.",
  "In the middle of difficulty lies opportunity.",
];

const ClassPage = () => {
  const { className } = useParams<{ className: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Announcements");

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

  // Resolve actual class name from localStorage
  const slug = decodeURIComponent(className || "");
  const savedClasses = JSON.parse(localStorage.getItem('keen_classes') || '[]');
  const matchedClass = savedClasses.find(
    (cls: { name: string }) => cls.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
  const displayName = matchedClass?.name || slug.replace(/-/g, " ");
  const randomQuote = quotes[displayName.length % quotes.length];

  const renderContent = () => {
    if (activeTab === "Announcements") {
      return (
        <div className="rounded-xl border border-border bg-card p-5 max-w-md mx-auto">
          <div className="flex flex-col gap-3">
            {placeholderCards.map((card) => (
              <div key={card.id} className="flex gap-3 items-start border-b border-border last:border-b-0 pb-3 last:pb-0">
                <p className="text-sm text-foreground flex-1">{card.text}</p>
                <div className="w-14 h-10 rounded border border-border bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm italic">No content yet for {activeTab}.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground underline underline-offset-4">
            {displayName}
          </h1>
          <p className="text-xl md:text-2xl text-foreground mt-1">{activeTab}</p>
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4">
          {sidebarTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground border-primary px-5"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex gap-6">
          {/* Left sidebar */}
          <div className="flex flex-col gap-2 w-48 shrink-0">
            {sidebarTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left py-4 rounded-lg border text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground border-primary px-6 w-[13rem]"
                    : "bg-card text-foreground border-border hover:bg-muted px-4 w-48"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1">
            {renderContent()}
          </div>

          {/* Right quote */}
          <div className="w-56 shrink-0 flex items-start pt-12">
            <p className="text-sm text-muted-foreground italic text-center leading-relaxed">{randomQuote}</p>
          </div>
        </div>

        {/* Mobile content */}
        <div className="md:hidden">
          {renderContent()}
          <p className="text-sm text-muted-foreground italic text-center mt-4">{randomQuote}</p>
        </div>
      </main>
    </div>
  );
};

export default ClassPage;
