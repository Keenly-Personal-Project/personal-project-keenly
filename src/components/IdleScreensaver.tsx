import { useEffect, useState, useRef } from "react";
import logo from "@/assets/keen-logo-mark.png";

interface Props {
  idleMs?: number;
}

const IdleScreensaver = ({ idleMs = 20000 }: Props) => {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setActive(true);
      }, idleMs);
    };

    const onActivity = () => {
      if (activeRef.current) setActive(false);
      startTimer();
    };

    const onVisibility = () => {
      // Treat tab becoming hidden as inactivity — keep timer running so the
      // screensaver appears after idleMs even when the user is on another tab.
      startTimer();
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "click",
    ];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true } as AddEventListenerOptions)
    );
    document.addEventListener("visibilitychange", onVisibility);

    startTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onActivity);
      clearTimer();
    };
  }, [idleMs]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-primary overflow-hidden animate-fade-in"
      aria-hidden="true"
      onMouseMove={() => setActive(false)}
      onClick={() => setActive(false)}
      onTouchStart={() => setActive(false)}
      onKeyDown={() => setActive(false)}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <h2
          className="text-white font-semibold text-center leading-tight px-4"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "clamp(3rem, 10vw, 12rem)",
          }}
        >
          keenly
        </h2>
      </div>
      <div className="keen-screensaver-track">
        <img
          src={logo}
          alt=""
          className="w-40 h-40 md:w-56 md:h-56 select-none pointer-events-none"
          draggable={false}
        />
      </div>
      <style>{`
        @keyframes keen-bounce-x {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100vw - 14rem)); }
        }
        @keyframes keen-bounce-y {
          0% { transform: translateY(0); }
          100% { transform: translateY(calc(100vh - 14rem)); }
        }
        .keen-screensaver-track {
          position: absolute;
          top: 0;
          left: 0;
          width: max-content;
          height: max-content;
          animation: keen-bounce-x 7s linear infinite alternate;
        }
        .keen-screensaver-track > img {
          animation: keen-bounce-y 5s linear infinite alternate;
          display: block;
        }
      `}</style>
    </div>
  );
};

export default IdleScreensaver;
