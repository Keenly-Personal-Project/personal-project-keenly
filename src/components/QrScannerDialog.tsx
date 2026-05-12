import { useCallback, useEffect, useId, useRef, useState } from "react";
import jsQR from "jsqr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, ImageUp, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startRunRef = useRef(0);
  const decodedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manual, setManual] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDecoded = useCallback(
    (decodedText: string) => {
      if (decodedRef.current) return;
      decodedRef.current = true;
      stopCamera();
      setCameraActive(false);

      try {
        onScanRef.current?.(decodedText);
      } catch (cbErr) {
        console.error("onScan handler threw", cbErr);
      }
    },
    [stopCamera],
  );

  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (!video || !canvas || !context || decodedRef.current) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });

      if (qr?.data) {
        handleDecoded(qr.data);
        return;
      }
    }

    animationRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleDecoded]);

  const getCameraStream = async () => {
    const cameraAttempts: MediaStreamConstraints[] = [
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { audio: false, video: { facingMode: "environment" } },
      { audio: false, video: { facingMode: "user" } },
      { audio: false, video: true },
    ];

    let lastError: unknown = null;

    for (const constraints of cameraAttempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
        console.warn("Camera getUserMedia attempt failed", err);
      }
    }

    throw lastError ?? new Error("camera-start-failed");
  };

  const startCamera = useCallback(async () => {
    const runId = startRunRef.current + 1;
    startRunRef.current = runId;
    decodedRef.current = false;
    setError(null);
    setStarting(true);
    setCameraActive(false);
    stopCamera();

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (runId !== startRunRef.current) return;

      if (!document.getElementById(containerId)) throw new Error("scanner-area-not-ready");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("camera-api-not-supported");

      const stream = await getCameraStream();
      if (runId !== startRunRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) throw new Error("scanner-video-not-ready");

      streamRef.current = stream;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();

      if (runId !== startRunRef.current) return;

      setCameraActive(true);
      setStarting(false);
      animationRef.current = requestAnimationFrame(scanVideoFrame);
    } catch (camErr) {
      console.error("Camera start failed", camErr);
      if (runId === startRunRef.current) {
        stopCamera();
        setError(getCameraErrorMessage(camErr));
        setCameraActive(false);
        setStarting(false);
      }
    }
  }, [containerId, scanVideoFrame, stopCamera]);

  useEffect(() => {
    if (!open) {
      startRunRef.current += 1;
      decodedRef.current = false;
      setCameraActive(false);
      setStarting(false);
      stopCamera();
      return;
    }

    setError(null);
    setManual("");
    setCameraActive(false);
    setStarting(false);
    decodedRef.current = false;

    const startTimer = window.setTimeout(() => {
      void startCamera();
    }, 120);

    return () => {
      window.clearTimeout(startTimer);
      startRunRef.current += 1;
      decodedRef.current = false;
      setCameraActive(false);
      setStarting(false);
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const submitManual = () => {
    const text = manual.trim();
    if (!text) return;
    handleDecoded(text);
  };

  const scanUploadedImage = async (file: File) => {
    setError(null);
    setStarting(true);
    decodedRef.current = false;
    stopCamera();
    setCameraActive(false);

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas-unavailable");

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });

      if (!qr?.data) throw new Error("no-qr-found");
      handleDecoded(qr.data);
    } catch (scanErr) {
      console.error("QR image scan failed", scanErr);
      setError("Couldn't read a QR code from that image. Try another image or paste the code below.");
    } finally {
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
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="hidden" />

            {cameraActive && (
              <div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-primary shadow-[0_0_0_999px_hsl(var(--background)/0.35)]" />
            )}

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
