import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, RefreshCw, Plus, Camera, Pencil, Wifi, WifiOff, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useProfile, AvailabilityMode } from "@/hooks/useProfile";

interface StoredAccount {
  email: string;
  initials: string;
}

const AVAILABILITY_CONFIG: Record<AvailabilityMode, { label: string; color: string; dotClass: string; icon: React.ReactNode; desc: string }> = {
  live: {
    label: "Live",
    color: "text-green-500",
    dotClass: "bg-green-500",
    icon: <Wifi className="h-4 w-4" />,
    desc: "Automatically shows online/offline in real time",
  },
  discrete: {
    label: "Discrete",
    color: "text-yellow-500",
    dotClass: "bg-yellow-500",
    icon: <EyeOff className="h-4 w-4" />,
    desc: "Status stays the same whether online or offline",
  },
  offline: {
    label: "Offline",
    color: "text-gray-400",
    dotClass: "bg-gray-400",
    icon: <WifiOff className="h-4 w-4" />,
    desc: "Always appear offline to others",
  },
};

const ProfileDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, updateProfile, uploadAvatar } = useProfile();

  const [open, setOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);

  const [textStatus, setTextStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = user?.email || "Unknown";
  const username = email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  const currentMode: AvailabilityMode = (profile?.availability_mode as AvailabilityMode) || "live";
  const availConfig = AVAILABILITY_CONFIG[currentMode];

  useEffect(() => {
    if (profile) setTextStatus(profile.text_status || "");
  }, [profile]);

  // Stored accounts
  const ACCOUNTS_KEY = "keen_known_accounts";
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);

  useEffect(() => {
    const saved: StoredAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
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
    toast({ title: "Logged out", description: "You have been logged out successfully." });
  };

  const handleSwitchAccount = async (account: StoredAccount) => {
    if (account.email === email) return;
    await signOut();
    setAccountDialogOpen(false);
    setOpen(false);
    navigate("/auth");
    toast({ title: "Switched", description: `Please sign in as ${account.email}` });
  };

  const handleAddAccount = async () => {
    await signOut();
    setAccountDialogOpen(false);
    setOpen(false);
    navigate("/auth");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadAvatar(file);
    setUploading(false);
    toast({ title: "Avatar updated" });
  };

  const handleSaveTextStatus = async () => {
    await updateProfile({ text_status: textStatus });
    toast({ title: "Status updated" });
  };

  const handleSetAvailability = async (mode: AvailabilityMode) => {
    await updateProfile({ availability_mode: mode });
    setAvailabilityDialogOpen(false);
    toast({ title: `Mode set to ${AVAILABILITY_CONFIG[mode].label}` });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring" title="Profile">
            <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
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
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{username}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
                {profile?.text_status && (
                  <p className="text-xs text-muted-foreground/70 truncate italic mt-0.5">"{profile.text_status}"</p>
                )}
              </div>
            </div>
          </div>

          {/* Status & Settings */}
          <div className="p-2 border-b border-border">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
              onClick={() => { setOpen(false); setAvailabilityDialogOpen(true); }}
            >
              <span className={`h-3 w-3 rounded-full ${availConfig.dotClass}`} />
              <span className={`text-sm ${availConfig.color}`}>{availConfig.label}</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
              onClick={() => { setOpen(false); setProfileEditOpen(true); }}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">Profile Edits</span>
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

      {/* Profile Edit Dialog */}
      <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile Edits</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-20 w-20">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}

            {/* Text Status */}
            <div className="w-full space-y-2">
              <label className="text-sm font-medium text-foreground">Text Status</label>
              <Input
                value={textStatus}
                onChange={(e) => setTextStatus(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground text-right">{textStatus.length}/80</p>
              <Button size="sm" className="w-full" onClick={handleSaveTextStatus}>
                Save Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Availability Mode Dialog */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Availability Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(Object.keys(AVAILABILITY_CONFIG) as AvailabilityMode[]).map((mode) => {
              const cfg = AVAILABILITY_CONFIG[mode];
              const isActive = currentMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleSetAvailability(mode)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left border ${
                    isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full ${cfg.dotClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                      {cfg.label} Mode
                    </p>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
                    isCurrent ? "bg-muted/60 cursor-default" : "hover:bg-muted/50 cursor-pointer"
                  }`}
                  onClick={() => handleSwitchAccount(account)}
                  disabled={isCurrent}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className={`text-xs font-semibold ${
                        isCurrent ? "bg-muted-foreground/20 text-muted-foreground" : "bg-primary text-primary-foreground"
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
