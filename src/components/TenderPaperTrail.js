import { useMemo, useState, useCallback, useEffect } from "react";
// Adjust this path to wherever canonicalHelpers.js actually sits relative
// to this file (it's expected at src/ root alongside mergeAllYears.js).
import { buildTenders, MILESTONES, ccPaperStats } from "../tenderModel";
import InfoTip from "./InfoTip";

// ── All paper types in order ──────────────────────────────────────────────────
const PAPER_TYPES = ["TP","CFT Issuance","TER","TCEAR","CTC","CTC(A&E)","CTC(ACV)","CE","Abort","LOA"];

// Milestone progression for the timeline track
// LOA (Letter of Award) is the FINAL phase of the basic flow.
// Amendments / change contract / extra cost come after it, outside this flow.

// LOA gets its own gold "spotlight" look so it stands out from every other paper.
const LOA_GRAD = "linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)";

const PT_COLORS = {
  "TP":"#6366f1","CFT Issuance":"#0ea5e9","TER":"#8b5cf6",
  "TCEAR":"#f97316","CTC":"#10b981","CTC(A&E)":"#f59e0b",
  "CTC(ACV)":"#ef4444","CE":"#22c55e","Abort":"#dc2626","LOA":"#f59e0b"
};
const PT_BG = {
  "TP":"#eef2ff","CFT Issuance":"#e0f2fe","TER":"#f3f0ff",
  "TCEAR":"#fff4ed","CTC":"#ecfdf5","CTC(A&E)":"#fefce8",
  "CTC(ACV)":"#fef2f2","CE":"#f0fdf4","Abort":"#fef2f2","LOA":"#fffbeb"
};
const PT_TEXT = {
  "TP":"#4338ca","CFT Issuance":"#0369a1","TER":"#6d28d9",
  "TCEAR":"#c2410c","CTC":"#047857","CTC(A&E)":"#92400e",
  "CTC(ACV)":"#991b1b","CE":"#15803d","Abort":"#991b1b","LOA":"#b45309"
};

