import { useState, useEffect, useRef } from "react";
import { getCustomBackground } from "@/pages/SettingsPage";

const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => {
  const [bg, setBg] = useState(getCustomBackground);
  const bgRef = useRef(bg);

  useEffect(() => {
    const handler = () => {
      const newBg = getCustomBackground();
      // Only update state if values actually changed
      if (
        newBg.url !== bgRef.current.url ||
        newBg.blur !== bgRef.current.blur ||
        newBg.posX !== bgRef.current.posX ||
        newBg.posY !== bgRef.current.posY
      ) {
        bgRef.current = newBg;
        setBg(newBg);
      }
    };
    window.addEventListener("storage", handler);
    window.addEventListener("bg-updated", handler);
    const interval = setInterval(handler, 2000);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("bg-updated", handler);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {bg.url && (
        <>
          <div
            className="fixed inset-0 z-0 bg-no-repeat"
            style={{
              backgroundImage: `url(${bg.url})`,
              backgroundSize: "cover",
              backgroundPosition: `${bg.posX}% ${bg.posY}%`,
              filter: `blur(${bg.blur * 0.2}px)`,
            }}
          />
          <div className="fixed inset-0 z-0 bg-background/60" />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default BackgroundWrapper;
