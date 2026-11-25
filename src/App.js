import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Tracker from "./pages/Tracker";
import ContractCommittee from "./pages/ContractCommittee";
import { setNameSource } from "./tenderModel";

const QUOTES = [
  "Great things never come from comfort zones.",
  "Progress, not perfection.",
  "Every expert was once a beginner.",
  "Discipline is the bridge between goals and accomplishment.",
  "Small steps every day lead to big results.",
  "Focus on what you can control.",
  "Clarity comes from action, not thought.",
  "The best time to start was yesterday. The next best time is now.",
  "Work hard in silence, let results make the noise.",
  "Build something you're proud of.",
  "Consistency beats intensity.",
  "Earned, not given.",
  "Do it with intention.",
  "One task at a time. One day at a time.",
  "Stay the course.",
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

function GlassBackground() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&family=Nunito+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Nunito Sans', 'Nunito', Arial, sans-serif; }
        @keyframes floatA {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-60px) scale(1.08); }
          66% { transform: translate(-30px,40px) scale(0.95); }
        }
        @keyframes floatB {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(-50px,30px) scale(1.05); }
          70% { transform: translate(60px,-40px) scale(0.92); }
        }
        @keyframes floatC {
          0%,100% { transform: translate(0,0) scale(1); }
          30% { transform: translate(30px,50px) scale(1.06); }
          60% { transform: translate(-40px,-30px) scale(0.94); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        /* Dark mode: the whole page is inverted, then pictures and items marked
           "mt-keep" are turned back so their own colours are kept. */
        html.mt-dark { filter: invert(0.92) hue-rotate(180deg); background: #ffffff; }
        html.mt-dark img, html.mt-dark video, html.mt-dark canvas, html.mt-dark .mt-keep {
          filter: hue-rotate(180deg) invert(1) contrast(1.19);
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, overflow: "hidden",
        background: "linear-gradient(150deg, #f8faff 0%, #f7f9fa 45%, #f5f8ff 75%, #f9faff 100%)",
        pointerEvents: "none",
      }}>
        {[
          { w:480, h:480, top:"-8%",  left:"-6%",  anim:"floatA 20s ease-in-out infinite", delay:"0s",
            bg:"radial-gradient(circle, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.03) 60%, transparent 80%)" },
          { w:380, h:380, top:"52%",  left:"62%",  anim:"floatB 24s ease-in-out infinite", delay:"-8s",
            bg:"radial-gradient(circle, rgba(20,184,166,0.06) 0%, rgba(6,182,212,0.02) 60%, transparent 80%)" },
          { w:320, h:320, top:"18%",  left:"68%",  anim:"floatC 17s ease-in-out infinite", delay:"-5s",
            bg:"radial-gradient(circle, rgba(99,102,241,0.05) 0%, rgba(59,130,246,0.02) 60%, transparent 80%)" },
          { w:260, h:260, top:"72%",  left:"8%",   anim:"floatA 22s ease-in-out infinite", delay:"-11s",
            bg:"radial-gradient(circle, rgba(20,184,166,0.05) 0%, transparent 70%)" },
          { w:200, h:200, top:"8%",   left:"42%",  anim:"floatB 27s ease-in-out infinite", delay:"-15s",
            bg:"radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)" },
        ].map((b, i) => (
          <div key={i} style={{
            position: "absolute", width: b.w, height: b.h,
            top: b.top, left: b.left, borderRadius: "50%",
            background: b.bg, animation: b.anim, animationDelay: b.delay, filter: "blur(1px)",
          }} />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)" }} />
      </div>
    </>
  );
}

function ThemeSwitch({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button onClick={onToggle} role="switch" aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "relative", width: 58, height: 28, borderRadius: 999, flexShrink: 0, cursor: "pointer",
        border: "1px solid " + (dark ? "#4338ca" : "#e2e8f0"),
        background: dark ? "#312e81" : "#f1f5f9", padding: 0, transition: "background 0.2s",
      }}>
      <span style={{ position: "absolute", left: 8, top: 5, fontSize: 13, lineHeight: "18px" }}>☀️</span>
      <span style={{ position: "absolute", right: 8, top: 5, fontSize: 13, lineHeight: "18px" }}>🌙</span>
      <span style={{
        position: "absolute", top: 2, left: dark ? 31 : 2, width: 22, height: 22, borderRadius: "50%",
        background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.2s",
      }} />
    </button>
  );
}

