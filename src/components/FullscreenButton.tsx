import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggle}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className="fixed bottom-4 left-4 z-[60] h-10 w-10 rounded-full shadow-lg bg-card/80 backdrop-blur-sm border border-border hover:bg-accent"
    >
      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </Button>
  );
};

export default FullscreenButton;
