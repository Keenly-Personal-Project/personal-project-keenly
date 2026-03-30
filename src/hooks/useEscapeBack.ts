import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Navigates to `backPath` when Escape is pressed,
 * unless any dialog is open (pass open states) or an input/textarea is focused.
 */
export function useEscapeBack(backPath: string | number, dialogsOpen: boolean[] = []) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dialogsOpen.some(Boolean)) return;

      // Don't interfere with focused inputs/textareas/selects
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (typeof backPath === "number") {
        navigate(backPath as any);
      } else {
        navigate(backPath);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, backPath, ...dialogsOpen]);
}
