import { Bell, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const Header = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary">
          <span className="text-primary-foreground text-lg font-bold tracking-wide" style={{ fontFamily: "'Kablammo', cursive" }}>keenly</span>
        </div>

        {/* Date - center */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-2xl md:text-3xl font-semibold text-foreground" style={{ fontFamily: "'Kablammo', cursive" }}>
            {formattedDate}
          </span>
        </div>

        {/* Icons - right */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" title="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </Button>
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
