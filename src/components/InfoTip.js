import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// Small "i" button that explains what a number or section represents.
// Opens on hover, keyboard focus or click/tap. The bubble is rendered on the
// page body so it is never clipped by a card or moved by a hover animation.
export default function InfoTip({ text, color = "#94a3b8", size = 14 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const show = useCallback(() => {
    const el = btnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const width = 260;
      const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
      setPos({ top: r.bottom + 8, left });
    }
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); };
  }, [open]);

  return (
    <>
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        aria-label="What does this number represent?"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={e => { e.stopPropagation(); open ? hide() : show(); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); open ? hide() : show(); } }}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: size, height: size, borderRadius: "50%", flexShrink: 0,
          border: `1px solid ${color}`, color, cursor: "help", userSelect: "none",
          fontSize: size * 0.68, fontWeight: 800, lineHeight: 1, marginLeft: 6,
          fontFamily: "'Nunito', Arial, sans-serif", textTransform: "none", letterSpacing: 0,
        }}
      >i</span>
      {open && createPortal(
        <div
          role="tooltip"
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: 260, zIndex: 5000,
            background: "#1e293b", color: "#f8fafc", borderRadius: 12, padding: "10px 12px",
            fontSize: 11.5, lineHeight: 1.5, fontWeight: 500, textTransform: "none", letterSpacing: 0,
            fontFamily: "'Nunito Sans', 'Nunito', Arial, sans-serif",
            boxShadow: "0 12px 32px rgba(15,23,42,0.28)", pointerEvents: "none",
          }}
        >{text}</div>,
        document.body
      )}
    </>
  );
}