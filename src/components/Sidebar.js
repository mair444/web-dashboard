import { useState } from "react";

const NAV = [
  {
    id: "home", label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="2.5" />
        <rect x="14" y="3" width="7" height="7" rx="2.5" />
        <rect x="3" y="14" width="7" height="7" rx="2.5" />
        <rect x="14" y="14" width="7" height="7" rx="2.5" />
      </svg>
    ),
  },
  {
    id: "views", label: "Tracker",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: "cc", label: "Contract Committee",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2.5" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="8"  cy="15" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function Sidebar({ setPage, currentPage, isSidebarOpen, setIsSidebarOpen }) {
  const [hovered, setHovered] = useState(null);

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:translateX(0); } }
        .nav-item { transition: background 0.15s, transform 0.12s; }
        .nav-item:hover { transform: translateX(2px); }
      `}</style>

      <div style={{
        width: isSidebarOpen ? 224 : 64,
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex", flexDirection: "column",
        padding: isSidebarOpen ? "24px 14px" : "24px 10px",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), padding 0.25s",
        borderRight: "1px solid #f1f5f9",
        flexShrink: 0, position: "relative", zIndex: 10,
        boxShadow: "2px 0 16px rgba(0,0,0,0.03)",
      }}>

        {/* ── Logo area ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: isSidebarOpen ? 44 : 40, height: isSidebarOpen ? 44 : 40,
            borderRadius: 10, overflow: "hidden",
            background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: isSidebarOpen ? 10 : 0,
            flexShrink: 0,
          }}>
            {/*
              Logo: TotalEnergies
              File is at /public/logo.png in your project.
              The mix-blend-mode:"multiply" removes the white background
              so it renders transparently on any background colour.
            */}
            {/* 
              LOGO SETUP INSTRUCTIONS:
              1. Copy your logo file and rename it to: logo.png
              2. Paste it into this folder: dashboard/public/logo.png
              3. That's it — it will show up here automatically.
              
              Your logo file is currently at:
              C:\Users\L1183029\OneDrive - TotalEnergies\Documents\INTERN DOCX\dashboard-project\INTERN PROJECT\dashboard\src
              Move it one level up to the 'public' folder (same level as 'src').
            */}
            <img
              src={process.env.PUBLIC_URL + "/logo.png"}
              alt="TotalEnergies"
              onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: "3px",
                mixBlendMode: "multiply",
                display: "block",
              }}
            />
            {/* Fallback icon shown if logo.png not found yet */}
            <svg style={{ display: "none", width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>

          {isSidebarOpen && (
            <div style={{ animation: "fadeSlideIn 0.2s ease" }}>
              <div style={{
                fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em",
                fontFamily: "'Nunito', Arial, sans-serif", color: "#1e293b",
              }}>MasterTracker</div>
              <div style={{
                fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em",
                marginTop: 1, textTransform: "uppercase",
                fontFamily: "'Nunito Sans', Arial, sans-serif",
              }}>Procurement Suite</div>
            </div>
          )}
        </div>

        {isSidebarOpen && (
          <div style={{ fontSize: 9, color: "#cbd5e1", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Nunito', Arial, sans-serif", fontWeight: 700, marginBottom: 8, paddingLeft: 10 }}>
            Menu
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map(({ id, label, icon }) => {
            const isActive = currentPage === id;
            return (
              <div
                key={id}
                className="nav-item"
                onClick={() => setPage(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "flex", alignItems: "center",
                  gap: isSidebarOpen ? 10 : 0,
                  justifyContent: isSidebarOpen ? "flex-start" : "center",
                  padding: isSidebarOpen ? "9px 12px" : "10px",
                  borderRadius: 12, cursor: "pointer",
                  background: isActive ? "#f0f0ff" : hovered === id ? "#f8fafc" : "transparent",
                  color: isActive ? "#6366f1" : "#94a3b8",
                  position: "relative",
                  border: isActive ? "1px solid #e0e7ff" : "1px solid transparent",
                }}
              >
                {isActive && (
                  <div style={{
                    position: "absolute", left: 0, top: "22%", bottom: "22%",
                    width: 3, borderRadius: "0 3px 3px 0",
                    background: "#6366f1",
                  }} />
                )}
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.55 }}>{icon}</span>
                {isSidebarOpen && (
                  <span style={{
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    animation: "fadeSlideIn 0.2s ease",
                    color: isActive ? "#6366f1" : "#64748b",
                    fontFamily: "'Nunito', Arial, sans-serif",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{label}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {isSidebarOpen && (
          <div style={{
            fontSize: 9, color: "#e2e8f0", textAlign: "center",
            marginBottom: 12, fontStyle: "italic",
            fontFamily: "'Nunito Sans', Arial, sans-serif",
          }}>
            Made with love by Myra
          </div>
        )}

        <div style={{ height: 1, background: "#f1f5f9", marginBottom: 12 }} />

        <div
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: isSidebarOpen ? "flex-end" : "center",
            cursor: "pointer", padding: 6, color: "#cbd5e1", borderRadius: 10,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#6366f1"; e.currentTarget.style.background = "#f0f0ff"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ transform: isSidebarOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.25s" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {isSidebarOpen && (
            <span style={{ fontSize: 11, marginLeft: 5, fontFamily: "'Nunito Sans', Arial", color: "#94a3b8" }}>Collapse</span>
          )}
        </div>
      </div>
    </>
  );
}