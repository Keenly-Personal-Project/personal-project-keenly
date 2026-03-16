import { Megaphone, Pin, ChevronRight } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  time: string;
  isPinned?: boolean;
  category: "general" | "urgent" | "event" | "reminder";
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: "School Assembly Tomorrow",
    excerpt: "All students are required to attend the morning assembly at 8:30 AM in the main auditorium.",
    author: "Principal Adams",
    time: "2 hours ago",
    isPinned: true,
    category: "urgent",
  },
  {
    id: 2,
    title: "Science Fair Registration Open",
    excerpt: "Registration for the annual science fair is now open. Submit your projects by February 15th.",
    author: "Science Department",
    time: "5 hours ago",
    category: "event",
  },
  {
    id: 3,
    title: "Library Hours Extended",
    excerpt: "The library will be open until 6 PM during exam week to accommodate student study needs.",
    author: "Library Staff",
    time: "Yesterday",
    category: "general",
  },
  {
    id: 4,
    title: "Sports Day Preparations",
    excerpt: "Students participating in sports day should collect their team uniforms from the gym.",
    author: "PE Department",
    time: "2 days ago",
    category: "reminder",
  },
];

const categoryStyles = {
  general: "bg-secondary text-secondary-foreground",
  urgent: "bg-destructive/10 text-destructive",
  event: "bg-primary/10 text-primary",
  reminder: "bg-accent/10 text-accent-foreground",
};

const AnnouncementsList = () => {
  return (
    <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="section-title">Announcements</h2>
        </div>
        <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          See all
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <article
            key={announcement.id}
            className="group p-4 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-all cursor-pointer border border-transparent hover:border-border"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {announcement.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-accent-foreground shrink-0" />
                  )}
                  <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {announcement.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {announcement.excerpt}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{announcement.author}</span>
                  <span>•</span>
                  <span>{announcement.time}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ml-auto ${categoryStyles[announcement.category]}`}>
                    {announcement.category}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementsList;
