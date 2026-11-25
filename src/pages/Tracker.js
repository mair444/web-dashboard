import { useState } from "react";
import TenderPaperTrail from "../components/TenderPaperTrail";
import { mergeAllYears } from "../mergeAllYears";

// Data loading now happens ONCE at the App root (see App.js) so every page
// has data immediately, regardless of which page is opened first. This
// component just displays it and offers a Refresh button that calls back
// up to the shared loader.
export default function Tracker({
  config = [],
  yearFiles = {},
  setYearFiles,
  pendingSearch = "",
  activeYear,
  showAllYears = false,
  dataStatus = "loading",
  dataWarnings = [],
  setDataWarnings,
  dataFileName,
  dataLastUpdated,
  onRefresh,
}) {
  const [showHiddenDuplicates, setShowHiddenDuplicates] = useState(false);

  const removeYear = (year) => {
    setYearFiles(prev => { const n = { ...prev }; delete n[year]; return n; });
  };

  const uploadedYears = Object.keys(yearFiles).map(Number).sort((a, b) => a - b);

  const allYearsMerge = showAllYears ? mergeAllYears(uploadedYears, yearFiles) : null;
  const hiddenDuplicateCount = allYearsMerge ? allYearsMerge.hiddenRows.length : 0;

  const displayRows = (() => {
    if (showAllYears) {
      return showHiddenDuplicates
        ? [...allYearsMerge.visibleRows, ...allYearsMerge.hiddenRows]
        : allYearsMerge.visibleRows;
    }
    if (activeYear && yearFiles[activeYear]) return yearFiles[activeYear].rows;
    return config;
  })();

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Connection status bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        background: "#ffffff", borderRadius: 14, padding: "14px 18px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.04)", flexWrap: "wrap",
      }}>
        {dataStatus === "loaded" && (
          <>
            <div style={{
              padding: "8px 14px", background: "#eef2ff", color: "#6366f1",
              borderRadius: 999, fontWeight: 700, fontSize: 12,
            }}>
              ● Live from server: {dataFileName}
            </div>
            <button onClick={onRefresh} style={{
              padding: "8px 14px", background: "#f3f4f6", borderRadius: 999,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>Refresh</button>
            {dataLastUpdated && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                Last updated: {dataLastUpdated.toLocaleTimeString()} · {config.length} rows
              </div>
            )}
          </>
        )}
        {dataStatus === "loading" && (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading MOM Master List…</div>
        )}
        {dataStatus === "error" && (
          <>
            <div style={{ fontSize: 12, color: "#dc2626" }}>Couldn't load data — see details below</div>
            <button onClick={onRefresh} style={{
              padding: "8px 14px", background: "#fee2e2", color: "#dc2626",
              borderRadius: 999, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>Retry</button>
          </>
        )}
      </div>

      {/* ── Warnings ── */}
      {dataWarnings.length > 0 && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {dataWarnings.map((w, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "#fff7ed", border: "1px solid #fed7aa",
              borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#9a3412",
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span style={{ flex: 1 }}>{w}</span>
              <button
                onClick={() => setDataWarnings(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9a3412", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Loaded files ── */}
      {uploadedYears.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Loaded years
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {uploadedYears.map(year => {
              const f = yearFiles[year];
              return (
                <div key={year} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#ffffff", border: "1px solid #e2e8f0",
                  borderRadius: 10, padding: "6px 12px", fontSize: 12,
                }}>
                  <span style={{
                    background: "linear-gradient(90deg,#009bff,#4632ff)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    fontWeight: 700, fontSize: 11,
                  }}>{year}</span>
                  <span style={{ color: "#374151", fontWeight: 500 }}>{f.fileName}</span>
                  <span style={{ color: "#94a3b8" }}>· {f.rows.length} rows</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeYear(year); }}
                    title="Remove from this view only — refresh to reload from server"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 15, lineHeight: 1, padding: "0 2px" }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12, fontFamily: "'Nunito', Arial, sans-serif" }}>
        Source: MasterTrack backend server{displayRows.length > 0 ? ` — ${displayRows.length} records · ${showAllYears ? "All years" : activeYear || "—"}` : ""}
      </p>

      {showAllYears && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: 12,
          padding: "10px 14px", fontFamily: "'Nunito', Arial, sans-serif",
        }}>
          <span style={{ fontSize: 12, color: "#4338ca", flex: 1 }}>
            {hiddenDuplicateCount > 0
              ? <>2024 only shows TP papers in this view · {hiddenDuplicateCount} older completed paper{hiddenDuplicateCount !== 1 ? "s" : ""} {showHiddenDuplicates ? "shown" : "hidden"} to avoid duplicate finished tenders</>
              : "2024 only shows TP papers in this view, so it can be connected to later years without its full old history"}
          </span>
          {hiddenDuplicateCount > 0 && (
            <button
              onClick={() => setShowHiddenDuplicates(s => !s)}
              style={{
                fontSize: 12, fontWeight: 600, color: "#fff", background: "#6366f1",
                border: "none", borderRadius: 999, padding: "6px 14px", cursor: "pointer",
                flexShrink: 0, fontFamily: "'Nunito', Arial, sans-serif",
              }}
            >
              {showHiddenDuplicates ? "Hide duplicates" : `Show ${hiddenDuplicateCount} hidden`}
            </button>
          )}
        </div>
      )}

      <TenderPaperTrail data={displayRows} initialSearch={pendingSearch} />
    </div>
  );
}