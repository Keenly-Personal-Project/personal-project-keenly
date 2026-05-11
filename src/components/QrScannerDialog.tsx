import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export default function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<any>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [manual, setManual] = useState("");

  // Keep latest callback without re-running the effect
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStarting(true);
    let cancelled = false;
    let scanner: any = null;

    const stop = async () => {
      try {
        if (scanner) {
          if (scanner.isScanning) await scanner.stop().catch(() => {});
          await scanner.clear().catch(() => {});
        }
      } catch {
        // swallow — never let cleanup crash the app
      } finally {
        scannerRef.current = null;
      }
    };

    const start = async () => {
      try {
        // Wait for dialog DOM to mount
        await new Promise((r) => setTimeout(r, 150));
        if (cancelled) return;

        const el = document.getElementById(containerId);
        if (!el) {
          if (!cancelled) {
            setError("Scanner area not ready. Please try again.");
            setStarting(false);
          }
          return;
        }

        // Dynamic import so a load failure doesn't crash the page
        const mod = await import("html5-qrcode").catch((e) => {
          console.error("Failed to load QR scanner library", e);
          return null;
        });
        if (!mod || cancelled) {
          if (!cancelled) {
            setError("Couldn't load the scanner. Please type the code manually below.");
            setStarting(false);
          }
          return;
        }

        try {
          scanner = new mod.Html5Qrcode(containerId, false);
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decodedText: string) => {
              try {
                onScanRef.current?.(decodedText);
              } catch (cbErr) {
                console.error("onScan handler threw", cbErr);
              }
              stop();
            },
            () => {}
          );
          if (!cancelled) setStarting(false);
        } catch (camErr) {
          console.error("Camera start failed", camErr);
          if (!cancelled) {
            setError("Couldn't access the camera. Check browser permissions or type the code below.");
            setStarting(false);
          }
        }
      } catch (e) {
        console.error("QR scanner unexpected error", e);
        if (!cancelled) {
          setError("Something went wrong starting the scanner.");
          setStarting(false);
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  const submitManual = () => {
    const text = manual.trim();
    if (!text) return;
    try {
      onScanRef.current?.(text);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Assembly QR</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div id={containerId} className="rounded-lg overflow-hidden bg-black aspect-square w-full relative">
            {starting && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground text-center">Point your camera at the assembly QR code.</p>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Or paste the link/token manually:</p>
            <div className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Paste QR link or token"
                onKeyDown={(e) => e.key === "Enter" && submitManual()}
              />
              <Button size="sm" onClick={submitManual} disabled={!manual.trim()}>
                Go
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