function AwardIcon({ size = 16, color = "#ffffff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function fmt(d)      { if (!d) return null; return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function fmtShort(d) { if (!d) return null; return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}); }

// ── Design tokens ─────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid #f1f5f9",
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

// ── LOA spotlight banner ──────────────────────────────────────────────────────
function LoaSpotlight({ tenders }) {
  const total   = tenders.length;
  const awarded = tenders.filter(t => t.tStatus === "awarded");
  const count   = awarded.length;
  const has     = count > 0;
  const pct     = total ? Math.round((count / total) * 100) : 0;
  const withDays = awarded.filter(t => t.awardDays !== null);
  const avgDays  = withDays.length ? Math.round(withDays.reduce((s, t) => s + t.awardDays, 0) / withDays.length) : null;
  const recent   = [...awarded].filter(t => t.loaDate).sort((a, b) => b.loaDate - a.loaDate).slice(0, 3);

  return (
    <div style={{
      position: "relative", overflow: "hidden", padding: "18px 20px",
      background: has ? "linear-gradient(135deg,#fffbeb 0%,#fef3c7 55%,#fde68a 100%)" : "linear-gradient(135deg,#fffdf7,#fffbeb)",
      borderBottom: "1px solid #fde68a",
    }}>
      <div style={{ position: "absolute", right: -50, top: -50, width: 190, height: 190, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(245,158,11,0.24) 0%, transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{
          width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: has ? LOA_GRAD : "#ffffff",
          border: has ? "none" : "2px dashed #fcd34d",
          boxShadow: has ? "0 6px 18px rgba(245,158,11,0.45), 0 0 0 5px rgba(245,158,11,0.16)" : "none",
        }}>
          <AwardIcon size={27} color={has ? "#ffffff" : "#fbbf24"} />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 800, color: "#b45309", textTransform: "uppercase" }}>
            Letter of Award · Final Phase
          </div>
          {has ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#92400e", lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#b45309" }}>
                  of {total} tender{total !== 1 ? "s" : ""} awarded · {pct}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(180,83,9,0.14)", overflow: "hidden", marginTop: 10, maxWidth: 360 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: LOA_GRAD, borderRadius: 999, transition: "width 0.6s ease" }} />
              </div>
              {avgDays !== null && (
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 7, fontWeight: 600 }}>
                  Average {avgDays} days from first paper to award
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#92400e", marginTop: 3 }}>No Letters of Award yet</div>
              <div style={{ fontSize: 12, color: "#b45309", marginTop: 3, lineHeight: 1.5 }}>
                LOA is the finish line. Tenders will light up here as soon as their award is submitted.
              </div>
            </>
          )}
        </div>

        {recent.length > 0 && (
          <div style={{ minWidth: 200, maxWidth: 280, flex: "0 1 260px" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", fontWeight: 800, color: "#b45309", textTransform: "uppercase", marginBottom: 6 }}>
              Latest awards
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {recent.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid #fde68a" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: "#78350f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title || t.no}
                  </span>
                  <span style={{ fontSize: 10, color: "#b45309", fontWeight: 600, flexShrink: 0 }}>{fmtShort(t.loaDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary panel ─────────────────────────────────────────────────────────────
function PaperTrailSummary({ tenders }) {
  const [activeTab,   setActiveTab]   = useState("papertype");
  const [ctcSummaryOpen, setCtcSummaryOpen] = useState(false);
  const [hoveredDept, setHoveredDept] = useState(null);

  const total    = tenders.length;
  const awardedCount = tenders.filter(t => t.tStatus === "awarded").length;
  const ongoing  = tenders.filter(t => t.tStatus === "ongoing").length;
  const pending  = tenders.filter(t => t.tStatus === "pending").length;
  const aborted  = tenders.filter(t => t.tStatus === "abort").length;
  const cc       = ccPaperStats(tenders);

  // CTC(A&E) and CTC(ACV) are variants of CTC, not separate top-level stages —
  // fold them into CTC's row as nested children, hidden behind a toggle.
  const CTC_VARIANTS = ["CTC(A&E)", "CTC(ACV)"];
  const TOP_LEVEL_TYPES = PAPER_TYPES.filter(pt => !CTC_VARIANTS.includes(pt));

  const ptCounts = TOP_LEVEL_TYPES.map(pt => {
    const count = tenders.reduce((s, t) => s + t.papers.filter(p => p.type === pt).length, 0);
    if (pt === "CTC") {
      const variants = CTC_VARIANTS.map(v => ({
        pt: v,
        count: tenders.reduce((s, t) => s + t.papers.filter(p => p.type === v).length, 0)
      })).filter(v => v.count > 0);
      return { pt, count, variants };
    }
    return { pt, count, variants: [] };
  }).filter(x => x.pt === "LOA" || x.count > 0 || x.variants.some(v => v.count > 0));
  const totalPapers = ptCounts.reduce((s, x) => s + x.count + x.variants.reduce((vs, v) => vs + v.count, 0), 0);

  const deptMap = {};
  tenders.forEach(t => { const d = t.dept || "Unknown"; deptMap[d] = (deptMap[d] || 0) + 1; });
  const depts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
  const deptColors = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#f97316","#ef4444","#22c55e","#8b5cf6"];

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={{
      padding: "6px 14px", fontSize: 12,
      fontWeight: activeTab === id ? 600 : 400,
      borderRadius: 999, border: "none", cursor: "pointer",
      background: activeTab === id ? "#6366f1" : "transparent",
      color: activeTab === id ? "#ffffff" : "#64748b",
      transition: "all 0.15s", fontFamily: "Roboto, Arial, sans-serif",
    }}>{label}</button>
  );

  return (
    <div style={{ ...card, overflow: "hidden", marginBottom: 20 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #312e81 100%)", padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#93c5fd", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, fontFamily: "Roboto, Arial" }}>
              Paper Trail Summary
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", fontFamily: "Roboto, Arial" }}>
              {total} Tender{total !== 1 ? "s" : ""}
              <InfoTip text="Number of different tenders (one per Tender No). This counts tenders, not papers. One tender can have many papers." color="rgba(255,255,255,0.6)" size={15} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { l:"Awarded",  v:awardedCount, bg:"rgba(245,158,11,0.30)", c:"#fcd34d", info:"Tenders that have a Letter of Award (LOA), the final phase." },
              { l:"Ongoing",  v:ongoing,  bg:"rgba(0,155,255,0.25)",  c:"#93c5fd", info:"Tenders with at least one dated paper, no Letter of Award, and whose latest paper is not an Abort. The Overview page uses the same rule and shows the same number." },
              { l:"Pending",  v:pending,  bg:"rgba(255,255,255,0.1)", c:"#e2e8f0", info:"Tenders that have papers but no dated paper yet, and no Letter of Award." },
              ...(aborted > 0 ? [{ l:"Aborted", v:aborted, bg:"rgba(237,0,0,0.2)", c:"#fca5a5", info:"Tenders whose latest dated paper is an Abort." }] : []),
            ].map(({ l, v, bg, c, info }) => (
              <div key={l} style={{ background: bg, borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{l}<InfoTip text={info} color="rgba(255,255,255,0.6)" size={12} /></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>TENDERS ACTIVE (NOT PENDING, NOT ABORTED)</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{total ? Math.round((ongoing / total) * 100) : 0}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 999, width: `${total ? (ongoing / total) * 100 : 0}%`, background: "linear-gradient(90deg,#10b981,#6366f1)", transition: "width 0.6s ease" }} />
          </div>
        </div>
      </div>

      {/* LOA spotlight — the final phase, always the first thing you see */}
      <LoaSpotlight tenders={tenders} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "12px 16px 0", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "#f7f9fa", borderRadius: 999 }}>
          {tabBtn("papertype",   "Paper Types")}
          {tabBtn("departments", "Departments")}
        </div>
      </div>

      {/* Paper Types tab */}
      {activeTab === "papertype" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 500, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            Papers submitted per category · {totalPapers} total across {total} tenders
            <InfoTip text="Every paper of every type, including Letters of Award and papers without a date. The same paper type on the same date for the same tender is counted once. The part presented at Contract Committee (dated papers of the 9 CC types) is the number shown on Overview and the Contract Committee page." />
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>
            {cc.total} presented at Contract Committee · {cc.loa} LOA · {cc.undated} without a date{cc.other > 0 ? ` · ${cc.other} of other types (not listed below)` : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ptCounts.map(({ pt, count, variants }) => {
              const hasVariants = variants && variants.length > 0;

              // LOA row — same list as the other phases, but gold and larger
              if (pt === "LOA") {
                return (
                  <div key={pt} style={{
                    padding: "12px 14px", borderRadius: 12, marginTop: 4,
                    background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                    border: "1px solid #fde68a", boxShadow: "0 4px 14px rgba(245,158,11,0.18)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AwardIcon size={15} color="#d97706" />
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>LOA</span>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "#b45309", background: "#fde68a", borderRadius: 999, padding: "2px 8px" }}>FINAL PHASE</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#92400e", fontFamily: "monospace" }}>{count}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: "rgba(180,83,9,0.14)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${totalPapers ? (count / totalPapers) * 100 : 0}%`, minWidth: count > 0 ? 6 : 0, background: LOA_GRAD, borderRadius: 999, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={pt}>
                  <div
                    onClick={hasVariants ? () => setCtcSummaryOpen(o => !o) : undefined}
                    title={hasVariants ? `${variants.reduce((s, v) => s + v.count, 0)} variant paper(s) under CTC — click to ${ctcSummaryOpen ? "hide" : "view"}` : undefined}
                    style={{ padding: "10px 12px", borderRadius: 10, background: "#f7f9fa", cursor: hasVariants ? "pointer" : "default" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: PT_COLORS[pt] || "#94a3b8" }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: PT_TEXT[pt] || "#374151" }}>{pt}</span>
                        {hasVariants && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={PT_COLORS[pt] || "#94a3b8"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: ctcSummaryOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", marginLeft: 2 }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>{count}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / totalPapers) * 100}%`, background: PT_COLORS[pt] || "#94a3b8", borderRadius: 999, transition: "width 0.5s ease" }} />
                    </div>
                  </div>

                  {/* Nested CTC(A&E) / CTC(ACV) — hidden unless toggled open */}
                  {hasVariants && ctcSummaryOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, marginLeft: 18, paddingLeft: 12, borderLeft: "2px solid #e2e8f0" }}>
                      {variants.map(({ pt: vpt, count: vcount }) => (
                        <div key={vpt} style={{ padding: "8px 12px", borderRadius: 10, background: "#f1f5f9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: PT_COLORS[vpt] || "#94a3b8" }} />
                              <span style={{ fontSize: 11, fontWeight: 500, color: PT_TEXT[vpt] || "#374151" }}>{vpt}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>{vcount}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(vcount / totalPapers) * 100}%`, background: PT_COLORS[vpt] || "#94a3b8", borderRadius: 999, transition: "width 0.5s ease" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Departments tab */}
      {activeTab === "departments" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14, fontWeight: 500 }}>Tenders by User's Department</div>
          {depts.length === 0 || (depts.length === 1 && depts[0][0] === "Unknown") ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 24 }}>No department data found.</div>
          ) : (
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                <svg width="110" height="110" viewBox="0 0 110 110">
                  {(() => {
                    let offset = 0;
                    const circ = 2 * Math.PI * 36;
                    return depts.map(([name, count], i) => {
                      const pct = count / total, dash = pct * circ, gap = circ - dash;
                      const el = (
                        <circle key={name} cx="55" cy="55" r="36" fill="none"
                          stroke={deptColors[i % deptColors.length]}
                          strokeWidth={hoveredDept === name ? 17 : 13}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={-offset * circ}
                          transform="rotate(-90 55 55)"
                          style={{ transition: "stroke-width 0.15s", cursor: "pointer" }}
                          onMouseEnter={() => setHoveredDept(name)}
                          onMouseLeave={() => setHoveredDept(null)}
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                  <text x="55" y="51" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">{total}</text>
                  <text x="55" y="63" textAnchor="middle" fontSize="8" fill="#94a3b8">tenders</text>
                </svg>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                {depts.map(([name, count], i) => (
                  <div key={name}
                    onMouseEnter={() => setHoveredDept(name)}
                    onMouseLeave={() => setHoveredDept(null)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 8, cursor: "default", background: hoveredDept === name ? "#f0f7ff" : "transparent", transition: "background 0.15s" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: deptColors[i % deptColors.length] }} />
                    <div style={{ flex: 1, fontSize: 12, color: "#374151", fontWeight: hoveredDept === name ? 600 : 400 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", background: "#f7f9fa", borderRadius: 999, padding: "1px 7px" }}>{count}</div>
                    <div style={{ width: 44, height: 4, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / total) * 100}%`, background: deptColors[i % deptColors.length], borderRadius: 999 }} />
                    </div>
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

// ── Tender Card ───────────────────────────────────────────────────────────────
function TenderCard({ tender, isOpen, onToggleDetail }) {
  const { no, title, buyer, user, dept, week, status, papers, msMap, ctcVariants, earliest, latest, totalDays, tStatus, currentStage, loaDate, awardDays } = tender;
  const isAwarded = tStatus === "awarded";
  const [ctcOpen, setCtcOpen] = useState(false);

  const durColor = tStatus === "abort" ? "#dc2626" : isAwarded ? "#b45309" : tStatus === "ongoing" ? "#6366f1" : "#94a3b8";
  const durText  = isAwarded
    ? (awardDays !== null ? `${awardDays} days to award` : "Awarded")
    : totalDays !== null ? `${totalDays} days` : tStatus === "pending" ? "No dates yet" : "In progress";
  const durRange = isAwarded
    ? (earliest && loaDate ? ` (${fmt(earliest)} → ${fmt(loaDate)})` : "")
    : (earliest && latest ? ` (${fmt(earliest)} → ${fmt(latest)})` : "");

  // Status badge now shows the actual current stage rather than a fixed
  // "Complete" label — colour comes from that stage's own PT colour.
  const statusBadge = tStatus === "pending"
    ? { label: "Pending", bg: "#f1f5f9", color: "#64748b" }
    : tStatus === "abort"
      ? { label: "Aborted", bg: PT_BG["Abort"], color: PT_TEXT["Abort"] }
      : isAwarded
      ? { label: loaDate ? `★ Awarded · ${fmtShort(loaDate)}` : "★ Awarded", bg: "linear-gradient(135deg,#fde68a,#fbbf24)", color: "#78350f" }
      : { label: `Current: ${currentStage}`, bg: PT_BG[currentStage] || "#dbeafe", color: PT_TEXT[currentStage] || "#1e40af" };

  const Detail = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
      <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{
      ...card, marginBottom: 10, overflow: "hidden",
      ...(isAwarded ? { border: "1px solid #fde68a", boxShadow: "inset 4px 0 0 #f59e0b, 0 4px 16px rgba(245,158,11,0.16)" } : {}),
    }}>
      <div style={{ padding: "14px 16px 12px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title || no}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{no}</div>
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
              {dept && (
                <span style={{ fontSize: 10, background: "#eef2ff", color: "#4338ca", borderRadius: 999, padding: "2px 8px", fontWeight: 500 }}>
                  {dept}
                </span>
              )}
              {user && (
                <span style={{ fontSize: 10, background: "#f7f9fa", color: "#64748b", borderRadius: 999, padding: "2px 8px", fontWeight: 500 }}>
                  {user}
                </span>
              )}
              <span style={{ fontSize: 10, borderRadius: 999, padding: "2px 8px", fontWeight: 600, background: statusBadge.bg, color: statusBadge.color }}>
                {statusBadge.label}
              </span>
            </div>
          </div>
          <button onClick={onToggleDetail} style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            border: "1px solid #e2e8f0", background: isOpen ? "#f0f7ff" : "#f7f9fa",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#6366f1", fontWeight: 700,
          }}>{isOpen ? "×" : "i"}</button>
        </div>

        {/* Paper type pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {papers.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 999,
              background: p.type === "LOA" ? LOA_GRAD : (PT_BG[p.type] || "#f7f9fa"),
              fontSize: 10, fontWeight: p.type === "LOA" ? 800 : 500, color: p.type === "LOA" ? "#78350f" : (PT_TEXT[p.type] || "#374151"),
              boxShadow: p.type === "LOA" ? "0 2px 8px rgba(245,158,11,0.4)" : p.type === currentStage ? `0 0 0 1.5px ${PT_COLORS[p.type] || "#6366f1"}` : "none",
            }}>
              <span>{p.type === "LOA" ? "★ LOA" : p.type}</span>
              {p.date && <span style={{ opacity: 0.65 }}>· {fmtShort(p.date)}</span>}
            </div>
          ))}
        </div>

        {/* Milestone track — each stage coloured by its own category colour.
            The dot matching the tender's current (latest-dated) stage gets
            the pulse ring, instead of relying on a "complete" flag. */}
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {MILESTONES.map((m, i) => {
            const reached  = !!msMap[m];
            const isCurrent = reached && m === currentStage;
            const nextMs   = MILESTONES[i + 1];
            const connFill = reached && nextMs && !!msMap[nextMs];
            const isLOA = m === "LOA";
            const dotColor = reached ? (PT_COLORS[m] || "#6366f1") : isLOA ? "#fcd34d" : "#e2e8f0";
            const shortLabel = m === "CFT Issuance" ? "CFT" : m;
            const isCTC = m === "CTC";
            const hasVariants = isCTC && ctcVariants && ctcVariants.length > 0;

            return (
              <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: i < MILESTONES.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%", height: 24 }}>
                  {isLOA ? (
                    <div
                      title={reached ? `Letter of Award${msMap[m] ? " · " + fmt(msMap[m]) : ""}` : "Letter of Award — final phase, not reached yet"}
                      style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: reached ? LOA_GRAD : "#ffffff",
                        border: reached ? "2px solid #fde68a" : "2px dashed #fcd34d",
                        boxShadow: reached ? "0 0 0 4px rgba(245,158,11,0.22), 0 4px 12px rgba(245,158,11,0.45)" : "none",
                        animation: reached ? "loaGlow 2.4s ease-in-out infinite" : "none",
                      }}
                    >
                      <AwardIcon size={13} color={reached ? "#ffffff" : "#fcd34d"} />
                    </div>
                  ) : (
                  <div
                    onClick={hasVariants ? () => setCtcOpen(o => !o) : undefined}
                    title={hasVariants ? `${ctcVariants.length} CTC variant paper${ctcVariants.length !== 1 ? "s" : ""} — click to ${ctcOpen ? "hide" : "view"}` : undefined}
                    style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                      border: `2px solid ${dotColor}`,
                      background: reached ? dotColor : "#ffffff",
                      boxShadow: isCurrent ? `0 0 0 3px ${dotColor}28` : hasVariants ? `0 0 0 3px ${dotColor}18` : "none",
                      transition: "all 0.2s",
                      cursor: hasVariants ? "pointer" : "default",
                    }}
                  />
                  )}
                  {i < MILESTONES.length - 1 && (
                    <div style={{
                      flex: 1, height: 2,
                      background: connFill ? (nextMs === "LOA" ? `linear-gradient(90deg, ${dotColor}, #f59e0b)` : dotColor) : "#f1f5f9",
                      transition: "background 0.2s",
                    }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 5, width: "100%" }}>
                  <span
                    onClick={hasVariants ? () => setCtcOpen(o => !o) : undefined}
                    style={{
                      fontSize: isLOA ? 10 : 9, fontWeight: isLOA ? 800 : 700,
                      color: reached ? (isLOA ? "#b45309" : dotColor) : isLOA ? "#fbbf24" : "#cbd5e1",
                      textAlign: "center", fontFamily: "'Nunito', Arial, sans-serif",
                      cursor: hasVariants ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: 2,
                    }}>
                    {shortLabel}
                    {hasVariants && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={dotColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: ctcOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontSize: 9, color: reached ? (isLOA ? "#b45309" : "#64748b") : isLOA ? "#fcd34d" : "#e2e8f0",
                    marginTop: 2, textAlign: "center",
                    fontStyle: reached ? "normal" : "italic",
                    fontFamily: "'Nunito Sans', Arial, sans-serif",
                  }}>
                    {msMap[m] ? fmtShort(msMap[m]) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTC variants toggle — CTC(A&E) and CTC(ACV) live under the CTC milestone */}
        {ctcVariants && ctcVariants.length > 0 && ctcOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "#f7f9fa" }}>
            {ctcVariants.map((v, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 999,
                background: PT_BG[v.type] || "#f7f9fa",
                fontSize: 10, fontWeight: 600, color: PT_TEXT[v.type] || "#374151",
              }}>
                <span>{v.type}</span>
                {v.date && <span style={{ opacity: 0.65 }}>· {fmtShort(v.date)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duration footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderTop: "1px solid #f1f5f9", background: "#f7f9fa" }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>Duration{durRange}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: durColor }}>{durText}</span>
      </div>

      {/* Detail panel */}
      {isOpen && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 16px", background: "#f7f9fa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Detail label="Tender No." value={no} />
            <Detail label="Week"       value={week} />
            <Detail label="Presenter"  value={tender.people && tender.people.length ? tender.people.join(", ") : buyer} />
            <Detail label="User"       value={user} />
            <Detail label="Department" value={dept} />
            <Detail label="Status"     value={status} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontFamily: "Roboto, Arial" }}>
              All papers submitted
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {papers.map((p, i) => (
                <div key={i} style={{
                  padding: "6px 10px", borderRadius: 10,
                  background: PT_BG[p.type] || "#f7f9fa",
                  border: `1px solid ${PT_COLORS[p.type] || "#e2e8f0"}30`,
                  minWidth: 90,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: PT_TEXT[p.type] || "#94a3b8" }}>{p.type || "—"}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: p.date ? "#1e293b" : "#94a3b8", fontStyle: p.date ? "normal" : "italic" }}>
                    {p.date ? fmt(p.date) : "No date"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function TenderPaperTrail({ data, initialSearch = "", initialOpenKey = null }) {
  const [search,  setSearch]  = useState(initialSearch);
  const [statusF, setStatusF] = useState("all");
  const [openMap, setOpenMap] = useState(initialOpenKey ? { [initialOpenKey]: true } : {});

  // Sync if the parent sends a new search term (e.g. clicking from Overview)
  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (initialOpenKey) setOpenMap(prev => ({ ...prev, [initialOpenKey]: true }));
  }, [initialOpenKey]);

  const tenders  = useMemo(() => buildTenders(data || []), [data]);
  const filtered = useMemo(() => tenders.filter(t => {
    const q = search.toLowerCase();
    const matchesPaperType = t.papers.some(p => p.type && p.type.toLowerCase().includes(q));
    return (
      (!q || t.title.toLowerCase().includes(q) || t.no.toLowerCase().includes(q) ||
             t.user.toLowerCase().includes(q)   || t.dept.toLowerCase().includes(q) ||
             t.buyer.toLowerCase().includes(q)  || (t.people || []).some(n => n.toLowerCase().includes(q)) || matchesPaperType) &&
      (statusF === "all" || t.tStatus === statusF)
    );
  }), [tenders, search, statusF]);

  const toggleDetail = useCallback((key) => {
    setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!data || data.length === 0) return (
    <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#ffffff", borderRadius: 16, border: "1px solid #f1f5f9" }}>
      Upload your Excel to see the paper trail
    </div>
  );

  const filterBtn = (val, label, gold) => (
    <button onClick={() => setStatusF(val)} style={{
      padding: "5px 12px", fontSize: 12, borderRadius: 999, border: "none", cursor: "pointer",
      background: statusF === val ? (gold ? LOA_GRAD : "#6366f1") : "#f7f9fa",
      color: statusF === val ? (gold ? "#78350f" : "#ffffff") : gold ? "#b45309" : "#64748b",
      fontWeight: statusF === val ? 600 : 400,
      transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div>
      <style>{`@keyframes loaGlow {
        0%,100% { box-shadow: 0 0 0 4px rgba(245,158,11,0.22), 0 4px 12px rgba(245,158,11,0.45); }
        50%     { box-shadow: 0 0 0 8px rgba(245,158,11,0.10), 0 4px 16px rgba(245,158,11,0.55); }
      }`}</style>
      <PaperTrailSummary tenders={tenders} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search tender, no., user, dept, presenter..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180, padding: "8px 14px", fontSize: 13,
            border: "1px solid #e2e8f0", borderRadius: 999, outline: "none",
            background: "#ffffff", color: "#1e293b", fontFamily: "Roboto, Arial",
          }}
        />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", background: "#f7f9fa", borderRadius: 999, padding: 3 }}>
          {filterBtn("all",      "All")}
          {filterBtn("awarded",  "★ Awarded", true)}
          {filterBtn("ongoing",  "Ongoing")}
          {filterBtn("pending",  "Pending")}
          {filterBtn("abort",    "Aborted")}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
        Showing {filtered.length} of {tenders.length} tenders
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#ffffff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
          No tenders match your filter
        </div>
      ) : (
        filtered.map(t => {
          const key = t.no || t.title;
          return <TenderCard key={key} tender={t} isOpen={!!openMap[key]} onToggleDetail={() => toggleDetail(key)} />;
        })
      )}
    </div>
  );
}