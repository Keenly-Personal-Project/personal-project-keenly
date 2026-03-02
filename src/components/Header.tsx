import { Bell, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Announcement {
  id: string;
  brief: string;
  description: string;
  image?: string;
}

interface ClassInfo {
  name: string;
}

interface Notification {
  keenName: string;
  keenSlug: string;
  announcementId: string;
  brief: string;
  description: string;
}

const Header = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const buildNotifications = () => {
      const classes: ClassInfo[] = JSON.parse(localStorage.getItem('keen_classes') || '[]');
      const seenKey = 'keen_seen_announcements';
      const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || '[]');
      const notifs: Notification[] = [];

      classes.forEach((cls) => {
        const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
        const storageKey = `keen_announcements_${slug}`;
        const announcements: Announcement[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        announcements.forEach((ann) => {
          const uid = `${slug}_${ann.id}`;
          if (!seen.includes(uid)) {
            notifs.push({
              keenName: cls.name,
              keenSlug: slug,
              announcementId: ann.id,
              brief: ann.brief,
              description: ann.description,
            });
          }
        });
      });

      setNotifications(notifs);
    };

    buildNotifications();
    const interval = setInterval(buildNotifications, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (notif: Notification) => {
    const seenKey = 'keen_seen_announcements';
    const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || '[]');
    const uid = `${notif.keenSlug}_${notif.announcementId}`;
    if (!seen.includes(uid)) {
      seen.push(uid);
      localStorage.setItem(seenKey, JSON.stringify(seen));
    }
    setNotifications((prev) => prev.filter((n) => !(n.keenSlug === notif.keenSlug && n.announcementId === notif.announcementId)));
    navigate(`/class/${notif.keenSlug}/announcement/${notif.announcementId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const today = new Date();
  const formattedDate = format(today, "EEEE, do MMMM, yyyy");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo - left */}
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary">
          <span className="text-primary-foreground text-lg font-bold leading-none">|&lt;</span>
        </div>

        {/* Date - center */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-2xl md:text-3xl text-foreground" style={{ fontFamily: "'Brittany Signature', cursive" }}>
            {formattedDate}
          </span>
        </div>

        {/* Icons - right */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" title="Notifications">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((notif, i) => (
                    <button
                      key={`${notif.keenSlug}-${notif.announcementId}-${i}`}
                      onClick={() => handleNotificationClick(notif)}
                      className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                    >
                      <p className="text-xs font-semibold text-primary">{notif.keenName}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{notif.brief}</p>
                      {notif.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          {user && (
            <>
              <Button variant="ghost" size="icon" title="Profile" onClick={() => navigate('/profile')}>
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" title="Settings" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Log out">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
