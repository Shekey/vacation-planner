"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Horizontal scroller that brings the cell marked data-today into view, past the sticky name column. */
export function ScrollToToday({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const today = box?.querySelector<HTMLElement>("[data-today]");
    const sticky = box?.querySelector<HTMLElement>("[data-sticky]");
    if (!box || !today) return;
    const target = today.offsetLeft - (sticky?.offsetWidth ?? 0) - today.offsetWidth * 2;
    box.scrollLeft = Math.max(0, target);
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
