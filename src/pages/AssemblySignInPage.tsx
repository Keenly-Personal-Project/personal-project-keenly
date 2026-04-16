import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssemblySignInPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "late" | "expired" | "already" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("auth");
      return;
    }
    if (!token) {
      setStatus("error");
      setMessage("Invalid sign-in link.");
      return;
    }

    const signIn = async () => {
      // Look up assembly by token using secure RPC
      const { data: rows, error: aErr } = await supabase.rpc("lookup_assembly_by_token" as any, { _qr_token: token });
      const assembly = Array.isArray(rows) ? rows[0] : rows;

      if (aErr || !assembly) {
        setStatus("error");
        setMessage("Assembly not found. The link may be invalid.");
        return;
      }

      const now = new Date();
      const lateTime = new Date(assembly.late_time);
      const absentTime = new Date(assembly.absent_time);

      if (now > absentTime) {
        setStatus("expired");
        return;
      }

      // Check if already signed in
      const { data: existing } = await (supabase.from as any)("assembly_attendance")
        .select("id")
        .eq("assembly_id", assembly.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setStatus("already");
        return;
      }

      const isLate = now > lateTime;
      const attendanceStatus = isLate ? "late" : "present";

      const { error: insertErr } = await (supabase.from as any)("assembly_attendance").insert({
        assembly_id: assembly.id,
        user_id: user.id,
        signed_in_at: now.toISOString(),
        status: attendanceStatus,
      });

      if (insertErr) {
        setStatus("error");
        setMessage("Failed to sign in. Please try again.");
        console.error(insertErr);
        return;
      }

      setStatus(isLate ? "late" : "success");
    };

    signIn();
  }, [token, user, authLoading]);

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Sign In Required</h1>
          <p className="text-muted-foreground">You need to be logged in to sign in for this assembly.</p>
          <Button onClick={() => window.location.href = "/auth"}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">QR Code Expired</h1>
          <p className="text-muted-foreground">The sign-in window for this assembly has closed. You have been marked as absent.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: "hsl(142, 71%, 45%)" }} />
          <h1 className="text-xl font-bold text-foreground">Already Signed In</h1>
          <p className="text-muted-foreground">You have already signed in for this assembly.</p>
        </div>
      </div>
    );
  }

  // Success or Late
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-sm space-y-4">
        {status === "success" ? (
          <CheckCircle2 className="h-20 w-20 mx-auto" style={{ color: "hsl(142, 71%, 45%)" }} />
        ) : (
          <Clock className="h-20 w-20 mx-auto" style={{ color: "hsl(48, 96%, 53%)" }} />
        )}
        <h1 className="text-2xl font-bold text-foreground">
          Thank you for signing in for today!
        </h1>
        {status === "late" && (
          <p className="text-sm font-medium" style={{ color: "hsl(48, 96%, 53%)" }}>
            You signed in after the deadline — marked as Late.
          </p>
        )}
        <div className="pt-4">
          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Your attendance has been recorded.</p>
        </div>
      </div>
    </div>
  );
}
