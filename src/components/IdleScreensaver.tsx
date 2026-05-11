import { useEffect, useState, useRef } from "react";
import logo from "@/assets/keen-logo-mark.png";

interface Props {
  idleMs?: number;
}

const IdleScreensaver = ({ idleMs = 20000 }: Props) => {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const reset = () => {
      if (active) setActive(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setActive(true), idleMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active, idleMs]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-primary overflow-hidden animate-fade-in"
      aria-hidden="true"
    >
      <div className="absolute inset-0 keen-screensaver-track">
        <img
          src={logo}
          alt=""
          className="w-40 h-40 md:w-56 md:h-56 select-none pointer-events-none"
          draggable={false}
        />
      </div>
      <style>{`
        @keyframes keen-bounce-x {
          0% { left: 0; }
          100% { left: calc(100% - 14rem); }
        }
        @keyframes keen-bounce-y {
          0% { top: 0; }
          100% { top: calc(100% - 14rem); }
        }
        .keen-screensaver-track {
          position: absolute;
          width: max-content;
          height: max-content;
          animation:
            keen-bounce-x 7s linear infinite alternate,
            keen-bounce-y 5s linear infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default IdleScreensaver;
