import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, X, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: supabaseAnonKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.valid) setStatus("valid");
        else if (data?.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error || (!data?.success && data?.reason !== "already_unsubscribed")) {
        setStatus("error");
      } else {
        setStatus("done");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading…</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-xl font-bold">Unsubscribe from Keenly emails?</h1>
              <p className="text-sm text-muted-foreground">
                You will stop receiving non-essential emails from Keenly.
              </p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === "done" && (
            <>
              <Check className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-xl font-bold">You've been unsubscribed</h1>
              <p className="text-sm text-muted-foreground">You will no longer receive these emails.</p>
            </>
          )}
          {status === "already" && (
            <>
              <Check className="h-10 w-10 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-bold">Already unsubscribed</h1>
              <p className="text-sm text-muted-foreground">This email has already been unsubscribed.</p>
            </>
          )}
          {(status === "invalid" || status === "error") && (
            <>
              <X className="h-10 w-10 text-destructive mx-auto" />
              <h1 className="text-xl font-bold">Invalid link</h1>
              <p className="text-sm text-muted-foreground">
                This unsubscribe link is invalid or expired.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
