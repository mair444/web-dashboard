import { useState } from "react";
import SlccEditor from "./SlccEditor";
import { reviewYearsAvailable } from "../slcc/slccData";

const FONT = "'Nunito', 'Nunito Sans', Arial, sans-serif";

// "Generate SLCC slides": builds the Strategic Local Contract Committee deck
// from the loaded data and downloads it as a PowerPoint file.
export default function SlccButton({ yearFiles, activeYear, showAllYears }) {
  const years = reviewYearsAvailable(yearFiles);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  if (!years.length) return null;

  const fallback = showAllYears ? years[years.length - 1] : (activeYear || years[years.length - 1]);
  const year = picked && years.includes(picked) ? picked : fallback;
  const partial = year === new Date().getFullYear();

  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      // Loaded only when needed, so the dashboard itself stays light.
      const { generateSlcc } = await import("../slcc/generateSlcc");
      const d = await generateSlcc(yearFiles, year);
      setMsg({ ok: true, text: `Downloaded: SLCC ${d.P}.pptx ` });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "Could not create the slides: " + (e && e.message ? e.message : e) });
    }
    setBusy(false);
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => { setOpen(o => !o); setMsg(null); }} style={{
        display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer",
        background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 800,
        padding: "10px 18px", borderRadius: 999, boxShadow: "0 6px 18px rgba(79,70,229,0.35)",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
        Generate SLCC slides
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 50, width: 340,
          background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 18,
          boxShadow: "0 18px 48px rgba(15,23,42,0.18)", fontFamily: FONT,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Strategic Local Contract Committee</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
            Creates the SLCC slides from the dashboard data: highlights of the year you choose and the plan for the next year.
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", margin: "14px 0 6px" }}>Year to review</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {years.map(y => (
              <button key={y} onClick={() => setPicked(y)} style={{
                border: "1px solid " + (y === year ? "#6366f1" : "#e2e8f0"), background: y === year ? "#eef2ff" : "#f7f9fa",
                color: y === year ? "#4338ca" : "#64748b", fontFamily: FONT, fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              }}>{y}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 12, lineHeight: 1.5 }}>
            Highlights from <strong>{year}</strong> · Master procurement plan <strong>{year + 1}</strong>
            {partial && <div style={{ color: "#b45309", marginTop: 4 }}>{year} is still in progress, so its numbers are year to date.</div>}
          </div>
          <button onClick={run} disabled={busy} style={{
            width: "100%", marginTop: 14, padding: "11px", border: "none", borderRadius: 12, cursor: busy ? "wait" : "pointer",
            background: busy ? "#a5b4fc" : "#4f46e5", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 800,
          }}>{busy ? "Creating slides…" : "Generate and download"}</button>
          <button onClick={() => setEditing(true)} style={{ width: "100%", marginTop: 8, padding: "10px", border: "1px solid #c7d2fe", borderRadius: 12, cursor: "pointer", background: "#eef2ff", color: "#4338ca", fontFamily: FONT, fontSize: 13, fontWeight: 800 }}>Fill in content (suppliers, SQM, plan…)</button>
          {msg && <div style={{ fontSize: 12, marginTop: 10, fontWeight: 600, color: msg.ok ? "#047857" : "#dc2626" }}>{msg.text}</div>}
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 10, lineHeight: 1.5 }}>
            Items that are not in the Excel file (spend, plan list, SQM, organization) are typed or pasted in "Fill in content". Empty sections are left out.
          </div>
        </div>
      )}
      {editing && <SlccEditor yearFiles={yearFiles} year={year} onClose={() => setEditing(false)} />}
    </div>
  );
}