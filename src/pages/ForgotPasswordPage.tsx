import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, KeyRound, Check, RefreshCw } from "lucide-react";

type Step = "email" | "code" | "password";

const ForgotPasswordPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(user?.email || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const sendCode = async (isResend = false) => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (isResend) setResending(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-reset-code", {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) {
        toast.error("Failed to send verification code. Please try again.");
      } else {
        toast.success(isResend ? "New code sent to your email!" : "Verification code sent to your email!");
        setStep("code");
        setCode("");
        setCooldown(30);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setResending(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length < 6) {
      toast.error("Please enter the full 6-character code.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-reset-code", {
        body: { email: email.trim().toLowerCase(), code: code.trim().toUpperCase() },
      });

      if (error || data?.error) {
        toast.error("Invalid code");
        setLoading(false);
        return;
      }

      if (data?.valid) {
        toast.success("Code verified! Set your new password.");
        setStep("password");
      } else {
        toast.error("Invalid code");
      }
    } catch {
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
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
      const { data, error } = await supabase.functions.invoke("verify-reset-code", {
        body: {
          email: email.trim().toLowerCase(),
          code: code.trim().toUpperCase(),
          newPassword,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Failed to update password.");
      } else if (data?.passwordUpdated) {
        toast.success("Password updated successfully! Please log in with your new password.");
        navigate("/auth");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-6 px-4 max-w-md mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="card-elevated p-6 space-y-6">
          <div className="text-center">
            <KeyRound className="h-10 w-10 mx-auto text-primary mb-3" />
            <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "email" && "We'll send a verification code to your email."}
              {step === "code" && "Enter the hexadecimal code sent to your email."}
              {step === "password" && "Set your new password."}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            {(["email", "code", "password"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : ["email", "code", "password"].indexOf(step) > i
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {["email", "code", "password"].indexOf(step) > i ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && <div className="w-8 h-0.5 bg-border" />}
              </div>
            ))}
          </div>

          {/* Step 1: Email */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={() => sendCode(false)}
                disabled={!email || loading}
                className="w-full gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Verification Code
              </Button>
            </div>
          )}

          {/* Step 2: Code verification */}
          {step === "code" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Insert Code</Label>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-character hexadecimal code sent to <span className="font-medium text-foreground">{email}</span>
                </p>
                <Input
                  type="text"
                  placeholder="e.g., A4F2B1"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/gi, "").slice(0, 6))}
                  disabled={loading}
                  className="text-center text-lg font-mono tracking-[0.3em] uppercase"
                  maxLength={6}
                />
              </div>
              <Button
                onClick={verifyCode}
                disabled={code.length < 6 || loading}
                className="w-full gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify Code
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  Change email
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendCode(true)}
                  disabled={resending || cooldown > 0}
                  className="gap-1 text-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                  {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend code"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: New password */}
          {step === "password" && (
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
                  onKeyDown={(e) => e.key === "Enter" && updatePassword()}
                />
              </div>
              <Button
                onClick={updatePassword}
                disabled={!newPassword || !confirmPassword || loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Update Password
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