function QuoteBar({ uploadedYears, activeYear, setActiveYear, showAllYears, setShowAllYears, dataStatus, onRefresh, dataFileName, dataLastUpdated, theme, onToggleTheme }) {
  const quote = getDailyQuote();

  const selectYear = (y) => { setShowAllYears(false); setActiveYear(y); };
  const selectAll  = ()  => { setShowAllYears(true); };

  return (
    <div style={{
      position: "relative", zIndex: 10,
      background: "#ffffff",
      borderBottom: "1px solid #f1f5f9",
      padding: "8px 28px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {/* Year switcher — global, always visible when files loaded */}
      {uploadedYears.length > 0 && (
        <div style={{ display: "flex", gap: 4, background: "#f7f9fa", borderRadius: 999, padding: 3, border: "1px solid #f1f5f9", flexShrink: 0 }}>
          {uploadedYears.map(y => (
            <button key={y} onClick={() => selectYear(y)} style={{
              padding: "4px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              background: !showAllYears && activeYear === y ? "#6366f1" : "transparent",
              color: !showAllYears && activeYear === y ? "#ffffff" : "#64748b",
              fontWeight: !showAllYears && activeYear === y ? 700 : 500,
              fontSize: 12, fontFamily: "'Nunito', Arial, sans-serif",
              transition: "all 0.15s",
            }}>{y}</button>
          ))}
          {uploadedYears.length > 1 && (
            <button onClick={selectAll} title="Combine same paper across every uploaded year — Overview & Tracker only" style={{
              padding: "4px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              background: showAllYears ? "#10b981" : "transparent",
              color: showAllYears ? "#ffffff" : "#64748b",
              fontWeight: showAllYears ? 700 : 500,
              fontSize: 12, fontFamily: "'Nunito', Arial, sans-serif",
              transition: "all 0.15s",
            }}>All</button>
          )}
        </div>
      )}

      {/* Quote — centered in remaining space */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Nunito', Arial, sans-serif", fontWeight: 700, color: "#6366f1" }}>✦ today</span>
        <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", fontFamily: "'Nunito Sans', Arial, sans-serif" }}>"{quote}"</span>
      </div>

      {/* Data connection status — global, visible on every page */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {dataStatus === "loaded" && (
          <>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0,
            }} title={`Live from server: ${dataFileName || ""}`} />
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Nunito', Arial, sans-serif" }}>
              {dataFileName} {dataLastUpdated ? `· ${dataLastUpdated.toLocaleTimeString()}` : ""}
            </span>
          </>
        )}
        {dataStatus === "loading" && (
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Loading…</span>
        )}
        {dataStatus === "error" && (
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "#dc2626", flexShrink: 0,
          }} title="Couldn't reach the backend server" />
        )}
        <button onClick={onRefresh} title="Refresh from MOM Master List" style={{
          background: "none", border: "1px solid #e2e8f0", borderRadius: 999,
          padding: "3px 10px", fontSize: 11, color: "#64748b", cursor: "pointer",
          fontFamily: "'Nunito', Arial, sans-serif",
        }}>↻</button>
        <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
      </div>
    </div>
  );
}

// Backend server that reads MOM Master List directly off disk.
// See /server/server.js — must be running (npm start inside /server) for
// this to succeed.
// In production the dashboard is served by the same server that serves the data,
// so the address is relative ("/api/masterlist") and works from any computer.
// While developing (npm start, port 3000) it talks to the server on port 4000.
// Set REACT_APP_MASTERTRACK_API to point somewhere else if ever needed.
const API_BASE =
  process.env.REACT_APP_MASTERTRACK_API ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

