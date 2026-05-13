import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, XCircle, Loader2, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number) => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("timeout")), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
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

      let signInResult: any = null;
      let signInError: unknown = null;

      // Look up the assembly once up-front so we can poll attendance as a fallback.
      let assemblyId: string | null = null;
      try {
        const { data: assembly } = await withTimeout(
          supabase.rpc("lookup_assembly_by_token" as any, { _qr_token: normalizedToken }),
          5000,
        );
        const assemblyRow = Array.isArray(assembly) ? assembly[0] : assembly;
        assemblyId = assemblyRow?.id ?? null;
      } catch {
        // ignore — we'll still try the RPC
      }
      if (cancelled) return;

      const checkExistingAttendance = async () => {
        if (!assemblyId) return null;
        try {
          const { data: existing } = await withTimeout(
            supabase
              .from("assembly_attendance")
              .select("status")
              .eq("assembly_id", assemblyId)
              .eq("user_id", user.id)
              .maybeSingle(),
            4000,
          );
          return existing?.status ?? null;
        } catch {
          return null;
        }
      };

      // If already signed in (e.g. a previous attempt succeeded), short-circuit immediately.
      const preexisting = await checkExistingAttendance();
      if (cancelled) return;
      if (preexisting) {
        if (preexisting === "late") setStatus("late");
        else if (preexisting === "absent") setStatus("expired");
        else setStatus("success");
        return;
      }

      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const { data: rows, error } = await withTimeout(supabase.rpc("sign_in_assembly_by_token" as any, {
            _qr_token: normalizedToken,
          }), 6000);

          signInResult = Array.isArray(rows) ? rows[0] : rows;
          signInError = error;

          if (!error && signInResult) break;
        } catch (error) {
          signInError = error;
        }

        if (cancelled) return;

        // Between RPC retries, check if the row actually got written despite the client-side error/timeout.
        const status = await checkExistingAttendance();
        if (cancelled) return;
        if (status) {
          if (status === "late") setStatus("late");
          else if (status === "absent") setStatus("expired");
          else setStatus("success");
          return;
        }

        await wait(400 + attempt * 300);
        if (cancelled) return;
      }

      if (cancelled) return;

      // Final fallback: even if every RPC attempt hung, check attendance one last time.
      if (signInError || !signInResult) {
        const status = await checkExistingAttendance();
        if (status) {
          if (status === "late") setStatus("late");
          else if (status === "absent") setStatus("expired");
          else setStatus("success");
          return;
        }

        setStatus("error");
        setMessage("The QR sign-in took too long to confirm. Tap Retry or scan the QR again.");
        return;
      }

      if (signInResult.result === "signed_in") {
        setStatus(signInResult.attendance_status === "late" ? "late" : "success");
        return;
      }

      if (signInResult.result === "already") {
        setStatus("already");
        return;
      }

      if (signInResult.result === "expired") {
        setStatus("expired");
        return;
      }

      if (signInResult.result === "auth_required") {
        setStatus("auth");
        return;
      }

      if (signInResult.result === "not_member") {
        setStatus("error");
        setMessage("This QR belongs to a class you have not joined yet.");
        return;
      }

      if (signInResult.result === "not_found") {
        setStatus("error");
        setMessage("This QR code is not valid anymore. Ask the teacher to show the latest QR.");
        return;
      }

      setStatus("error");
      setMessage("This QR could not be confirmed. Tap Retry or scan the QR again.");
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
