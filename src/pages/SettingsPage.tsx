import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, User, Palette, Bell, Shield, Info, Loader2, Check, Moon, Sun,
} from "lucide-react";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SettingsPage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Theme
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  // Notifications
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

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

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    // For safety, just sign out and notify
    toast.info("Please contact support to delete your account.");
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Header />
      <main className="container py-6 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
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
              <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
              <div className="space-y-3 max-w-sm">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-2">
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Update Password
                </Button>
              </div>
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
