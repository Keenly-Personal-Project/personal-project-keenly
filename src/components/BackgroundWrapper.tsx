import { useState, useEffect } from "react";
import { getCustomBackground } from "@/pages/SettingsPage";

const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => {
  const [bg, setBg] = useState(getCustomBackground);

  useEffect(() => {
    const handler = () => setBg(getCustomBackground());
    window.addEventListener("storage", handler);
    // Also poll for same-tab changes
    const interval = setInterval(handler, 1000);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, []);

  if (!bg.url) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${bg.url})`,
          filter: `blur(${bg.blur * 0.2}px)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default BackgroundWrapper;
