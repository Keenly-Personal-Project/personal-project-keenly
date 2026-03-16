import { Megaphone, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: "urgent" | "info" | "general";
  date: string;
  author: string;
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: "School Closed Tomorrow",
    content: "Due to weather conditions, the school will be closed tomorrow. All classes will be conducted online.",
    type: "urgent",
    date: "Today",
    author: "Principal Office",
  },
  {
    id: 2,
    title: "Science Fair Registration Open",
    content: "Registration for the annual science fair is now open. Submit your project proposals by February 15th.",
    type: "info",
    date: "Yesterday",
    author: "Science Department",
  },
  {
    id: 3,
    title: "Parent-Teacher Conference",
    content: "The upcoming parent-teacher conference is scheduled for next Friday. Please book your slots online.",
    type: "general",
    date: "2 days ago",
    author: "Administration",
  },
  {
    id: 4,
    title: "New Library Hours",
    content: "Starting next week, the library will be open from 7 AM to 8 PM on weekdays.",
    type: "info",
    date: "3 days ago",
    author: "Library",
  },
];

const typeStyles = {
  urgent: {
    container: "announcement-item announcement-urgent bg-destructive/5",
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    badge: "bg-destructive/10 text-destructive",
  },
  info: {
    container: "announcement-item announcement-info",
    icon: <Info className="h-4 w-4 text-primary" />,
    badge: "bg-primary/10 text-primary",
  },
  general: {
    container: "announcement-item bg-secondary/30",
    icon: <Megaphone className="h-4 w-4 text-muted-foreground" />,
    badge: "bg-muted text-muted-foreground",
  },
};

const AnnouncementsList = () => {
  return (
    <section id="announcements" className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="section-title">Announcements</h2>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((announcement) => {
          const styles = typeStyles[announcement.type];
          return (
            <article
              key={announcement.id}
              className={`${styles.container} cursor-pointer group`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{styles.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {announcement.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${styles.badge}`}>
                      {announcement.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{announcement.author}</span>
                    <span>•</span>
                    <span>{announcement.date}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AnnouncementsList;
