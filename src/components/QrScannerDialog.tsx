import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, ImageUp, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

type ScannerModule = typeof import("html5-qrcode");

function getCameraErrorMessage(error: unknown) {
  const details = [
    typeof error === "object" && error && "name" in error ? String((error as { name?: unknown }).name ?? "") : "",
    typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message ?? "") : "",
    String(error ?? ""),
  ].join(" ");

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return "Camera access needs a secure HTTPS page. Open the published site directly, or paste the code below.";
  }

  if (/notallowed|permission|denied|not authorized/i.test(details)) {
    return "Camera permission was blocked. Allow camera access for this site in your browser, then tap Open Camera again.";
  }

  if (/notfound|devicesnotfound|no camera|requested device not found/i.test(details)) {
    return "No usable camera was found on this device. You can upload a QR image or paste the code below.";
  }

  if (/notreadable|trackstart|could not start video source|in use|busy/i.test(details)) {
    return "The camera is already being used by another app. Close it, then tap Open Camera again.";
  }

  if (/overconstrained|constraint|facingmode|deviceid/i.test(details)) {
    return "This camera mode is not available on this device. Tap Open Camera again or upload a QR image.";
  }

  if (/not supported|unsupported|secure context|https/i.test(details)) {
    return "This browser cannot open the camera here. Try the published site directly, upload a QR image, or paste the code below.";
  }

  return "Couldn't access the camera. Tap Open Camera again, upload a QR image, or paste the code below.";
}

export default function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const reactId = useId();
  const containerId = `qr-scanner-region-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const scannerRef = useRef<any>(null);
  const scannerModuleRef = useRef<ScannerModule | null>(null);
  const onScanRef = useRef(onScan);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startRunRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manual, setManual] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const loadScannerModule = useCallback(async () => {
    if (scannerModuleRef.current) return scannerModuleRef.current;

    const mod = await import("html5-qrcode").catch((e) => {
      console.error("Failed to load QR scanner library", e);
      return null;
    });

    if (!mod) throw new Error("scanner-library-load-failed");
    scannerModuleRef.current = mod;
    return mod;
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) return;

    try {
      if (scanner.isScanning) await scanner.stop();
    } catch (e) {
      console.warn("QR scanner stop failed", e);
    }

    try {
      scanner.clear();
    } catch (e) {
      console.warn("QR scanner clear failed", e);
    }
  }, []);

  const handleDecoded = useCallback(
    (decodedText: string) => {
      try {
        onScanRef.current?.(decodedText);
      } catch (cbErr) {
        console.error("onScan handler threw", cbErr);
      }
      void stopScanner();
      setCameraActive(false);
    },
    [stopScanner],
  );

  const startCamera = useCallback(async () => {
    const runId = startRunRef.current + 1;
    startRunRef.current = runId;
    setError(null);
    setStarting(true);
    setCameraActive(false);

    try {
      await stopScanner();

      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (runId !== startRunRef.current) return;

      const el = document.getElementById(containerId);
      if (!el) throw new Error("scanner-area-not-ready");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("camera-api-not-supported");
      }

      const mod = await loadScannerModule();
      const scanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const smallestSide = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(120, Math.min(280, Math.floor(smallestSide * 0.72)));
          return { width: edge, height: edge };
        },
        disableFlip: false,
      };

      const cameraChoices: Array<string | MediaTrackConstraints> = [];

      try {
        const cameras = await mod.Html5Qrcode.getCameras();
        const usableCameras = cameras.filter((camera) => camera.id);
        const backCamera = usableCameras.find((camera) => /back|rear|environment/i.test(camera.label || ""));
        const frontCamera = usableCameras.find((camera) => /front|user|face/i.test(camera.label || ""));

        if (backCamera) cameraChoices.push(backCamera.id);
        if (frontCamera && frontCamera.id !== backCamera?.id) cameraChoices.push(frontCamera.id);
        usableCameras.forEach((camera) => {
          if (!cameraChoices.includes(camera.id)) cameraChoices.push(camera.id);
        });
      } catch (enumErr) {
        console.warn("Camera enumeration failed, falling back to browser camera selection", enumErr);
      }

      cameraChoices.push({ facingMode: "environment" }, { facingMode: "user" });

      let lastError: unknown = null;

      for (const choice of cameraChoices) {
        if (runId !== startRunRef.current) return;

        try {
          await stopScanner();
          const scanner = new mod.Html5Qrcode(containerId, {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
          });
          scannerRef.current = scanner;
          await scanner.start(choice, scanConfig, handleDecoded, () => {});

          if (runId !== startRunRef.current) {
            await stopScanner();
            return;
          }

          setCameraActive(true);
          setStarting(false);
          return;
        } catch (startErr) {
          lastError = startErr;
          console.warn("Camera start attempt failed", startErr);
          await stopScanner();
        }
      }

      throw lastError ?? new Error("camera-start-failed");
    } catch (camErr) {
      console.error("Camera start failed", camErr);
      if (runId === startRunRef.current) {
        setError(getCameraErrorMessage(camErr));
        setCameraActive(false);
        setStarting(false);
      }
    }
  }, [containerId, handleDecoded, loadScannerModule, stopScanner]);

  useEffect(() => {
    if (!open) {
      startRunRef.current += 1;
      setCameraActive(false);
      setStarting(false);
      void stopScanner();
      return;
    }

    setError(null);
    setManual("");
    setCameraActive(false);
    setStarting(false);

    return () => {
      startRunRef.current += 1;
      setCameraActive(false);
      setStarting(false);
      void stopScanner();
    };
  }, [open, stopScanner]);

  const submitManual = () => {
    const text = manual.trim();
    if (!text) return;
    try {
      onScanRef.current?.(text);
    } catch (e) {
      console.error(e);
    }
  };

  const scanUploadedImage = async (file: File) => {
    setError(null);
    setStarting(true);
    setCameraActive(false);

    try {
      const mod = await loadScannerModule();
      await stopScanner();

      const scanner = new mod.Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;
      const decodedText = await scanner.scanFile(file, false);
      handleDecoded(decodedText);
    } catch (scanErr) {
      console.error("QR image scan failed", scanErr);
      setError("Couldn't read a QR code from that image. Try another image or paste the code below.");
    } finally {
      await stopScanner();
      setStarting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Assembly QR</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div id={containerId} className="rounded-lg overflow-hidden bg-foreground aspect-square w-full relative">
            {starting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-foreground backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {!starting && !cameraActive && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/70 p-4 text-center text-muted-foreground">
                <Camera className="h-8 w-8 text-primary" />
                <Button size="sm" onClick={startCamera} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Open Camera
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground text-center">Point your camera at the assembly QR code.</p>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={startCamera} disabled={starting} className="gap-2">
              {cameraActive ? <RotateCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraActive ? "Restart" : "Open Camera"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={starting} className="gap-2">
              <ImageUp className="h-4 w-4" />
              Upload QR
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void scanUploadedImage(file);
            }}
          />

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
