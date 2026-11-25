import { useMemo, useState, useEffect, useCallback } from "react";
import { mergeAllYears } from "../mergeAllYears";
import { buildTenders, groupPresenters, ccPaperStats, CC_TYPES } from "../tenderModel";
import InfoTip from "../components/InfoTip";
import SlccButton from "../components/SlccButton";

const FONT = "'Nunito', 'Nunito Sans', Arial, sans-serif";

const CATS = ["TP","CFT Issuance","TER","TCEAR","CTC","CTC(A&E)","CTC(ACV)","CE","Abort"];
const CAT_COLORS = {
  "TP":"#6366f1","CFT Issuance":"#0ea5e9","TER":"#8b5cf6",
  "TCEAR":"#f97316","CTC":"#10b981","CTC(A&E)":"#f59e0b",
  "CTC(ACV)":"#ef4444","CE":"#22c55e","Abort":"#dc2626"
};
const CAT_BG = {
  "TP":"#eef2ff","CFT Issuance":"#e0f2fe","TER":"#f3f0ff",
  "TCEAR":"#fff4ed","CTC":"#ecfdf5","CTC(A&E)":"#fefce8",
  "CTC(ACV)":"#fef2f2","CE":"#f0fdf4","Abort":"#fef2f2"
};
const CAT_TEXT = {
  "TP":"#4338ca","CFT Issuance":"#0369a1","TER":"#6d28d9",
  "TCEAR":"#c2410c","CTC":"#047857","CTC(A&E)":"#92400e",
  "CTC(ACV)":"#991b1b","CE":"#15803d","Abort":"#991b1b"
};

const BUYER_PASTELS = [
  { bg:"#eef2ff", color:"#4338ca", dot:"#6366f1" },
  { bg:"#e0f2fe", color:"#0369a1", dot:"#0ea5e9" },
  { bg:"#ecfdf5", color:"#047857", dot:"#10b981" },
  { bg:"#fefce8", color:"#92400e", dot:"#f59e0b" },
  { bg:"#fff4ed", color:"#c2410c", dot:"#f97316" },
  { bg:"#fef2f2", color:"#991b1b", dot:"#ef4444" },
  { bg:"#f0fdf4", color:"#15803d", dot:"#22c55e" },
  { bg:"#f3f0ff", color:"#6d28d9", dot:"#8b5cf6" },
];

const DEPT_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#f97316","#ef4444","#22c55e","#8b5cf6"];

