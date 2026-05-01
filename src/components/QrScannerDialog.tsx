import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2 } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export default function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStarting(true);
    let cancelled = false;

    const start = async () => {
      try {
        // Wait one tick for DOM
        await new Promise((r) => setTimeout(r, 50));
        if (cancelled) return;
        const html5 = new Html5Qrcode(containerId, /* verbose= */ false);
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            onScan(decodedText);
            stop();
          },
          () => {}
        );
        if (!cancelled) setStarting(false);
      } catch (e) {
        console.error(e);
        setError("Couldn't access the camera. Check browser permissions.");
        setStarting(false);
      }
    };

    const stop = async () => {
      try {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
          await scannerRef.current.clear();
          scannerRef.current = null;
        }
      } catch {}
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onScan]);

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
