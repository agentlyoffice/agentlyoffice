"use client";

import { useEffect, useRef } from "react";

/** Cream dialog over the office. Escape and the × close it; the first field gets focus. */
export function Modal({ title, sub, pre, wide = false, onClose, children, testid, closable = true }: { title: string; sub?: React.ReactNode; pre?: React.ReactNode; wide?: boolean; onClose: () => void; children: React.ReactNode; testid?: string; closable?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closable) onClose();
    };
    window.addEventListener("keydown", onKey);
    const first = box.current?.querySelector<HTMLElement>("input, textarea, select, button:not(.x)");
    first?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closable]);
  return (
    <div className="modal" onMouseDown={(e) => closable && e.target === e.currentTarget && onClose()}>
      <div ref={box} className={`modal-box ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} data-testid={testid}>
        {closable ? (
          <button type="button" className="x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        ) : null}
        {pre}
        <h2>{title}</h2>
        {sub ? <p className="sub">{sub}</p> : null}
        {children}
      </div>
    </div>
  );
}
