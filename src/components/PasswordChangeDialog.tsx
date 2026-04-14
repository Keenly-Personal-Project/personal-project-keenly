import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ArrowLeft, KeyRound } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PasswordChangeDialog({ open, onOpenChange }: PasswordChangeDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"verify" | "change">("verify");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setStep("verify");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const handleVerifyPassword = async () => {
    if (!currentPassword || !user?.email) return;
    setLoading(true);

    try {
      // Verify current password by attempting sign-in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (error) {
        toast.error("Invalid password");
        setLoading(false);
        return;
      }

      // Password is correct, proceed to change step
      setStep("change");
    } catch {
      toast.error("Failed to verify password");
    } finally {
      setLoading(false);
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
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        handleClose(false);
      }
    } catch {
      toast.error("Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    handleClose(false);
    navigate("/forgot-password");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {step === "verify" ? "Verify Your Identity" : "Set New Password"}
          </DialogTitle>
          <DialogDescription>
            {step === "verify"
              ? "Enter your current password to continue."
              : "Choose a strong new password for your account."}
          </DialogDescription>
        </DialogHeader>

        {step === "verify" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleVerifyPassword}
                disabled={!currentPassword || loading}
                className="w-full gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Continue
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline font-medium text-center"
                disabled={loading}
              >
                Forgot password?
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword || loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Update Password
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setStep("verify"); setNewPassword(""); setConfirmPassword(""); }}
                className="w-full gap-2"
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
