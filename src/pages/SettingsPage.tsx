import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PasswordChangeDialog from "@/components/PasswordChangeDialog";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, User, Palette, Bell, Shield, Info, Loader2, Check, Moon, Sun, Upload, X,
} from "lucide-react";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BG_STORAGE_KEY = "keen_custom_bg";
const BG_BLUR_KEY = "keen_custom_bg_blur";
const BG_POSX_KEY = "keen_custom_bg_posx";
const BG_POSY_KEY = "keen_custom_bg_posy";

export function getCustomBackground(): { url: string | null; blur: number; posX: number; posY: number } {
  const url = localStorage.getItem(BG_STORAGE_KEY);
  const blur = parseInt(localStorage.getItem(BG_BLUR_KEY) || "0", 10);
  const posX = parseInt(localStorage.getItem(BG_POSX_KEY) || "50", 10);
  const posY = parseInt(localStorage.getItem(BG_POSY_KEY) || "50", 10);
  return { url, blur, posX, posY };
}

const SettingsPage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Theme
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  // Notifications
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);

  // Password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  

  // Background
  const [bgUrl, setBgUrl] = useState<string | null>(() => localStorage.getItem(BG_STORAGE_KEY));
  const [bgBlur, setBgBlur] = useState<number>(() => parseInt(localStorage.getItem(BG_BLUR_KEY) || "0", 10));
  const [bgPosX, setBgPosX] = useState<number>(() => parseInt(localStorage.getItem(BG_POSX_KEY) || "50", 10));
  const [bgPosY, setBgPosY] = useState<number>(() => parseInt(localStorage.getItem(BG_POSY_KEY) || "50", 10));
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEscapeBack(-1 as any);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const email = user.email || "Unknown";
  const username = email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleDeleteAccount = async () => {
    toast.info("Please contact support to delete your account.");
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `backgrounds/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("note-attachments").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("note-attachments").getPublicUrl(path);
      const url = urlData.publicUrl;
      localStorage.setItem(BG_STORAGE_KEY, url);
      setBgUrl(url);
      window.dispatchEvent(new Event("bg-updated"));
      toast.success("Background updated!");
    } catch (err) {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        localStorage.setItem(BG_STORAGE_KEY, url);
        setBgUrl(url);
        window.dispatchEvent(new Event("bg-updated"));
        toast.success("Background updated!");
      };
      reader.readAsDataURL(file);
    } finally {
      setBgUploading(false);
    }
  };

  const handleBlurChange = (val: number[]) => {
    const v = val[0];
    setBgBlur(v);
    localStorage.setItem(BG_BLUR_KEY, v.toString());
    window.dispatchEvent(new Event("bg-updated"));
  };

  const handlePosXChange = (val: number[]) => {
    const v = val[0];
    setBgPosX(v);
    localStorage.setItem(BG_POSX_KEY, v.toString());
    window.dispatchEvent(new Event("bg-updated"));
  };

  const handlePosYChange = (val: number[]) => {
    const v = val[0];
    setBgPosY(v);
    localStorage.setItem(BG_POSY_KEY, v.toString());
    window.dispatchEvent(new Event("bg-updated"));
  };

  const handleRemoveBg = () => {
    localStorage.removeItem(BG_STORAGE_KEY);
    localStorage.removeItem(BG_BLUR_KEY);
    localStorage.removeItem(BG_POSX_KEY);
    localStorage.removeItem(BG_POSY_KEY);
    setBgUrl(null);
    setBgBlur(0);
    setBgPosX(50);
    setBgPosY(50);
    window.dispatchEvent(new Event("bg-updated"));
    toast.success("Background removed.");
  };

  return (
    <div className="min-h-screen animate-fade-in">
      <Header />
      <main className="container py-6 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-6" value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
              <Palette className="h-3.5 w-3.5" /> Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="h-3.5 w-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-foreground">{username}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-sm text-foreground">{email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">User ID</Label>
                  <p className="text-sm text-foreground font-mono text-xs">{user.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Joined</Label>
                  <p className="text-sm text-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Theme</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-warning" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </div>

            {/* Background */}
            <div className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">Custom Background</h2>
              <p className="text-xs text-muted-foreground">Upload an image to use as your app background.</p>

              {bgUrl ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border border-border h-40">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${bgUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                        filter: `blur(${bgBlur * 0.2}px)`,
                      }}
                    />
                    <button
                      onClick={handleRemoveBg}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Blur</Label>
                      <span className="text-xs text-muted-foreground">{bgBlur}%</span>
                    </div>
                    <Slider value={[bgBlur]} onValueChange={handleBlurChange} min={0} max={100} step={1} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Horizontal Position</Label>
                      <span className="text-xs text-muted-foreground">{bgPosX}%</span>
                    </div>
                    <Slider value={[bgPosX]} onValueChange={handlePosXChange} min={0} max={100} step={1} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Vertical Position</Label>
                      <span className="text-xs text-muted-foreground">{bgPosY}%</span>
                    </div>
                    <Slider value={[bgPosY]} onValueChange={handlePosYChange} min={0} max={100} step={1} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => bgInputRef.current?.click()} className="gap-2">
                    <Upload className="h-3.5 w-3.5" /> Change Image
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => bgInputRef.current?.click()} disabled={bgUploading} className="gap-2">
                  {bgUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Background Image
                </Button>
              )}
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">Notification Preferences</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Announcements</p>
                  <p className="text-xs text-muted-foreground">Get notified about new class announcements</p>
                </div>
                <Switch checked={notifAnnouncements} onCheckedChange={setNotifAnnouncements} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Reminders</p>
                  <p className="text-xs text-muted-foreground">Check-in and timetable reminders</p>
                </div>
                <Switch checked={notifReminders} onCheckedChange={setNotifReminders} />
              </div>
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Change Password</h2>
              <p className="text-xs text-muted-foreground mb-4">
                You'll need to verify your current password before making changes.
              </p>
              <Button onClick={() => setPasswordDialogOpen(true)} className="gap-2">
                <Shield className="h-4 w-4" /> Change Password
              </Button>
            </div>
            <Separator />
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Danger Zone</h2>
              <p className="text-xs text-muted-foreground mb-4">These actions are irreversible.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { signOut(); navigate("/auth"); }}>
                  Sign Out
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </div>
            <PasswordChangeDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
          </TabsContent>
        </Tabs>

        {/* About */}
        <div className="mt-8 card-elevated p-4 flex items-center gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">Keen — Your classroom companion. Version 1.0</p>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