export default function App() {
  const [page,          setPage]          = useState("home");
  const [pendingSearch, setPendingSearch] = useState("");
  const [config,        setConfig]        = useState([]);
  const [yearFiles,     setYearFiles]     = useState({});
  const [activeYear,    setActiveYear]    = useState(null);
  const [showAllYears,  setShowAllYears]  = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Light / dark mode. Remembers the choice; the first time it follows the computer's setting.
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem("mt-theme"); if (saved === "dark" || saved === "light") return saved; } catch (e) { /* storage blocked */ }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("mt-dark", theme === "dark");
    try { localStorage.setItem("mt-theme", theme); } catch (e) { /* ignore */ }
  }, [theme]);

  // ── Data loading — happens ONCE at the app root, not per-page ──────────────
  // This is what makes every page (Home, Tracker, ContractCommittee) show
  // data immediately on refresh, regardless of which page is landed on first.
  const [dataStatus, setDataStatus]           = useState("loading"); // loading | loaded | error
  const [dataWarnings, setDataWarnings]       = useState([]);
  const [dataFileName, setDataFileName]       = useState(null);
  const [dataLastUpdated, setDataLastUpdated] = useState(null);

  const loadMasterListData = useCallback(async () => {
    setDataStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/api/masterlist`);
      const data = await res.json();

      if (!res.ok) {
        const detail = data.excelFilesSeen && data.excelFilesSeen.length > 0
          ? ` Excel files found in that folder: ${data.excelFilesSeen.join(", ")}.`
          : "";
        setDataWarnings(prev => [...prev, `${data.error || "Could not load MOM Master List"}.${detail}`]);
        setDataStatus("error");
        return;
      }

      setYearFiles(data.years || {});
      const allRows = Object.values(data.years || {}).flatMap(y => y.rows);
      setConfig(allRows);
      setDataFileName(data.fileName);
      setDataLastUpdated(new Date(data.loadedAt));
      if (data.warnings && data.warnings.length > 0) {
        setDataWarnings(prev => [...prev, ...data.warnings]);
      }
      setDataStatus("loaded");
    } catch (err) {
      console.error(err);
      setDataWarnings(prev => [
        ...prev,
        `Could not reach the MasterTrack backend server at ${API_BASE || window.location.origin}. ` +
        `Make sure it's running (in the /server folder, run "npm start").`
      ]);
      setDataStatus("error");
    }
  }, []);

  // Load automatically the moment the app starts — before any page-specific
  // logic runs, so Home/Tracker/ContractCommittee all have data from the start.
  useEffect(() => {
    loadMasterListData();
  }, [loadMasterListData]);

  // Auto-select most recent year when yearFiles changes
  useEffect(() => {
    const years = Object.keys(yearFiles).map(Number).sort((a, b) => a - b);
    if (years.length > 0) {
      const currentCal = new Date().getFullYear();
      // Prefer current calendar year if uploaded, otherwise latest
      setActiveYear(years.includes(currentCal) ? currentCal : years[years.length - 1]);
    }
  }, [yearFiles]);

  // Recognise names across all years before any page builds its numbers.
  setNameSource(yearFiles);
  const uploadedYears = Object.keys(yearFiles).map(Number).sort((a, b) => a - b);

  return (
    <div style={{
      position: "relative", minHeight: "100vh",
      fontFamily: "'Nunito Sans', 'Nunito', Arial, sans-serif",
      fontSize: 13, color: "#1e293b",
    }}>
      <GlassBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <QuoteBar
          uploadedYears={uploadedYears}
          activeYear={activeYear}
          setActiveYear={setActiveYear}
          showAllYears={showAllYears}
          setShowAllYears={setShowAllYears}
          dataStatus={dataStatus}
          onRefresh={loadMasterListData}
          dataFileName={dataFileName}
          dataLastUpdated={dataLastUpdated}
          theme={theme}
          onToggleTheme={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
        />
        <div style={{ display: "flex", flex: 1 }}>
          <Sidebar setPage={setPage} currentPage={page} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
          <div style={{ flex: 1, padding: "28px 32px", background: "transparent", minHeight: "100%", overflowY: "auto" }}>
            {page === "home"  && <Home  config={config} yearFiles={yearFiles} activeYear={activeYear} showAllYears={showAllYears} setPage={setPage} setPendingSearch={setPendingSearch} />}
            {page === "views" && (
              <Tracker
                config={config}
                setConfig={setConfig}
                yearFiles={yearFiles}
                setYearFiles={setYearFiles}
                pendingSearch={pendingSearch}
                activeYear={activeYear}
                showAllYears={showAllYears}
                dataStatus={dataStatus}
                dataWarnings={dataWarnings}
                setDataWarnings={setDataWarnings}
                dataFileName={dataFileName}
                dataLastUpdated={dataLastUpdated}
                onRefresh={loadMasterListData}
              />
            )}
            {page === "cc"    && <ContractCommittee yearFiles={yearFiles} activeYear={activeYear} setPage={setPage} setPendingSearch={setPendingSearch} />}
          </div>
        </div>
      </div>
    </div>
  );
}