function parseExcelDate(v) {
  if (!v) return null;
  if (!isNaN(v) && Number(v) > 1000) {
    const d = new Date(Math.round((Number(v) - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
function AwardIcon({ size = 16, color = "#ffffff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

const LOA_GRAD = "linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)";

function fmtDate(d) {
  if (!d) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normCat(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const exact = CATS.find(c => c.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  const l = s.toLowerCase();
  if (l.includes("tender plan") || l === "tp") return "TP";
  if (l.includes("cft"))                        return "CFT Issuance";
  if (l === "ter")                              return "TER";
  if (l.includes("tcear"))                      return "TCEAR";
  if (l.includes("a&e"))                        return "CTC(A&E)";
  if (l.includes("acv"))                        return "CTC(ACV)";
  if (l.includes("ctc"))                        return "CTC";
  if (l === "ce")                               return "CE";
  if (l.includes("abort"))                      return "Abort";
  return null;
}

// ── Use maxCC (same as CC page) ───────────────────────────────────────────────
function buildCCStats(rows) {
  let maxCC = 0;
  const catTotals = {};
  CATS.forEach(c => { catTotals[c] = 0; });
  rows.forEach(row => {
    const weekRaw = String(row["Week"] || "").trim();
    const ccMatch = weekRaw.match(/cc[\s\-_]*(\d+)/i);
    if (ccMatch) { const n = parseInt(ccMatch[1], 10); if (n > maxCC) maxCC = n; }
    // Same rule as the Contract Committee page: the paper must have a date
    // and be one of the 9 listed types, so both pages show the same number.
    const date = parseExcelDate(row["Date"] || row["Attendance List"] || "");
    if (!date) return;
    const cat = normCat(row["Paper Type"] || row["Subject"]);
    if (cat) catTotals[cat]++;
  });
  return { sittings: maxCC, papers: Object.values(catTotals).reduce((s, n) => s + n, 0), catTotals };
}

// ── Animated count ─────────────────────────────────────────────────────────────
function AnimatedCount({ target, duration = 800 }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{value}</span>;
}

const card = { background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };

function StatCard({ label, value, sub, accent, onClick, spotlight, info }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...card, flex: spotlight ? "1.8 1 240px" : "1 1 110px", padding: spotlight ? "20px 22px" : "18px 16px",
        cursor: onClick ? "pointer" : "default",
        borderLeft: `3px solid ${accent}`,
        transition: "all 0.18s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 24px ${accent}18` : "0 2px 8px rgba(0,0,0,0.04)",
        ...(spotlight ? {
          background: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 60%,#fde68a 100%)",
          boxShadow: hov ? "0 12px 30px rgba(245,158,11,0.32)" : "0 6px 20px rgba(245,158,11,0.22)",
        } : {}),
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {spotlight && (
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: LOA_GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(245,158,11,0.45)" }}>
            <AwardIcon size={14} color="#ffffff" />
          </div>
        )}
        <div style={{ fontSize: 10, color: spotlight ? "#b45309" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, fontFamily: FONT }}>{label}</div>
        {info && <InfoTip text={info} color={spotlight ? "#b45309" : "#94a3b8"} />}
        {spotlight && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: "#b45309", background: "#fde68a", borderRadius: 999, padding: "2px 7px" }}>FINAL PHASE</span>}
      </div>
      <div style={{ fontSize: spotlight ? 40 : 30, fontWeight: 800, color: spotlight ? "#92400e" : "#1e293b", lineHeight: 1, fontFamily: FONT }}>
        <AnimatedCount target={value} />
      </div>
      {sub && <div style={{ fontSize: 11, color: spotlight ? "#b45309" : "#94a3b8", marginTop: 6, fontFamily: FONT, fontWeight: spotlight ? 600 : 400 }}>{sub}</div>}
    </div>
  );
}

// ── Drill-down Modal ──────────────────────────────────────────────────────────
function DrillModalRow({ item, index, accentColor, onJumpToTracker }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = item.tStatus === "awarded" ? "#d97706" : item.tStatus === "abort" ? "#ef4444" : item.tStatus === "ongoing" ? "#6366f1" : "#f59e0b";
  const statusLabel = item.tStatus === "awarded" ? "Awarded" : item.tStatus === "abort" ? "Aborted" : item.tStatus === "ongoing" ? "Ongoing" : "Pending";

  return (
    <div style={{
      borderRadius: 14, marginBottom: 6, overflow: "hidden",
      background: "#f7f9fa", border: `1px solid ${expanded ? accentColor + "30" : "#f1f5f9"}`,
      transition: "border-color 0.15s",
    }}>
      {/* Clickable summary row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", cursor: "pointer" }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: accentColor + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: accentColor, fontFamily: FONT,
        }}>{String(index + 1).padStart(2, "0")}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onDoubleClick={e => { e.stopPropagation(); onJumpToTracker && onJumpToTracker(item.title || item.no); }}
            title="Double-click to find this tender in Tracker"
            style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {item.title || item.no || "—"}
          </div>
          {item.no && item.title && (
            <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", marginBottom: 6 }}>{item.no}</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {item.filled.map((type, j) => (
              <span key={j}
                onClick={e => { e.stopPropagation(); onJumpToTracker && onJumpToTracker(type); }}
                title={`See all "${type}" papers in Tracker`}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                  background: CAT_BG[type] || "#f1f5f9",
                  color: CAT_COLORS[type] || "#64748b", fontFamily: FONT, cursor: "pointer",
                }}>{type}</span>
            ))}
            {item.filled.length === 0 && (
              <span style={{ fontSize: 10, color: "#cbd5e1", fontFamily: FONT }}>No papers yet</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 2 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: statusColor }} title={statusLabel} />
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #ffffff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", padding: "12px 0 4px" }}>
            <div>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT, marginBottom: 2 }}>Status</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: statusColor, fontFamily: FONT }}>{item.status || statusLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT, marginBottom: 2 }}>Week</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: FONT }}>{item.week || "—"}</div>
            </div>
            {item.subject && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT, marginBottom: 2 }}>Subject</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", fontFamily: FONT, lineHeight: 1.4 }}>{item.subject}</div>
              </div>
            )}
          </div>

          {/* Per-paper breakdown with dates */}
          {item.papers && item.papers.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT, marginBottom: 6 }}>
                Papers submitted ({item.papers.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {item.papers.map((p, k) => (
                  <div key={k}
                    onClick={() => onJumpToTracker && onJumpToTracker(p.type)}
                    title={`See all "${p.type}" papers in Tracker`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 10px", borderRadius: 9, background: "#ffffff", cursor: "pointer",
                    }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: CAT_COLORS[p.type] || "#64748b", fontFamily: FONT }}>{p.type}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>{p.date ? fmtDate(p.date) : "No date"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DrillModal({ title, subtitle, items, onClose, accentColor, onJumpToTracker }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#ffffff", borderRadius: 22, width: "100%", maxWidth: 540,
          maxHeight: "80vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", fontFamily: FONT, letterSpacing: "-0.01em" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, fontFamily: FONT }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", border: "1px solid #f1f5f9",
            background: "#f7f9fa", cursor: "pointer", fontSize: 16, color: "#94a3b8",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            fontFamily: FONT, fontWeight: 700, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Hint */}
        <div style={{ padding: "10px 24px 0", fontSize: 11, color: "#cbd5e1", fontFamily: FONT }}>
          Click a tender for details · double-click the title or a paper tag to filter it in Tracker
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: "auto", padding: "12px 24px 20px" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 13, fontFamily: FONT }}>No details found.</div>
          ) : (
            items.map((item, i) => (
              <DrillModalRow key={i} item={item} index={i} accentColor={accentColor} onJumpToTracker={onJumpToTracker} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}


// ── Average papers per year (Procurement overall + each User's Department) ────
// Uses EVERY loaded year (whichever year tab is open) and the same CC-paper
// definition as the rest of the dashboard: a paper with a date and one of the
// 9 types, the same paper on the same date counted once, LOA not counted.
const NO_DEPT = "No department listed";
const NO_VALUE = /^(n\/?a|n\.a\.?|na|nil|none|tbc|tba|unknown|-+|—)?$/i;
function cleanDept(raw) {
  const s = String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");
  return NO_VALUE.test(s) ? NO_DEPT : s;
}
const fmtNum = n => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1));

function computeAvgData(yearFiles, years, fullYearsOnly) {
  if (!years.length) return null;
  const nowY = new Date().getFullYear();
  const perYear = {};
  const label = new Map(); // lower-case key -> display name
  years.forEach(y => {
    const ts = buildTenders((yearFiles[y] && yearFiles[y].rows) || []);
    const byDept = {}; let total = 0;
    ts.forEach(t => {
      const n = t.papers.filter(p => p.date && CC_TYPES.includes(p.type)).length;
      if (!n) return;
      const disp = cleanDept(t.dept), k = disp.toLowerCase();
      if (!label.has(k)) label.set(k, disp);
      byDept[k] = (byDept[k] || 0) + n; total += n;
    });
    perYear[y] = { byDept, total };
  });
  let used = years.filter(y => !(fullYearsOnly && y === nowY));
  if (!used.length) used = years;
  const grand = used.reduce((s, y) => s + perYear[y].total, 0);
  if (!grand) return null;

  const fullYears = years.filter(y => y < nowY);
  const lastF = fullYears[fullYears.length - 1], prevF = fullYears[fullYears.length - 2];
  const pctChange = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);

  const depts = [...label.entries()].map(([k, name]) => {
    const counts = years.map(y => perYear[y].byDept[k] || 0);
    const sum = used.reduce((s, y) => s + (perYear[y].byDept[k] || 0), 0);
    const trend = (lastF && prevF) ? pctChange(perYear[lastF].byDept[k] || 0, perYear[prevF].byDept[k] || 0) : null;
    return { key: k, name, counts, avg: sum / used.length, share: sum / grand, trend };
  }).filter(d => d.share > 0)
    .sort((a, b) => (a.name === NO_DEPT) - (b.name === NO_DEPT) || b.avg - a.avg);

  const pool = fullYears.length ? fullYears : years;
  const busiestYear = pool.reduce((best, y) => (perYear[y].total > perYear[best].total ? y : best), pool[0]);
  const named = depts.filter(d => d.name !== NO_DEPT);
  return {
    years, used, perYear, nowY, grand, avg: grand / used.length, depts,
    maxYearTotal: Math.max(...years.map(y => perYear[y].total), 1),
    maxDeptCount: Math.max(...depts.flatMap(d => d.counts), 1),
    maxDeptAvg: Math.max(...depts.map(d => d.avg), 1),
    trend: (lastF && prevF) ? { last: lastF, prev: prevF, pct: pctChange(perYear[lastF].total, perYear[prevF].total) } : null,
    busiest: { year: busiestYear, total: perYear[busiestYear].total },
    top: named[0] || null,
  };
}

function TrendTag({ pct, light }) {
  if (pct == null || !isFinite(pct)) return null;
  const up = pct >= 0.5, down = pct <= -0.5;
  const color = light ? (up ? "#86efac" : down ? "#fca5a5" : "#e0e7ff") : (up ? "#059669" : down ? "#dc2626" : "#94a3b8");
  return <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: FONT }}>{up ? "▲" : down ? "▼" : "■"} {Math.abs(Math.round(pct))}%</span>;
}

function AvgPapersSection({ data, fullYearsOnly, setFullYearsOnly, onDeptClick }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = setTimeout(() => setReady(true), 60); return () => clearTimeout(id); }, []);
  const { years, used, perYear, nowY, avg, depts } = data;
  const hasPartial = years.includes(nowY);
  const H = 128;
  const short = y => "'" + String(y).slice(2);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Hero: Procurement overall */}
      <div className="mt-keep" style={{
        borderRadius: 22, overflow: "hidden", marginBottom: 14,
        background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4338ca 100%)",
        boxShadow: "0 14px 40px rgba(49,46,129,0.28)", color: "#fff", fontFamily: FONT,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, padding: "26px 28px" }}>
          <div style={{ flex: "1 1 280px", minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#c7d2fe", textTransform: "uppercase" }}>
              Procurement overall · average per year
              <InfoTip color="#c7d2fe" text="Average number of papers presented at the Contract Committee per year, for all departments together. A paper counts when it has a date and is one of the 9 listed types; the same paper on the same date counts once and Letters of Award are not counted. This section always uses every loaded year, whichever year tab is selected." />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}><AnimatedCount target={Math.round(avg)} duration={1100} /></span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#c7d2fe" }}>papers / year</span>
            </div>
            <div style={{ fontSize: 12, color: "#a5b4fc", marginTop: 8 }}>
              Average of {used.length} year{used.length !== 1 ? "s" : ""}: {used.join(", ")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {[
                data.busiest && { k: "Busiest year", v: `${data.busiest.year} · ${data.busiest.total} papers` },
                data.top && { k: "Top department", v: `${data.top.name} · ${Math.round(data.top.share * 100)}%` },
                data.trend && { k: `${data.trend.last} vs ${data.trend.prev}`, v: <TrendTag pct={data.trend.pct} light /> },
              ].filter(Boolean).map(c => (
                <div key={c.k} style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "7px 12px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "#a5b4fc", textTransform: "uppercase" }}>{c.k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{c.v}</div>
                </div>
              ))}
            </div>
            {hasPartial && (
              <div style={{ display: "inline-flex", marginTop: 16, background: "rgba(255,255,255,0.10)", borderRadius: 999, padding: 3 }}>
                {[[false, "All years"], [true, "Full years only"]].map(([val, text]) => (
                  <button key={text} onClick={() => setFullYearsOnly(val)} style={{
                    border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700,
                    padding: "6px 14px", borderRadius: 999,
                    background: fullYearsOnly === val ? "#fff" : "transparent",
                    color: fullYearsOnly === val ? "#3730a3" : "#c7d2fe",
                  }}>{text}</button>
                ))}
              </div>
            )}
          </div>

          {/* Year columns with the average line */}
          <div style={{ flex: "1 1 300px", minWidth: 260 }}>
            <div style={{ position: "relative", height: H + 26, paddingTop: 26 }}>
              <div style={{ position: "relative", height: H, display: "flex", alignItems: "flex-end", gap: 14 }}>
                {years.map(y => {
                  const t = perYear[y].total, partial = y === nowY;
                  const included = used.includes(y);
                  return (
                    <div key={y} style={{ flex: 1, maxWidth: 84, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, opacity: included ? 1 : 0.5 }}>{t}</div>
                      <div style={{
                        width: "100%", borderRadius: "10px 10px 4px 4px",
                        height: ready ? Math.max(4, (t / data.maxYearTotal) * (H - 24)) : 0,
                        transition: "height 1s cubic-bezier(.2,.8,.2,1)",
                        background: partial
                          ? "repeating-linear-gradient(135deg,rgba(255,255,255,0.55) 0 6px,rgba(255,255,255,0.28) 6px 12px)"
                          : "linear-gradient(180deg,#fde68a,#f59e0b)",
                        opacity: included ? 1 : 0.35,
                      }} />
                    </div>
                  );
                })}
                {/* average line */}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: ready ? (avg / data.maxYearTotal) * (H - 24) : 0, transition: "bottom 1s cubic-bezier(.2,.8,.2,1)", borderTop: "2px dashed rgba(255,255,255,0.75)", pointerEvents: "none" }}>
                  <span style={{ position: "absolute", right: 0, top: -20, fontSize: 10, fontWeight: 800, background: "#fff", color: "#3730a3", borderRadius: 6, padding: "1px 7px" }}>avg {Math.round(avg)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                {years.map(y => (
                  <div key={y} style={{ flex: 1, maxWidth: 84, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#c7d2fe" }}>
                    {y}{y === nowY ? <span style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#a5b4fc" }}>to date</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per department */}
      <div style={{ ...card, padding: "22px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: FONT, display: "flex", alignItems: "center" }}>
          Average papers per year · by User's Department
          <InfoTip text="For each User's Department: the average number of Contract Committee papers per year (the big number), how much of all papers it accounts for, and the paper count in each year. The small columns use one shared scale, so departments can be compared directly. Tenders with no department listed are shown separately so the shares add up to 100%. Click a department to filter it in Tracker." />
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 16px" }}>
          Papers presented at Contract Committee · all loaded years · click a department to open it in Tracker
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {depts.map((d, i) => {
            const c = DEPT_COLORS[i % DEPT_COLORS.length];
            const clickable = d.name !== NO_DEPT;
            return (
              <div key={d.key}
                onClick={() => clickable && onDeptClick(d.name)}
                title={clickable ? "Click to filter this department in Tracker" : undefined}
                style={{
                  background: "#f7f9fa", borderRadius: 16, padding: "16px 16px 14px", borderLeft: `4px solid ${c}`,
                  cursor: clickable ? "pointer" : "default", transition: "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 22px ${c}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", fontFamily: FONT, lineHeight: 1.3 }}>{d.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: c, background: "#fff", border: `1px solid ${c}30`, borderRadius: 999, padding: "2px 8px", flexShrink: 0, fontFamily: FONT }}>{Math.round(d.share * 100)}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#1e293b", fontFamily: FONT, lineHeight: 1 }}>{fmtNum(d.avg)}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>papers / year</span>
                  <span style={{ marginLeft: "auto" }}><TrendTag pct={d.trend} /></span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "#e8edf3", overflow: "hidden", margin: "10px 0 12px" }}>
                  <div style={{ height: "100%", width: ready ? `${(d.avg / data.maxDeptAvg) * 100}%` : 0, background: c, borderRadius: 999, transition: "width 1s ease" }} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 62 }}>
                  {years.map((y, k) => {
                    const n = d.counts[k], partial = y === nowY, included = used.includes(y);
                    return (
                      <div key={y} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", fontFamily: FONT, marginBottom: 2, opacity: included ? 1 : 0.5 }}>{n}</div>
                        <div style={{
                          width: "100%", maxWidth: 34, borderRadius: "6px 6px 2px 2px",
                          height: ready ? Math.max(3, (n / data.maxDeptCount) * 34) : 0, transition: "height 0.9s ease",
                          background: partial ? `repeating-linear-gradient(135deg,${c}99 0 4px,${c}55 4px 8px)` : c,
                          opacity: included ? 1 : 0.4,
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {years.map(y => <div key={y} style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: "#94a3b8", fontFamily: FONT }}>{short(y)}{y === nowY ? "*" : ""}</div>)}
                </div>
              </div>
            );
          })}
        </div>
        {hasPartial && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 12, fontFamily: FONT }}>* {nowY} is still in progress (striped bars). Use "Full years only" above to leave it out of the average.</div>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home({ config, yearFiles = {}, activeYear, showAllYears = false, setPage, setPendingSearch }) {
  const [hoveredDept,   setHoveredDept]   = useState(null);
  const [hoveredBuyer,  setHoveredBuyer]  = useState(null);
  const [deptModal,     setDeptModal]     = useState(null); // { name, tenders }
  const [buyerModal,    setBuyerModal]    = useState(null); // { name, tenders }
  const [fullYearsOnly, setFullYearsOnly] = useState(false);

  const closeModal = useCallback(() => { setDeptModal(null); setBuyerModal(null); }, []);

  const uploadedYears = useMemo(() => Object.keys(yearFiles).map(Number).sort((a, b) => a - b), [yearFiles]);

  // Rows shown on this page. Years are never silently combined —
  // only when "All" is explicitly selected do we merge every year's rows.
  // When merging: 2024 only contributes its TP papers, and a tender
  // completed in more than one year only counts its most recent
  // completed copy, so Overview's numbers match Tracker's "All" view.
  const activeRows = useMemo(() => {
    if (showAllYears) return mergeAllYears(uploadedYears, yearFiles).visibleRows;
    if (activeYear && yearFiles[activeYear]) return yearFiles[activeYear].rows;
    return config || [];
  }, [activeYear, showAllYears, yearFiles, uploadedYears, config]);

  const currentCalYear = showAllYears ? "All years" : (activeYear || new Date().getFullYear());

  const showCC  = !showAllYears && !!yearFiles[currentCalYear];
  const ccStats = useMemo(
    () => buildCCStats((!showAllYears && yearFiles[currentCalYear]?.rows) || []),
    [yearFiles, currentCalYear, showAllYears]
  );

  // Same tender model as Paper Trail, so both pages always show the same numbers.
  const tenders     = useMemo(() => buildTenders(activeRows), [activeRows]);
  // Papers presented at Contract Committee: one definition shared by every page.
  const ccPaper     = useMemo(() => ccPaperStats(tenders), [tenders]);
  const total       = tenders.length;
  const complete    = tenders.filter(t => t.tStatus === "awarded").length;
  const ongoing     = tenders.filter(t => t.tStatus === "ongoing").length;
  const pending     = tenders.filter(t => t.tStatus === "pending").length;
  const aborted     = tenders.filter(t => t.tStatus === "abort").length;
  const pctComplete = total ? Math.round((complete / total) * 100) : 0;
  const pctOngoing  = total ? Math.round((ongoing  / total) * 100) : 0;
  const pctPending  = total ? Math.round((pending  / total) * 100) : 0;
  const pctAborted  = total ? Math.round((aborted  / total) * 100) : 0;

  // Build dept map with tenders list
  const deptData = useMemo(() => {
    const map = {};
    tenders.forEach(t => {
      const d = t.dept || "No department listed";
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    // Tenders with no department are kept (shown as "No department listed")
    // so the donut adds up to the total.
    return Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length);
  }, [tenders]);

  // Every presenter/buyer name found on any paper is listed, whether or not
  // they have a department. No top-10 cut: the list scrolls.
  const buyerData = useMemo(() => groupPresenters(tenders), [tenders]);

  // Average papers per year (all loaded years, independent of the year tab).
  const avgData = useMemo(() => computeAvgData(yearFiles, uploadedYears, fullYearsOnly), [yearFiles, uploadedYears, fullYearsOnly]);

  const goToTracker = () => setPage && setPage("views");
  const goToCC      = () => setPage && setPage("cc");

  // Navigate to Tracker with the search bar pre-filled with a term
  // (paper type, buyer name, department name, tender title, etc.)
  const goToTrackerWithSearch = (term) => {
    if (setPendingSearch) setPendingSearch(term);
    if (setPage) setPage("views");
  };

  if (!activeRows || activeRows.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 18, padding: 40, fontFamily: FONT }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e0e7ff" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", fontFamily: FONT }}>No data yet</div>
      <div style={{ fontSize: 14, color: "#94a3b8" }}>Upload your Excel file in the Tracker tab to get started.</div>
      <button onClick={goToTracker} style={{
        padding: "12px 32px", borderRadius: 999, border: "none",
        background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700,
        cursor: "pointer", fontFamily: FONT, boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
      }}>Go to Tracker →</button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 48, fontFamily: FONT }}>

      {/* Modals */}
      {deptModal && (
        <DrillModal
          title={deptModal.name}
          subtitle={`${deptModal.tenders.length} tender${deptModal.tenders.length !== 1 ? "s" : ""} · User's Department`}
          items={deptModal.tenders}
          accentColor={DEPT_COLORS[deptData.findIndex(([n]) => n === deptModal.name) % DEPT_COLORS.length]}
          onClose={closeModal}
          onJumpToTracker={term => { closeModal(); goToTrackerWithSearch(term); }}
        />
      )}
      {buyerModal && (
        <DrillModal
          title={buyerModal.name}
          subtitle={`${buyerModal.papers} paper${buyerModal.papers !== 1 ? "s" : ""} presented · ${buyerModal.tenders.length} tender${buyerModal.tenders.length !== 1 ? "s" : ""}`}
          items={buyerModal.tenders}
          accentColor={BUYER_PASTELS[buyerData.findIndex(([n]) => n === buyerModal.name) % BUYER_PASTELS.length].dot}
          onClose={closeModal}
          onJumpToTracker={term => { closeModal(); goToTrackerWithSearch(term); }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", margin: "0 0 4px 0", letterSpacing: "-0.02em", fontFamily: FONT }}>Overview</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontFamily: FONT }}>Procurement pipeline · {currentCalYear}</p>
        </div>
        <SlccButton yearFiles={yearFiles} activeYear={activeYear} showAllYears={showAllYears} />
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total"    value={total}    accent="#64748b" info="Number of different tenders (one per Tender No). This counts tenders, not papers, so it is lower than the paper counts on other pages." />
        <StatCard label="Awarded (LOA)" value={complete} sub={complete === 0 ? "No Letters of Award yet" : pctComplete + "% of pipeline"} accent="#f59e0b" onClick={goToTracker} spotlight info="Tenders that have a Letter of Award (LOA). LOA is the final phase, so these tenders are finished." />
        <StatCard label="Ongoing"  value={ongoing}  sub={pctOngoing  + "% of pipeline"} accent="#6366f1" onClick={goToTracker} info="Tenders with at least one dated paper, no Letter of Award, and whose latest paper is not an Abort. This is the same rule as the Paper Trail page, so both show the same number." />
        <StatCard label="Pending"  value={pending}  sub={pctPending  + "% of pipeline"} accent="#f59e0b" onClick={goToTracker} info="Tenders that have papers but no dated paper yet, and no Letter of Award." />
        {aborted > 0 && <StatCard label="Aborted" value={aborted} sub={pctAborted + "% of pipeline"} accent="#ef4444" onClick={goToTracker} info="Tenders whose latest dated paper is an Abort." />}
      </div>

      {/* Pipeline progress — stacked */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: FONT, display: "flex", alignItems: "center" }}>Pipeline progress<InfoTip text="How the tenders are split by status. The percentage on the right is the share of tenders that have been awarded (LOA)." /></div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Across all {total} tenders</div>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#d97706", fontFamily: FONT }}>{pctComplete}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "#f1f5f9", overflow: "hidden", display: "flex" }}>
          {complete > 0 && <div style={{ width: `${pctComplete}%`, height: "100%", background: LOA_GRAD, transition: "width 0.9s ease", minWidth: 4 }} />}
          {ongoing  > 0 && <div style={{ width: `${pctOngoing}%`,  height: "100%", background: "#6366f1", transition: "width 0.9s ease", minWidth: 4 }} />}
          {pending  > 0 && <div style={{ width: `${pctPending}%`,  height: "100%", background: "#f59e0b", transition: "width 0.9s ease", minWidth: 4 }} />}
          {aborted  > 0 && <div style={{ width: `${pctAborted}%`,  height: "100%", background: "#ef4444", transition: "width 0.9s ease", minWidth: 4 }} />}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          {[["Awarded (LOA)","#f59e0b",complete,pctComplete],["Ongoing","#6366f1",ongoing,pctOngoing],["Pending","#f59e0b",pending,pctPending],...(aborted > 0 ? [["Aborted","#ef4444",aborted,pctAborted]] : [])].map(([label,color,count,pct]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, fontFamily: FONT }}>
                {label}: <strong style={{ color: "#1e293b" }}>{count}</strong>
                <span style={{ color: "#94a3b8", marginLeft: 4 }}>({pct}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Average papers per year: Procurement overall + each User's Department */}
      {avgData && (
        <AvgPapersSection
          data={avgData}
          fullYearsOnly={fullYearsOnly}
          setFullYearsOnly={setFullYearsOnly}
          onDeptClick={name => goToTrackerWithSearch(name)}
        />
      )}

      {/* Lower grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>

        {/* CC card — fully hidden when viewing All years, since CC stats are year-specific */}
        {!showAllYears && (
          showCC ? (
            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: FONT }}>Contract Committee</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{currentCalYear} · synced from Excel</div>
                </div>
                <span style={{ fontSize: 11, background: "#eef2ff", color: "#4338ca", padding: "4px 10px", borderRadius: 8, border: "1px solid #e0e7ff", fontWeight: 700, fontFamily: FONT }}>{currentCalYear}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label:"Sittings", value:ccStats.sittings, bg:"#ecfdf5", color:"#10b981", text:"#047857", info:"Number of Contract Committee sittings in this year (the highest CC number in the Week column)." },
                  { label:"Papers",   value:ccPaper.total,   bg:"#eef2ff", color:"#6366f1", text:"#4338ca", info:"Papers presented at the Contract Committee this year: papers with a date and one of the 9 listed types. The same paper on the same date counts once. Letters of Award, other paper types and papers without a date are not counted here, so the Paper Trail total can be higher. This counts papers, not tenders." },
                ].map(({ label, value, bg, color, text, info }) => (
                  <div key={label} style={{ background: bg, borderRadius: 14, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1 }}><AnimatedCount target={value} /></div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: text, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6, fontFamily: FONT, display: "inline-flex", alignItems: "center" }}>{label}<InfoTip text={info} color={text} /></div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                {CATS.map(cat => (
                  <div key={cat} style={{ background: CAT_BG[cat], borderRadius: 10, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: CAT_TEXT[cat], fontFamily: FONT }}>{cat}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: CAT_COLORS[cat], fontFamily: FONT }}><AnimatedCount target={ccPaper.catTotals[cat] || 0} /></span>
                  </div>
                ))}
              </div>
              <button onClick={goToCC} style={{
                width: "100%", padding: "11px", borderRadius: 12, border: "none",
                background: "#eef2ff", color: "#4338ca", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#6366f1"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.color = "#4338ca"; }}
              >View full report →</button>
            </div>
          ) : (
            <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 200, border: "1px dashed #e2e8f0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", fontFamily: FONT }}>Contract Committee</div>
              <div style={{ fontSize: 12, color: "#cbd5e1", textAlign: "center", maxWidth: 220, lineHeight: 1.6, fontFamily: FONT }}>
                Upload a <strong style={{ color: "#94a3b8" }}>{currentCalYear}</strong> Excel file in Tracker to see CC stats here.
              </div>
            </div>
          )
        )}

        {/* ── Department — click to drill down ── */}
        <div style={{ ...card, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 4, fontFamily: FONT, display: "flex", alignItems: "center" }}>User's Department<InfoTip text="Tenders grouped by the department of the user who requested them. A tender with no department listed is shown as 'No department listed', so the groups add up to the total." /></div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>Click for details · double-click to filter in Tracker</div>
          {deptData.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: 20 }}>No department data</div>
          ) : (
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {/* Donut */}
              <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
                <svg width="104" height="104" viewBox="0 0 104 104">
                  {(() => {
                    let offset = 0; const circ = 2 * Math.PI * 34;
                    return deptData.map(([name, list], i) => {
                      const pct = list.length / total, dash = pct * circ, gap = circ - dash;
                      const el = (
                        <circle key={name} cx="52" cy="52" r="34" fill="none"
                          stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                          strokeWidth={hoveredDept === name ? 15 : 10}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={-offset * circ}
                          transform="rotate(-90 52 52)"
                          style={{ transition: "stroke-width 0.15s", cursor: "pointer" }}
                          onMouseEnter={() => setHoveredDept(name)}
                          onMouseLeave={() => setHoveredDept(null)}
                          onClick={() => setDeptModal({ name, tenders: list })}
                        />
                      );
                      offset += pct; return el;
                    });
                  })()}
                  <text x="52" y="48" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1e293b" fontFamily="Nunito, Arial">{total}</text>
                  <text x="52" y="61" textAnchor="middle" fontSize="7.5" fill="#94a3b8" fontFamily="Nunito Sans, Arial">tenders</text>
                </svg>
              </div>
              {/* List */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {deptData.slice(0, 7).map(([name, list], i) => (
                  <div key={name}
                    onMouseEnter={() => setHoveredDept(name)}
                    onMouseLeave={() => setHoveredDept(null)}
                    onClick={() => setDeptModal({ name, tenders: list })}
                    onDoubleClick={() => goToTrackerWithSearch(name)}
                    title="Click for details · Double-click to filter in Tracker"
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 9px",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                      background: hoveredDept === name ? "#f0f0ff" : "#f7f9fa",
                      border: `1px solid ${hoveredDept === name ? "#e0e7ff" : "transparent"}`,
                    }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    <div style={{ flex: 1, fontSize: 12, color: "#374151", fontWeight: hoveredDept === name ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>{name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: DEPT_COLORS[i % DEPT_COLORS.length], background: "#ffffff", borderRadius: 6, padding: "1px 7px", border: `1px solid ${DEPT_COLORS[i % DEPT_COLORS.length]}20`, fontFamily: FONT }}>{list.length}</span>
                    {hoveredDept === name && <span style={{ fontSize: 10, color: "#6366f1", fontFamily: FONT }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Presenters — click to drill down ── */}
        {buyerData.length > 0 && (
          <div style={{ ...card, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 4, fontFamily: FONT, display: "flex", alignItems: "center" }}>Presenters<InfoTip text="Each person is counted once, even if their name is written in different ways (upper or lower case, short or full name, with or without Mohd or Nor). The big number is the papers they presented at Contract Committee (a paper with a date and one of the 9 types); the small number is the tenders they worked on. If two people present together, the paper counts for both, so the totals can be higher than the real number of papers." /></div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>{buyerData.length} presenter{buyerData.length !== 1 ? "s" : ""} · click for details · double-click to filter in Tracker</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {buyerData.map(([name, list, stat], i) => {
                const p = BUYER_PASTELS[i % BUYER_PASTELS.length];
                const isHov = hoveredBuyer === name;
                return (
                  <div key={name}
                    onMouseEnter={() => setHoveredBuyer(name)}
                    onMouseLeave={() => setHoveredBuyer(null)}
                    onClick={() => setBuyerModal({ name, tenders: list, papers: stat.papers })}
                    onDoubleClick={() => goToTrackerWithSearch(name)}
                    title="Click for details · Double-click to filter in Tracker"
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                      background: isHov ? p.bg : "#f7f9fa",
                      border: `1px solid ${isHov ? p.dot + "35" : "transparent"}`,
                    }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: p.bg, border: `1.5px solid ${p.dot}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: p.dot, fontFamily: FONT,
                    }}>{name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>{name}</div>
                      <div style={{ height: 3, borderRadius: 999, background: "#f1f5f9", overflow: "hidden", marginTop: 5 }}>
                        <div style={{ height: "100%", width: `${(stat.papers / (buyerData[0]?.[2]?.papers || 1)) * 100}%`, background: p.dot, borderRadius: 999, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: p.dot, fontFamily: FONT }}>{stat.papers}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>· {stat.tenders} tender{stat.tenders !== 1 ? "s" : ""}</span>
                      {isHov && <span style={{ fontSize: 11, color: p.dot, fontFamily: FONT }}>→</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All tenders — scrollable */}
        <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 4, fontFamily: FONT }}>All Tenders</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>{total} tenders · scroll to view all</div>
          <div style={{ overflowY: "auto", maxHeight: 400, paddingRight: 4 }}>
            {tenders.map((t, i) => {
              const color = t.tStatus === "awarded" ? "#10b981" : t.tStatus === "abort" ? "#ef4444" : t.tStatus === "ongoing" ? "#6366f1" : "#f59e0b";
              const tenderTerm = t.title || t.no || "";
              return (
                <div key={i}
                  onClick={() => goToTrackerWithSearch(tenderTerm)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, cursor: "pointer", transition: "background 0.12s", marginBottom: 2 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 10, color: "#cbd5e1", width: 22, textAlign: "right", flexShrink: 0, fontFamily: "monospace" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily: FONT }}>{tenderTerm || "—"}</span>
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    {t.filled.slice(0, 2).map((type, j) => (
                      <span key={j}
                        onClick={e => { e.stopPropagation(); goToTrackerWithSearch(type); }}
                        title={`See all "${type}" papers in Tracker`}
                        style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: CAT_BG[type] || "#f7f9fa", color: CAT_COLORS[type] || "#64748b", fontFamily: FONT, cursor: "pointer" }}
                      >{type}</span>
                    ))}
                    {t.filled.length > 2 && <span style={{ fontSize: 9, color: "#94a3b8" }}>+{t.filled.length - 2}</span>}
                  </div>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
          <button onClick={goToTracker} style={{
            marginTop: 14, width: "100%", padding: "10px", borderRadius: 12,
            border: "1px solid #e2e8f0", background: "#f7f9fa",
            color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.color = "#4338ca"; e.currentTarget.style.borderColor = "#e0e7ff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f7f9fa"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >Open Tracker →</button>
        </div>
      </div>
    </div>
  );
}