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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const attemptedTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "late" | "expired" | "already" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");
  const [classSlug, setClassSlug] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const goBackToAttendance = () => {
    if (classSlug) navigate(`/class/${encodeURIComponent(classSlug)}?tab=Attendance`);
    else navigate("/");
  };

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

    const applyAttendanceStatus = (s: string) => {
      if (s === "late") setStatus("late");
      else if (s === "absent") setStatus("expired");
      else setStatus("success");
    };

    const signIn = async () => {
      setStatus("loading");
      setMessage("");

      if (!user) {
        await wait(600);
        if (!cancelled) setStatus("auth");
        return;
      }

      // Resolve assembly id (with retry forever until cancelled). Run in parallel with RPC.
      let assemblyId: string | null = null;
      const resolveAssemblyId = async (): Promise<string | null> => {
        let attempt = 0;
        while (!cancelled && !assemblyId) {
          // Try direct table read first (fast, RLS-allowed for members).
          try {
            const { data } = await withTimeout(
              supabase.from("assemblies").select("id, class_slug").eq("qr_token", normalizedToken).maybeSingle(),
              4000,
            );
            if (data?.id) {
              assemblyId = data.id;
              if (data.class_slug && !cancelled) setClassSlug(data.class_slug);
              return assemblyId;
            }
          } catch { /* try RPC fallback */ }
          try {
            const { data } = await withTimeout(
              supabase.rpc("lookup_assembly_by_token" as any, { _qr_token: normalizedToken }),
              4000,
            );
            const row = Array.isArray(data) ? data[0] : data;
            if (row?.id) {
              assemblyId = row.id;
              if (row.class_slug && !cancelled) setClassSlug(row.class_slug);
              return assemblyId;
            }
          } catch { /* keep retrying */ }
          attempt += 1;
          await wait(Math.min(600 + attempt * 200, 2000));
        }
        return assemblyId;
      };
      void resolveAssemblyId();

      // Poll the attendance row directly. On phones the RPC sometimes never
      // resolves even though the DB write went through, so this catches success fast.
      // Keep polling indefinitely until cancelled — the user may have already been
      // signed in from another device, so we just need to detect the row when it appears.
      const pollAttendance = async (): Promise<{ status: string } | null> => {
        while (!cancelled) {
          if (!assemblyId) { await wait(400); continue; }
          try {
            const { data } = await withTimeout(
              supabase
                .from("assembly_attendance")
                .select("status")
                .eq("assembly_id", assemblyId)
                .eq("user_id", user.id)
                .maybeSingle(),
              4000,
            );
            if (data?.status) return { status: data.status };
          } catch {
            // ignore — keep polling
          }
          await wait(800);
        }
        return null;
      };

      const callRpc = async (): Promise<{ result?: string; attendance_status?: string } | null> => {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          if (cancelled) return null;
          try {
            const { data: rows, error } = await withTimeout(
              supabase.rpc("sign_in_assembly_by_token" as any, { _qr_token: normalizedToken }),
              5000,
            );
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (!error && row) return row as any;
          } catch {
            // timeout — try again
          }
          await wait(400 + attempt * 300);
        }
        return null;
      };

      type RpcWin = { kind: "rpc"; value: { result?: string; attendance_status?: string } | null };
      type PollWin = { kind: "poll"; value: { status: string } | null };

      const rpcPromise: Promise<RpcWin> = callRpc().then((value) => ({ kind: "rpc", value }));
      const pollPromise: Promise<PollWin> = pollAttendance().then((value) => ({ kind: "poll", value }));

      const winner = await Promise.race<RpcWin | PollWin>([rpcPromise, pollPromise]);
      if (cancelled) return;

      if (winner.kind === "poll" && winner.value?.status) {
        applyAttendanceStatus(winner.value.status);
        return;
      }

      if (winner.kind === "rpc" && winner.value) {
        const r = winner.value;
        if (r.result === "signed_in") { setStatus(r.attendance_status === "late" ? "late" : "success"); return; }
        if (r.result === "already") { setStatus("already"); return; }
        if (r.result === "expired") { setStatus("expired"); return; }
        if (r.result === "auth_required") { setStatus("auth"); return; }
        if (r.result === "not_member") {
          setStatus("error");
          setMessage("This QR belongs to a class you have not joined yet.");
          return;
        }
        if (r.result === "not_found") {
          setStatus("error");
          setMessage("This QR code is not valid anymore. Ask the teacher to show the latest QR.");
          return;
        }
      }

      // First finisher returned nothing useful — wait on the other one.
      const other = winner.kind === "rpc" ? await pollPromise : await rpcPromise;
      if (cancelled) return;

      if (other.kind === "poll" && other.value?.status) {
        applyAttendanceStatus(other.value.status);
        return;
      }
      if (other.kind === "rpc" && other.value) {
        const r = other.value;
        if (r.result === "signed_in") { setStatus(r.attendance_status === "late" ? "late" : "success"); return; }
        if (r.result === "already") { setStatus("already"); return; }
        if (r.result === "expired") { setStatus("expired"); return; }
      }

      setStatus("error");
      setMessage("The QR sign-in took too long to confirm. Tap Retry or scan the QR again.");
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
