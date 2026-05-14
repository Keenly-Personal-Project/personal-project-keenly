import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, XCircle, Loader2, Clock, RotateCcw, ArrowLeft } from "lucide-react";
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
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const attemptedTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "late" | "expired" | "already" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");
  const [classSlug, setClassSlug] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setAuthTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthTimedOut(true), 5000);
    return () => window.clearTimeout(timer);
  }, [authLoading]);

  const goBackToAttendance = () => {
    if (classSlug) navigate(`/class/${encodeURIComponent(classSlug)}?tab=Attendance`);
    else navigate("/");
  };

  useEffect(() => {
    if (authLoading && !authTimedOut) return;

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

      // Always verify session directly with Supabase — the AuthContext can be
      // slow to propagate (especially in mobile in-app browsers), so don't
      // trust !user alone before bailing to the "Sign In Required" screen.
      if (!user || !session) {
        try {
          const { data } = await withTimeout(supabase.auth.getSession(), 3000);
          if (!data.session) {
            if (!cancelled) setStatus("auth");
            return;
          }
        } catch {
          if (!cancelled) setStatus("auth");
          return;
        }
      }

      const isAuthError = (error: any) => {
        const text = `${error?.message ?? ""} ${error?.code ?? ""} ${error?.status ?? ""}`.toLowerCase();
        return error?.status === 401 || error?.status === 403 || /jwt|token|session|auth|unauthorized|forbidden|permission/.test(text);
      };

      const callRpc = async (): Promise<{
        row?: { result?: string; attendance_status?: string; class_slug?: string | null };
        authError?: boolean;
        errorMessage?: string;
      } | null> => {
        let lastError = "";
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (cancelled) return null;
          try {
            const { data: rows, error } = await withTimeout(
              supabase.rpc("sign_in_assembly_by_token" as any, { _qr_token: normalizedToken }),
              5000,
            );
            if (error) {
              if (isAuthError(error)) return { authError: true };
              lastError = error.message || "Sign-in request failed.";
            }
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (!error && row) return { row: row as any };
          } catch (error: any) {
            lastError = error?.message === "timeout" ? "The mobile connection timed out." : (error?.message || "Sign-in request failed.");
          }
          await wait(500 + attempt * 400);
        }
        return { errorMessage: lastError };
      };

      const result = await callRpc();
      if (cancelled) return;

      if (result?.authError) {
        setStatus("auth");
        return;
      }

      const r = result?.row;

      if (r?.class_slug) setClassSlug(r.class_slug);
      if (r?.result === "signed_in") { setStatus(r.attendance_status === "late" ? "late" : "success"); return; }
      if (r?.result === "already") { setStatus("already"); return; }
      if (r?.result === "expired") { setStatus("expired"); return; }
      if (r?.result === "auth_required") { setStatus("auth"); return; }
      if (r?.result === "not_member") {
        setStatus("error");
        setMessage("This QR belongs to a class you have not joined yet.");
        return;
      }
      if (r?.result === "not_found") {
        setStatus("error");
        setMessage("This QR code is not valid anymore. Ask the teacher to show the latest QR.");
        return;
      }

      setStatus("error");
      setMessage(result?.errorMessage ? `${result.errorMessage} Tap Retry or log in again.` : "The QR sign-in took too long to confirm. Tap Retry or scan the QR again.");
    };

    void signIn();

    return () => {
      cancelled = true;
    };
  }, [token, user, session, authLoading, authTimedOut, retryNonce]);

  if ((authLoading && !authTimedOut) || status === "loading") {
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

  const BackButton = () => (
    <Button variant="outline" onClick={goBackToAttendance} className="gap-2">
      <ArrowLeft className="h-4 w-4" />
      Back to Attendance
    </Button>
  );

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">QR Code Expired</h1>
          <p className="text-muted-foreground">The sign-in window for this assembly has closed. You have been marked as absent.</p>
          <BackButton />
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
          <div className="flex flex-col items-center gap-2">
            <Button onClick={() => setRetryNonce((value) => value + 1)} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
            <BackButton />
          </div>
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
          <BackButton />
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
        <BackButton />
      </div>
    </div>
  );
}
