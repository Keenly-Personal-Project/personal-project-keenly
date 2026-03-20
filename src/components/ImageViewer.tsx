import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

const ImageViewer = ({ src, alt = "", className, imgClassName }: ImageViewerProps) => {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={imgClassName || "max-w-full h-auto object-contain mx-auto cursor-pointer hover:opacity-90 transition-opacity"}
        onClick={() => { setOpen(true); setZoomed(false); }}
      />
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setZoomed(false); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 overflow-auto">
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={src}
              alt={alt}
              className="max-w-none transition-transform"
              style={{
                objectFit: "contain",
                maxHeight: zoomed ? "none" : "90vh",
                maxWidth: zoomed ? "none" : "90vw",
                transform: zoomed ? "scale(2)" : "scale(1)",
                cursor: zoomed ? "zoom-out" : "zoom-in",
              }}
              onClick={() => setZoomed((z) => !z)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageViewer;
