import { useState, useMemo } from "react";
import { buildSlccData, keyOf } from "../slcc/slccData";
import { loadDraft, saveDraft, defaultDraft } from "../slcc/slccDraft";
import { checklist } from "../slcc/buildSlcc";

const FONT = "'Nunito', 'Nunito Sans', Arial, sans-serif";
const box = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, fontFamily: "Consolas, monospace", fontSize: 12, lineHeight: 1.5, resize: "vertical" };

// "Fill in content": the parts of the SLCC deck that are not in the Excel data.
export default function SlccEditor({ yearFiles, year, onClose }) {
  const data = useMemo(() => buildSlccData(yearFiles, year), [yearFiles, year]);
  const [draft, setDraft] = useState(() => loadDraft(data));
  const [msg, setMsg] = useState("");
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const save = () => setMsg(saveDraft(year, draft) ? "Saved in this browser." : "Could not save (browser storage is blocked).");
  const reset = k => set(k, defaultDraft(data)[k]);
  const list = checklist(data, draft);

  const Field = ({ k, title, help, rows = 5, resettable }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{title}</div>
        {resettable && <button onClick={() => reset(k)} style={{ border: "none", background: "none", color: "#4f46e5", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Reset to suggested</button>}
      </div>
      {help && <div style={{ fontSize: 11, color: "#64748b", margin: "2px 0 6px", lineHeight: 1.5 }}>{help}</div>}
      <textarea value={draft[k] || ""} rows={rows} onChange={e => set(k, e.target.value)} style={box} />
    </div>
  );
  const setAward = (key, f, v) => setDraft(d => ({ ...d, awards: { ...d.awards, [key]: { ...(d.awards[key] || {}), [f]: v } } }));
  const onLogo = e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => set("logo", String(r.result)); r.readAsDataURL(f);
  };
  const exportJson = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(draft)], { type: "application/json" })); a.download = `SLCC ${data.P} content.json`; a.click(); };
  const importJson = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { setDraft(d => ({ ...d, ...JSON.parse(String(r.result)) })); setMsg("Loaded. Press Save to keep it."); } catch (x) { setMsg("That file could not be read."); } }; r.readAsText(f); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "auto", padding: "30px 12px", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "min(820px, 100%)", padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Fill in content · SLCC {data.P}</div>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 999, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", margin: "6px 0 14px", lineHeight: 1.6 }}>
          The dashboard fills the Contract Committee figures by itself. Type or paste the rest here. For tables, copy the cells in Excel (with the header row) and paste them into the box.
          Empty sections are left out of the slides.
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, marginBottom: 18 }}>
          {list.map(([t, kind, ok]) => (
            <div key={t} style={{ fontSize: 12, color: "#334155", lineHeight: 1.8 }}>
              <span style={{ color: ok ? "#059669" : "#d97706", fontWeight: 800 }}>{ok ? "✓" : "○"}</span> {t} <span style={{ color: "#94a3b8" }}>({kind === "auto" ? "automatic" : ok ? "filled" : "empty"})</span>
            </div>
          ))}
        </div>

        <Field k="ref" title="Document reference (footer)" rows={1} />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Company logo (top right of every slide)</div>
          <input type="file" accept="image/*" onChange={onLogo} style={{ fontSize: 12, marginTop: 6 }} />
          {draft.logo && <div><img alt="logo" src={draft.logo} style={{ height: 36, marginTop: 8 }} /> <button onClick={() => set("logo", "")} style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontSize: 11 }}>Remove</button></div>}
        </div>

        <Field k="objectives" title="01 · Objectives (one per line)" rows={6} resettable />
        <Field k="agenda" title="02 · Main highlights list (one per line)" rows={3} resettable />

        {data.awarded.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>02 · Awards of {data.R}: supplier and value</div>
            <div style={{ fontSize: 11, color: "#64748b", margin: "2px 0 6px" }}>The tenders come from the data. Add the supplier and value if you want them on the slide.</div>
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              {data.awarded.map(t => { const k = keyOf(t), a = draft.awards[k] || {}; return (
                <div key={k} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "center" }}>
                  <div style={{ flex: 2, fontSize: 11, color: "#334155" }}>{t.no ? t.no + " – " : ""}{String(t.title || "").slice(0, 60)}</div>
                  <input placeholder="Supplier" value={a.supplier || ""} onChange={e => setAward(k, "supplier", e.target.value)} style={{ ...box, fontFamily: FONT, flex: 1, padding: 6 }} />
                  <input placeholder="Value (MYR)" value={a.value || ""} onChange={e => setAward(k, "value", e.target.value)} style={{ ...box, fontFamily: FONT, width: 110, padding: 6 }} />
                </div>); })}
            </div>
          </div>
        )}

        <Field k="spend" title="02 · Procurement dashboard key figures" help={'One per line as "Label: value", up to 8. Example:\nTotal spend: 66.9 mil\nActive contracts: 140\nAwards: 38\nPO: 161'} rows={5} />
        <Field k="topSuppliers" title="02 · Top suppliers by spend (paste from Excel)" help="Columns: Supplier Name, Contract Title / Scope, Invoiced, Department" rows={5} />
        <Field k="plan" title={`03 · Master Procurement Plan ${data.P} (paste from Excel)`} help="Columns (any order, with header row): Year, Paper Type, Status, Op/OBO, Subject, Strategy (TP), Domain, Department, Management Mode, Budget, Threshold. Domain and Budget drive the charts; Department and Threshold are optional." rows={6} />
        <Field k="sqmIntro" title="04 · SQM introduction text (one point per line)" rows={4} resettable />
        <Field k="sqmDone" title={`04 · Completed SQM ${data.R} (paste from Excel)`} help="Columns: Vendor Name, Contract, Contract Description, Contract Owner, SQM Date" rows={4} />
        <Field k="sqmPlan" title={`04 · Planned SQM ${data.P} (paste from Excel)`} help="Columns: Vendor Name, Contract Value, Contract Description, Contract Owner" rows={4} />
        <Field k="org" title="05 · Organization chart (paste from Excel)" help="Columns: Group, Role, Name, P/T. One Group per column of boxes; list the head of the group first." rows={4} />
        <Field k="focus" title={`06 · Key focus areas for ${data.P}`} help="Separate each box with an empty line. First line is the box title, the next lines are the points." rows={11} resettable />
        <Field k="focusData" title="06 · Pointers from the dashboard data (extra slide, leave empty to skip)" rows={4} resettable />
        <Field k="recs" title="07 · Recommendations (one per line)" rows={5} resettable />
        <Field k="approval" title="07 · Approval wording (first line = sentence, then bullets)" rows={4} resettable />
        <Field k="extra" title="Extra slides" help={'Use for Suppliers Day, scope and constraints per domain, etc. Start each slide with "03 | Title" (the number places it in section 01 to 07). Lines starting with "-" are bullets, other lines are headings. Separate slides with a line of ---.'} rows={9} />

        <label style={{ fontSize: 12, color: "#334155", display: "block", marginBottom: 14 }}>
          <input type="checkbox" checked={!draft.skipEmpty} onChange={e => set("skipEmpty", !e.target.checked)} /> Add a "to be filled in" slide for each empty section
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={save} style={{ border: "none", background: "#4f46e5", color: "#fff", borderRadius: 12, padding: "10px 20px", fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>Save</button>
          <button onClick={exportJson} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 12, padding: "10px 14px", fontWeight: 700, cursor: "pointer", fontFamily: FONT, fontSize: 12 }}>Download content file</button>
          <label style={{ fontSize: 12, color: "#475569", cursor: "pointer" }}>Load content file <input type="file" accept=".json" onChange={importJson} style={{ display: "none" }} /></label>
          <span style={{ fontSize: 12, color: "#047857", fontWeight: 700 }}>{msg}</span>
        </div>
      </div>
    </div>
  );
}