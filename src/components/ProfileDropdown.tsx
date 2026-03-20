import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, RefreshCw, Circle, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StoredAccount {
  email: string;
  initials: string;
}

const ProfileDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const email = user?.email || "Unknown";
  const username = email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  // Manage stored accounts in localStorage
  const ACCOUNTS_KEY = "keen_known_accounts";

  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);

  useEffect(() => {
    const saved: StoredAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    // Ensure current account is in the list
    if (user?.email && !saved.find((a) => a.email === user.email)) {
      const updated = [...saved, { email: user.email, initials }];
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      setStoredAccounts(updated);
    } else {
      setStoredAccounts(saved);
    }
  }, [user?.email, initials]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const handleSwitchAccount = async (account: StoredAccount) => {
    if (account.email === email) return; // Already current
    // Sign out and redirect to auth with hint
    await signOut();
    setAccountDialogOpen(false);
    setOpen(false);
    navigate("/auth");
    toast({
      title: "Switched",
      description: `Please sign in as ${account.email}`,
    });
  };

  const handleAddAccount = async () => {
    await signOut();
    setAccountDialogOpen(false);
    setOpen(false);
    navigate("/auth");
  };

  return (
    <>
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

          {/* Status & Settings */}
          <div className="p-2 border-b border-border">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
              <Circle className="h-3.5 w-3.5 text-success fill-success" />
              <span className="text-sm text-foreground">Available</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
              onClick={() => { setOpen(false); navigate('/settings'); }}
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">Settings</span>
            </button>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
              onClick={() => { setOpen(false); setAccountDialogOpen(true); }}
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">Change Account</span>
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

      {/* Change Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {storedAccounts.map((account) => {
              const isCurrent = account.email === email;
              return (
                <button
                  key={account.email}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                    isCurrent
                      ? "bg-muted/60 cursor-default"
                      : "hover:bg-muted/50 cursor-pointer"
                  }`}
                  onClick={() => handleSwitchAccount(account)}
                  disabled={isCurrent}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "bg-muted-foreground/20 text-muted-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {account.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isCurrent ? "text-muted-foreground" : "text-foreground"}`}>
                      {account.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleAddAccount}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left border border-dashed border-border mt-1"
          >
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Add another account</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileDropdown;
