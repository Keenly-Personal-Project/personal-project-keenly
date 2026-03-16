import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, UserPlus, Circle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

const ProfileDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const email = user?.email || "Unknown";
  const username = email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring" title="Profile">
          <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end" sideOffset={8}>
        {/* Account Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{username}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="p-2 border-b border-border">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
            <Circle className="h-3.5 w-3.5 text-success fill-success" />
            <span className="text-sm text-foreground">Available</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground" onClick={() => { setOpen(false); navigate('/settings'); }}>Settings</span>
          </button>
        </div>

        {/* Actions */}
        <div className="p-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
            <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">Add another account</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 transition-colors text-left"
          >
            <LogOut className="h-3.5 w-3.5 text-destructive" />
            <span className="text-sm text-destructive">Sign out</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ProfileDropdown;
