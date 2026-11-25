import React, { useMemo, useState, useEffect, useCallback } from "react";
import { buildTenders } from "../tenderModel";
import InfoTip from "../components/InfoTip";

const FONT = "'Nunito', 'Nunito Sans', Arial, sans-serif";

const CATS   = ["TP","CFT Issuance","TER","TCEAR","CTC","CTC(A&E)","CTC(ACV)","CE","Abort"];
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Extract a CC number from any common Week column format ────────────────────
// Handles many real-world variations seen across different files:
//   "CC1"  "CC 1"  "CC-1"  "CC01"  "cc33"
//   "CC1 - 15 Jan"  "CC/2025/01"  "Week CC1"  "1" (plain number)
//   "CC1/2025"  "CC 1 (2025)"
// Returns the integer, or null if no CC number can be found.
function parseCCNumber(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // Pattern 1: starts with "CC" followed by optional separators then digits
  // e.g. "CC1", "CC 33", "CC-01", "CC/2025/01", "CC1 - 15 Jan"
  let m = s.match(/^cc[\s\-_/]*(\d+)/i);
  if (m) return parseInt(m[1], 10);

  // Pattern 2: "Week CC1" or "CC" appears anywhere in the string
  m = s.match(/cc[\s\-_]*(\d+)/i);
  if (m) return parseInt(m[1], 10);

  // Pattern 3: plain integer — only if it looks like a sitting number (1-999)
  // Be conservative here: only match if the ENTIRE value is a number
  m = s.match(/^(\d{1,3})$/);
  if (m) return parseInt(m[1], 10);

  return null;
}

// ── Build CC data for one year's rows ─────────────────────────────────────────
// Sittings = the HIGHEST CC number found in the Week column for this year
// (settled rule). Not a count of unique entries, and never summed across years.
//
// Papers presented = papers with a date and one of the 9 CC types, taken from
// the SAME tender model that Overview and Paper Trail use, so the numbers match
// on every page. The same paper type on the same date for the same tender
// counts once. LOA is not a CC paper.
function buildCCData(rows) {
  const data = {};
  MONTHS.forEach(m => { data[m] = {}; CATS.forEach(c => { data[m][c] = []; }); });

  let maxCC = 0;
  rows.forEach(row => {
    const ccNum = parseCCNumber(String(row["Week"] || "").trim());
    if (ccNum !== null && ccNum > maxCC) maxCC = ccNum;
  });

  buildTenders(rows).forEach(t => {
    t.papers.forEach(p => {
      if (!p.date || !CATS.includes(p.type)) return;
      const month = MONTHS[p.date.getMonth()];
      if (!month) return;
      data[month][p.type].push({
        title:   t.title,
        no:      t.no,
        buyer:   (p.people && p.people.length) ? p.people.join(", ") : (p.buyer || t.buyer),
        dept:    t.dept,
        subject: p.subject || t.subject,
        status:  p.status  || t.status,
        week:    p.week    || t.week,
        type:    p.type,
        date:    p.date,
      });
    });
  });

  return { data, sittings: maxCC };
}

