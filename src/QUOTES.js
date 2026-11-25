import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ContractCommittee from "./pages/ContractCommittee";
import Home from "./pages/Home";
import Tracker from "./pages/Tracker";

// ── Unisex daily motivational quotes ─────────────────────────────────────────
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
// ── Animated glass bubble background ─────────────────────────────────────────
function GlassBackground() {
    return (
        <>
            <style>{`
@keyframes floatA {
0%,100% { transform: translate(0,0) scale(1); }
33% { transform: translate(40px,-60px) scale(1.1); }
66% { transform: translate(-30px,40px) scale(0.95); }
}
@keyframes floatB {
0%,100% { transform: translate(0,0) scale(1); }
40% { transform: translate(-50px,30px) scale(1.05); }
70% { transform: translate(60px,-40px) scale(0.9); }
}
@keyframes floatC {
0%,100% { transform: translate(0,0) scale(1); }
30% { transform: translate(30px,50px) scale(1.08); }
60% { transform: translate(-40px,-30px) scale(0.92); }
}
`}</style>
            <div style={{
                position: "fixed", inset: 0, zIndex: 0, overflow: "hidden",
                background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fff0f9 60%, #fdf4ff 100%)",
                pointerEvents: "none",
            }}>
                {/* Blobs */}
                {[
                    {
                        w: 520, h: 520, top: "−10%", left: "−8%", anim: "floatA 18s ease-in-out infinite", delay: "0s",
                        bg: "radial-gradient(circle, rgba(244,114,182,0.18) 0%, rgba(236,72,153,0.06) 60%, transparent 80%)"
                    },
                    {
                        w: 400, h: 400, top: "50%", left: "60%", anim: "floatB 22s ease-in-out infinite", delay: "−7s",
                        bg: "radial-gradient(circle, rgba(192,132,252,0.15) 0%, rgba(168,85,247,0.05) 60%, transparent 80%)"
                    },
                    {
                        w: 350, h: 350, top: "20%", left: "70%", anim: "floatC 16s ease-in-out infinite", delay: "−4s",
                        bg: "radial-gradient(circle, rgba(251,207,232,0.22) 0%, rgba(244,114,182,0.08) 60%, transparent 80%)"
                    },
                    {
                        w: 280, h: 280, top: "70%", left: "10%", anim: "floatA 20s ease-in-out infinite", delay: "−10s",
                        bg: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)"
                    },
                    {
                        w: 220, h: 220, top: "10%", left: "40%", anim: "floatB 25s ease-in-out infinite", delay: "−14s",
                        bg: "radial-gradient(circle, rgba(249,168,212,0.2) 0%, transparent 70%)"
                    },
                ].map((b, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        width: b.w, height: b.h,
                        top: b.top, left: b.left,
                        borderRadius: "50%",
                        background: b.bg,
                        animation: b.anim,
                        animationDelay: b.delay,
                        filter: "blur(2px)",
                    }} />
                ))}
                {/* Glass shimmer overlay */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)",
                    backdropFilter: "blur(0px)",
                }} />
            </div>
        </>
    );
}
// ── Quote Headline Bar ────────────────────────────────────────────────────────
function QuoteBar() {
    const quote = getDailyQuote();
    return (
        <div style={{
            position: "relative", zIndex: 10,
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "0.5px solid rgba(243,184,224,0.5)",
            padding: "9px 28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px",
        }}>
            <span style={{ fontSize: "10px", color: "#f9a8d4", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                ✦ today
            </span>
            <span style={{ fontSize: "12px", color: "#9d174d", fontWeight: 500, fontStyle: "italic", fontFamily: "-apple-system, 'SF Pro Text', 'DM Sans', sans-serif", letterSpacing: "0.01em" }}>
                "{quote}"
            </span>
        </div>
    );
}
// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
    const [page, setPage] = useState("home");
    const [config, setConfig] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem("data");
        if (saved) setConfig(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem("data", JSON.stringify(config));
    }, [config]);

    return (
        <div style={{ position: "relative", minHeight: "100vh", fontFamily: "-apple-system, 'SF Pro Text', 'DM Sans', BlinkMacSystemFont, sans-serif", fontSize: "13px", color: "#1f2937" }}>
            <GlassBackground />

            {/* Layout wrapper */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

                {/* Quote headline — always visible */}
                <QuoteBar />

                {/* Sidebar + content */}
                <div style={{ display: "flex", flex: 1 }}>
                    <Sidebar
                        setPage={setPage}
                        currentPage={page}
                        isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen} />

                    <div style={{
                        flex: 1, padding: "28px 32px",
                        background: "transparent",
                        minHeight: "100%",
                        overflowY: "auto",
                    }}>
                        {page === "home" && <Home config={config} setPage={setPage} />}
                        {page === "views" && <Tracker config={config} setConfig={setConfig} />}
                        {page === "cc" && <ContractCommittee />}
                    </div>
                </div>
            </div>
        </div>
    );
}
