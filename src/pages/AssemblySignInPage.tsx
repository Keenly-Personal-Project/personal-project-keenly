import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, XCircle, Loader2, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const isDuplicateAttendance = (error: unknown) => {
  const details = JSON.stringify(error ?? {}).toLowerCase();
  return details.includes("23505") || details.includes("duplicate") || details.includes("idx_attendance_unique");
};

export default function AssemblySignInPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const attemptedTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "late" | "expired" | "already" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      setStatus("error");
      setMessage("Invalid sign-in link.");
      return;
    }

    const attemptKey = `${normalizedToken}:${user?.id ?? "guest"}:${retryNonce}`;
    if (attemptedTokenRef.current === attemptKey) return;
    attemptedTokenRef.current = attemptKey;

    let cancelled = false;

    const signIn = async () => {
      setStatus("loading");
      setMessage("");

      if (!user) {
        await wait(600);
        if (!cancelled) setStatus("auth");
        return;
      }

      let assembly: any = null;
      let lookupError: unknown = null;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data: rows, error: aErr } = await supabase.rpc("lookup_assembly_by_token" as any, {
          _qr_token: normalizedToken,
        });

        assembly = Array.isArray(rows) ? rows[0] : rows;
        lookupError = aErr;

        if (!aErr && assembly) break;
        await wait(350 + attempt * 250);
        if (cancelled) return;
      }

      if (cancelled) return;

      if (lookupError || !assembly) {
        setStatus("error");
        setMessage("This QR link could not be confirmed. Try scanning again or tap Retry.");
        return;
      }

      const now = new Date();
      const lateTime = new Date(assembly.late_time);
      const absentTime = new Date(assembly.absent_time);

      if (now > absentTime) {
        setStatus("expired");
        return;
      }

      const isLate = now > lateTime;
      const attendanceStatus = isLate ? "late" : "present";

      const { data: existing, error: existingErr } = await (supabase.from as any)("assembly_attendance")
        .select("id, status")
        .eq("assembly_id", assembly.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (existing?.id) {
        if (existing.status === "pending") {
          const { error: updateErr } = await (supabase.from as any)("assembly_attendance")
            .update({ signed_in_at: now.toISOString(), status: attendanceStatus })
            .eq("id", existing.id);

          if (cancelled) return;

          if (!updateErr) {
            setStatus(isLate ? "late" : "success");
            return;
          }
        } else {
          setStatus("already");
          return;
        }
      }

      if (existingErr) {
        console.warn("Attendance lookup failed; trying direct sign-in", existingErr);
      }

      const { error: insertErr } = await (supabase.from as any)("assembly_attendance").insert({
        assembly_id: assembly.id,
        user_id: user.id,
        signed_in_at: now.toISOString(),
        status: attendanceStatus,
      });

      if (cancelled) return;

      if (insertErr) {
        if (isDuplicateAttendance(insertErr)) {
          setStatus("already");
          return;
        }

        setStatus("error");
        setMessage("The QR was valid, but sign-in did not finish. Tap Retry.");
        console.error(insertErr);
        return;
      }

      setStatus(isLate ? "late" : "success");
    };

    void signIn();

    return () => {
      cancelled = true;
    };
  }, [token, user, authLoading, retryNonce]);

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm">Confirming QR sign-in…</p>
        </div>
      </div>
    );
  }

  if (status === "auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Sign In Required</h1>
          <p className="text-muted-foreground">You need to be logged in to sign in for this assembly. After logging in once, future scans will sign you in instantly.</p>
          <Button onClick={() => {
            const redirect = encodeURIComponent(window.location.pathname);
            window.location.href = `/auth?redirect=${redirect}`;
          }}>Go to Login</Button>
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
          <h1 className="text-xl font-bold text-foreground">Try Again</h1>
          <p className="text-muted-foreground">{message}</p>
          <Button onClick={() => setRetryNonce((value) => value + 1)} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
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