function calcTotalPapers(data) {
  return MONTHS.reduce((s, m) => s + CATS.reduce((ss, c) => ss + (data[m]?.[c]?.length || 0), 0), 0);
}
function calcMonthTotal(data, month) {
  return CATS.reduce((s, c) => s + (data[month]?.[c]?.length || 0), 0);
}
function calcCatTotal(data, cat) {
  return MONTHS.reduce((s, m) => s + (data[m]?.[cat]?.length || 0), 0);
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCount({ target, duration = 900 }) {
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

const card = { background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" };

// ── Subtle bubble background ──────────────────────────────────────────────────
function BubbleBackground() {
  return (
    <>
      <style>{`
        @keyframes ccBubA {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.7; }
          40% { transform: translate(25px,-35px) scale(1.05); opacity: 1; }
          70% { transform: translate(-20px,20px) scale(0.96); opacity: 0.8; }
        }
        @keyframes ccBubB {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.6; }
          35% { transform: translate(-30px,20px) scale(1.04); opacity: 0.9; }
          65% { transform: translate(25px,-25px) scale(0.95); opacity: 0.7; }
        }
        @keyframes ccBubC {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.5; }
          50% { transform: translate(15px,30px) scale(1.06); opacity: 0.85; }
        }
      `}</style>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 16, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position:"absolute", width:300, height:300, top:"-15%", right:"-8%", borderRadius:"50%", filter:"blur(2px)",
          background:"radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
          animation:"ccBubA 20s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:220, height:220, bottom:"-10%", left:"3%", borderRadius:"50%", filter:"blur(2px)",
          background:"radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          animation:"ccBubB 25s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:160, height:160, top:"40%", right:"20%", borderRadius:"50%", filter:"blur(2px)",
          background:"radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%)",
          animation:"ccBubC 18s ease-in-out infinite" }} />
      </div>
    </>
  );
}

// ── Paper detail modal ────────────────────────────────────────────────────────
function PaperModalRow({ paper, index, accentColor, onJumpToTracker }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = paper.status?.toLowerCase().includes("complete") ? "#10b981"
    : paper.status?.toLowerCase().includes("cancel") ? "#ef4444" : "#6366f1";

  return (
    <div style={{
      borderRadius:14, marginBottom:6, overflow:"hidden",
      background:"#f7f9fa", border:`1px solid ${expanded ? accentColor + "30" : "#f1f5f9"}`,
      transition:"border-color 0.15s",
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        onDoubleClick={e => { e.stopPropagation(); onJumpToTracker(paper.title || paper.no); }}
        title="Click for details · double-click to find in Tracker"
        style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 14px", cursor:"pointer" }}
      >
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0,
          background: accentColor + "15",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:800, color:accentColor, fontFamily:FONT,
        }}>{String(index + 1).padStart(2,"00")}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", fontFamily:FONT, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {paper.title || paper.no || "—"}
          </div>
          {paper.no && paper.title && (
            <div style={{ fontSize:10, color:"#94a3b8", fontFamily:"monospace", marginBottom:6 }}>{paper.no}</div>
          )}
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            <span
              onClick={e => { e.stopPropagation(); onJumpToTracker(paper.type); }}
              title={`See all "${paper.type}" papers in Tracker`}
              style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:999, background:CAT_BG[paper.type]||"#f1f5f9", color:CAT_COLORS[paper.type]||"#64748b", fontFamily:FONT, cursor:"pointer" }}
            >{paper.type}</span>
            {paper.date && (
              <span style={{ fontSize:10, color:"#94a3b8", fontFamily:FONT, padding:"2px 4px" }}>{fmtDate(paper.date)}</span>
            )}
          </div>
        </div>

        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.2s", flexShrink:0, marginTop:6 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {expanded && (
        <div style={{ padding:"0 14px 14px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 14px", padding:"10px 0 4px", borderTop:"1px solid #ffffff" }}>
            {[
              { label:"Status",     value: paper.status },
              { label:"Week",       value: paper.week },
              { label:"Presenter",  value: paper.buyer },
              { label:"Department", value: paper.dept },
              paper.subject ? { label:"Subject", value: paper.subject, full: true } : null,
            ].filter(Boolean).map(({ label, value, full }) => (
              <div key={label} style={ full ? { gridColumn:"1 / -1" } : {} }>
                <div style={{ fontSize:9, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em", fontFamily:FONT, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight: label === "Status" ? 700 : 600, color: label === "Status" ? statusColor : "#374151", fontFamily:FONT, lineHeight:1.4 }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaperModal({ month, category, papers, onClose, onJumpToTracker }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const accentColor = CAT_COLORS[category] || "#6366f1";

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(15,23,42,0.35)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"#ffffff", borderRadius:22, width:"100%", maxWidth:540,
        maxHeight:"80vh", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 64px rgba(0,0,0,0.14)", overflow:"hidden",
        animation:"modalIn 0.2s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:none; } }`}</style>

        <div style={{ padding:"22px 24px 16px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:accentColor }} />
              <span style={{ fontSize:17, fontWeight:800, color:"#1e293b", fontFamily:FONT, letterSpacing:"-0.01em" }}>{category}</span>
            </div>
            <div style={{ fontSize:12, color:"#94a3b8", fontFamily:FONT }}>
              {papers.length} paper{papers.length !== 1 ? "s" : ""} in {month}
            </div>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:"50%", border:"1px solid #f1f5f9",
            background:"#f7f9fa", cursor:"pointer", fontSize:16, color:"#94a3b8",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>×</button>
        </div>

        <div style={{ padding:"10px 24px 0", fontSize:11, color:"#cbd5e1", fontFamily:FONT }}>
          Click a paper for details · double-click title or tag to find it in Tracker
        </div>

        <div style={{ overflowY:"auto", padding:"12px 24px 20px" }}>
          {papers.map((paper, i) => (
            <PaperModalRow key={i} paper={paper} index={i} accentColor={accentColor} onJumpToTracker={onJumpToTracker} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ContractCommittee({ yearFiles = {}, activeYear, setPage, setPendingSearch }) {
  const [modalData, setModalData] = useState(null);

  const closeModal = useCallback(() => setModalData(null), []);

  const jumpToTracker = useCallback((term) => {
    closeModal();
    if (setPendingSearch) setPendingSearch(term);
    if (setPage) setPage("views");
  }, [closeModal, setPendingSearch, setPage]);

  const uploadedYears = useMemo(
    () => Object.keys(yearFiles).map(Number).sort((a, b) => a - b),
    [yearFiles]
  );

  // Build CC data per year — but count sittings individually per year,
  // then SUM across all years for the grand total.
  // This correctly handles files that restart CC numbering each year.
  const ccByYear = useMemo(() => {
    const result = {};
    uploadedYears.forEach(y => {
      result[y] = buildCCData(yearFiles[y]?.rows || []);
    });
    return result;
  }, [yearFiles, uploadedYears]);

  // ── Total sittings across ALL uploaded years ─────────────────────────────
  // Each year's unique CC count is summed, so 2024's 20 sittings +
  // 2025's 33 sittings = 53 total, regardless of CC number resets.
  const totalSittingsAllYears = useMemo(() =>
    uploadedYears.reduce((sum, y) => sum + (ccByYear[y]?.sittings || 0), 0),
    [ccByYear, uploadedYears]
  );

  const curYear = activeYear && ccByYear[activeYear] ? activeYear : uploadedYears[uploadedYears.length - 1] || null;
  const curCC   = curYear ? ccByYear[curYear] : null;
  const curData = useMemo(() => curCC?.data || {}, [curCC]);
  const curSit  = curCC?.sittings || 0;

  const totalPapers  = useMemo(() => calcTotalPapers(curData), [curData]);
  const monthlyStats = useMemo(() =>
    MONTHS.map(m => ({ month: m, data: curData[m] || {}, total: calcMonthTotal(curData, m) })),
    [curData]
  );
  const maxVal = useMemo(() => Math.max(...monthlyStats.map(m => m.total), 1), [monthlyStats]);

  const handleSegmentClick = useCallback((month, category, papers) => {
    if (papers && papers.length > 0) setModalData({ month, category, papers });
  }, []);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (uploadedYears.length === 0) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16, padding:40, fontFamily:FONT }}>
      <div style={{ width:80, height:80, borderRadius:20, background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #e0e7ff" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div style={{ fontSize:18, fontWeight:700, color:"#1e293b" }}>No data loaded</div>
      <div style={{ fontSize:13, color:"#94a3b8", textAlign:"center", maxWidth:340, lineHeight:1.6 }}>
        Upload your Excel file in the <strong style={{ color:"#374151" }}>Tracker</strong> tab.
        Year is auto-detected from the filename or sheet tab name.
      </div>
    </div>
  );

  return (
    <div style={{ width:"100%", paddingBottom:48, fontFamily:FONT, position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes pulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.25); } 50% { box-shadow: 0 0 0 7px rgba(99,102,241,0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:none; } }
        .cc-stat-card {
          transition: transform 0.18s, box-shadow 0.18s;
          animation: fadeUp 0.35s ease both;
        }
        .cc-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.12) !important;
        }
        .cc-month-row {
          transition: background 0.15s, transform 0.15s;
        }
        .cc-month-row:hover {
          background: rgba(238,242,255,0.7) !important;
          transform: translateX(3px);
        }
        .cc-cat-chip {
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .cc-cat-chip:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }
        .cc-legend-pill {
          transition: transform 0.15s;
        }
        .cc-legend-pill:hover {
          transform: scale(1.05);
        }
      `}</style>

      {modalData && (
        <PaperModal
          month={modalData.month}
          category={modalData.category}
          papers={modalData.papers}
          onClose={closeModal}
          onJumpToTracker={jumpToTracker}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:"#1e293b", margin:"0 0 4px 0", letterSpacing:"-0.02em" }}>
          Contract Committee
        </h1>
        <p style={{ fontSize:13, color:"#94a3b8", margin:0 }}>Monthly sittings and papers by category</p>
      </div>

      {/* Year indicator — pulses gently to draw attention */}
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:28, background:"#eef2ff", borderRadius:12, padding:"8px 16px", border:"1px solid #e0e7ff", animation:"pulse 2.5s ease-in-out infinite" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#6366f1" }} />
        <span style={{ fontSize:13, fontWeight:700, color:"#4338ca", fontFamily:FONT }}>
          Viewing {curYear} — switch year from the top bar
        </span>
      </div>

      {/* Stat cards — shows this year's sittings AND the grand total across all years */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:28 }}>
        <div className="cc-stat-card" style={{ ...card, padding:"20px 22px", borderLeft:"3px solid #6366f1" }}>
          <div style={{ fontSize:11, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600, marginBottom:8 }}>
            Sittings · {curYear}
            <InfoTip text="Number of Contract Committee sittings in this year: the highest CC number in the Week column." />
          </div>
          <div style={{ fontSize:36, fontWeight:700, color:"#1e293b", fontFamily:FONT, lineHeight:1 }}>
            <AnimatedCount target={curSit} />
          </div>
          <div style={{ fontSize:11, color:"#cbd5e1", marginTop:6 }}>Highest CC number this year</div>
        </div>

        {uploadedYears.length > 1 && (
          <div className="cc-stat-card" style={{ ...card, padding:"20px 22px", borderLeft:"3px solid #8b5cf6" }}>
            <div style={{ fontSize:11, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600, marginBottom:8 }}>
              Total sittings · all years
              <InfoTip text="Each year's sittings added together. CC numbers restart every year, so this is the sum of the yearly numbers." />
            </div>
            <div style={{ fontSize:36, fontWeight:700, color:"#1e293b", fontFamily:FONT, lineHeight:1 }}>
              <AnimatedCount target={totalSittingsAllYears} />
            </div>
            <div style={{ fontSize:11, color:"#cbd5e1", marginTop:6 }}>
              {uploadedYears.map(y => `${y}: ${ccByYear[y]?.sittings || 0}`).join(" · ")}
            </div>
          </div>
        )}

        <div className="cc-stat-card" style={{ ...card, padding:"20px 22px", borderLeft:"3px solid #10b981" }}>
          <div style={{ fontSize:11, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600, marginBottom:8 }}>
            Papers presented · {curYear}
            <InfoTip text="Papers presented at Contract Committee this year: papers with a date and one of the 9 categories below. The same paper on the same date counts once. LOA, other paper types and papers without a date are not counted, so the Paper Trail total can be higher. This counts papers, not tenders; it is the same number as Papers on Overview." />
          </div>
          <div style={{ fontSize:36, fontWeight:700, color:"#1e293b", fontFamily:FONT, lineHeight:1 }}>
            <AnimatedCount target={totalPapers} />
          </div>
          <div style={{ fontSize:11, color:"#cbd5e1", marginTop:6 }}>All months combined</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ ...card, padding:"14px 20px", marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>Categories</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {CATS.map(cat => (
            <div key={cat} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:999, background:CAT_BG[cat] }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:CAT_COLORS[cat], flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:500, color:CAT_TEXT[cat] }}>{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly breakdown with bubble background */}
      <div style={{ ...card, padding:"22px 24px", position:"relative", overflow:"hidden" }}>
        <BubbleBackground />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:6 }}>
            Monthly breakdown · {curYear}
            <InfoTip text="Papers presented in each month, split by category. The month comes from the paper's date, and the numbers add up to Papers presented." />
          </div>
          <div style={{ fontSize:11, color:"#cbd5e1", marginBottom:18 }}>
            Click a coloured segment to see the papers behind it
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {monthlyStats.map(item => {
              const tot = CATS.reduce((s, c) => s + (item.data[c]?.length || 0), 0);
              return (
                <div key={item.month} className="cc-month-row"
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 10px", borderRadius:10, background:"rgba(247,249,250,0.85)", position:"relative" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#64748b", width:36, flexShrink:0 }}>{item.month}</span>
                  <div style={{ flex:1, height:26, borderRadius:6, background:"#f1f5f9", overflow:"hidden", display:"flex" }}>
                    {tot === 0
                      ? <div style={{ height:"100%", flex:1, display:"flex", alignItems:"center", paddingLeft:8 }}>
                          <span style={{ fontSize:10, color:"#cbd5e1" }}>—</span>
                        </div>
                      : CATS.map(cat => {
                          const list = item.data[cat] || [];
                          if (!list.length) return null;
                          return (
                            <div key={cat}
                              title={`${cat}: ${list.length} — click for details`}
                              onClick={() => handleSegmentClick(item.month, cat, list)}
                              style={{
                                width:`${(list.length / maxVal) * 100}%`, height:"100%",
                                background:CAT_COLORS[cat],
                                display:"flex", alignItems:"center", justifyContent:"center",
                                overflow:"hidden", cursor:"pointer", transition:"filter 0.15s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
                              onMouseLeave={e => e.currentTarget.style.filter = "none"}
                            >
                              <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{list.length}</span>
                            </div>
                          );
                        })
                    }
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e293b", width:28, textAlign:"right", flexShrink:0, fontFamily:FONT }}>
                    {tot}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Category totals */}
          <div style={{ marginTop:24, paddingTop:20, borderTop:"1px solid #f1f5f9" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#64748b", marginBottom:14 }}>
              Total per category · {curYear} — click to see all papers
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {CATS.map(cat => {
                const total = calcCatTotal(curData, cat);
                const allPapers = MONTHS.flatMap(m => curData[m]?.[cat] || []);
                return (
                  <div key={cat} className="cc-cat-chip"
                    onClick={() => total > 0 && setModalData({ month: String(curYear), category: cat, papers: allPapers })}
                    style={{
                      display:"flex", flexDirection:"column", alignItems:"center",
                      padding:"12px 16px", borderRadius:12, minWidth:72,
                      background:CAT_BG[cat], opacity: total === 0 ? 0.45 : 1,
                      cursor: total > 0 ? "pointer" : "default",
                    }}
                  >
                    <div style={{ fontSize:24, fontWeight:700, color:CAT_TEXT[cat], fontFamily:FONT, lineHeight:1 }}>
                      <AnimatedCount target={total} />
                    </div>
                    <div style={{ fontSize:10, fontWeight:600, color:CAT_COLORS[cat], marginTop:5, textAlign:"center" }}>{cat}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}