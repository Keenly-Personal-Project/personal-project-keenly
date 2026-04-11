import { Bell, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useChat } from "@/contexts/ChatContext";

export interface ClassInfo {
  name: string;
  code?: string;
  icon?: string;
}

export function generateHexCode(): string {
  const classes: ClassInfo[] = JSON.parse(localStorage.getItem("keen_classes") || "[]");
  const registry: ClassInfo[] = JSON.parse(localStorage.getItem("keen_registry") || "[]");
  const existingCodes = new Set([
    ...classes.map(c => c.code).filter(Boolean),
    ...registry.map(c => c.code).filter(Boolean),
  ]);
  let code: string;
  do {
    code = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, "0");
  } while (existingCodes.has(code));
  return code;
}

interface Announcement {
  id: string;
  brief: string;
  description: string;
  image?: string;
}

interface Notification {
  keenName: string;
  keenSlug: string;
  announcementId: string;
  brief: string;
  description: string;
}

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatOpen, toggleChat } = useChat();

  const handleLogoClick = () => {
    if (location.pathname === "/") return;
    const main = document.querySelector("main");
    if (main) {
      main.style.transition = "opacity 0.3s ease-out";
      main.style.opacity = "0";
      setTimeout(() => {
        navigate("/");
        requestAnimationFrame(() => {
          const newMain = document.querySelector("main");
          if (newMain) {
            newMain.style.opacity = "0";
            newMain.style.transition = "opacity 0.3s ease-in";
            requestAnimationFrame(() => {
              newMain.style.opacity = "1";
            });
          }
        });
      }, 300);
    } else {
      navigate("/");
    }
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const buildNotifications = () => {
      const classes: ClassInfo[] = JSON.parse(localStorage.getItem("keen_classes") || "[]");
      const seenKey = "keen_seen_announcements";
      const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || "[]");
      const notifs: Notification[] = [];

      classes.forEach((cls) => {
        const slug = cls.name.toLowerCase().replace(/\s+/g, "-");
        const storageKey = `keen_announcements_${slug}`;
        const announcements: Announcement[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
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
    const seenKey = "keen_seen_announcements";
    const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || "[]");
    const uid = `${notif.keenSlug}_${notif.announcementId}`;
    if (!seen.includes(uid)) {
      seen.push(uid);
      localStorage.setItem(seenKey, JSON.stringify(seen));
    }
    setNotifications((prev) =>
      prev.filter((n) => !(n.keenSlug === notif.keenSlug && n.announcementId === notif.announcementId)),
    );
    navigate(`/class/${notif.keenSlug}/announcement/${notif.announcementId}`);
  };

  const today = new Date();
  const formattedDate = format(today, "EEEE, do MMMM, yyyy");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 md:px-8 lg:px-[1cm]">
        {/* Logo - left */}
        <div
          className="inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary cursor-pointer shrink-0"
          onClick={handleLogoClick}
        >
          <span className="text-primary-foreground text-sm sm:text-lg font-bold leading-none">|&lt;</span>
        </div>

        {/* Date - center */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <span
            className="text-sm sm:text-2xl md:text-3xl text-foreground font-bold whitespace-nowrap"
            style={{ fontFamily: "'Amatic SC', cursive" }}
          >
            {formattedDate}
          </span>
        </div>

        {/* Icons - right */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10" title="Notifications">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
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
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 sm:h-10 sm:w-10 ${chatOpen ? "bg-accent" : ""}`}
            title="Ryu AI"
            onClick={toggleChat}
          >
            <BotMessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          {user && <ProfileDropdown />}
        </div>
      </div>
    </header>
  );
};

export default Header;
