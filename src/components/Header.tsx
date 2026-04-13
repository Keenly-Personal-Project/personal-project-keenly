import { Bell, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useState, useEffect, useRef, useCallback } from "react";
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
  date?: string;
}

interface Notification {
  keenName: string;
  keenSlug: string;
  announcementId: string;
  brief: string;
  description: string;
  date?: string;
}

function ResizableNotificationPanel({ notifications, onNotificationClick }: { notifications: Notification[]; onNotificationClick: (n: Notification) => void }) {
  const [height, setHeight] = useState(288);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startH.current = height;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientY - startY.current;
      setHeight(Math.max(120, Math.min(600, startH.current + delta)));
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [height]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startH.current = height;

    const onTouchMove = (ev: TouchEvent) => {
      if (!isDragging.current) return;
      const delta = ev.touches[0].clientY - startY.current;
      setHeight(Math.max(120, Math.min(600, startH.current + delta)));
    };
    const onTouchEnd = () => {
      isDragging.current = false;
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onTouchEnd);
  }, [height]);

  return (
    <div>
      <div className="p-3 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
      </div>
      <div className="overflow-y-auto" style={{ height }} ref={(el) => { if (el) requestAnimationFrame(() => el.scrollTop = el.scrollHeight); }}>
        {notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">No new notifications</p>
        ) : (
          notifications.map((notif, i) => (
            <button
              key={`${notif.keenSlug}-${notif.announcementId}-${i}`}
              onClick={() => onNotificationClick(notif)}
              className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary">{notif.keenName}</p>
                {notif.date && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(notif.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <p className="text-sm font-medium text-foreground mt-0.5">{notif.brief}</p>
              {notif.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
              )}
            </button>
          ))
        )}
      </div>
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="flex items-center justify-center h-4 cursor-ns-resize border-t border-border hover:bg-muted/50 transition-colors"
      >
        <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  );
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
              date: ann.date,
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
            <PopoverContent className="p-0 overflow-hidden" align="end" style={{ width: 320 }}>
              <ResizableNotificationPanel notifications={notifications} onNotificationClick={handleNotificationClick} />
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
