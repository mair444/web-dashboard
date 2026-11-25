import { useMemo, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
// Adjust this path to wherever canonicalHelpers.js actually sits relative
// to this file (it's expected at src/ root alongside mergeAllYears.js).
import { tenderKey, parseRowDate } from "../canonicalHelpers";

ChartJS.register(ArcElement, Tooltip, Legend);

// Matches the milestone set used in TenderPaperTrail's summary/track, so
// the two widgets never disagree about which stages exist.
const MS = ["TP", "CFT Issuance", "TER", "TCEAR", "CTC"];
const COLORS = ["#6366f1", "#0ea5e9", "#8b5cf6", "#f97316", "#10b981"];

// `tenders` here is the flat list of raw paper rows (one row per paper),
// not pre-grouped — so this groups by tender first, same as
// TenderPaperTrail.jsx, to figure out each tender's current stage.
function summarizeByTender(rows) {
  const byKey = {};

  rows.forEach(row => {
    const key = tenderKey(row);
    if (!key) return;
    const type = String(row["Paper Type"] || "").trim();
    const date = parseRowDate(row);
    if (!byKey[key]) byKey[key] = [];
    if (type) byKey[key].push({ type, date });
  });

  return Object.values(byKey).map(papers => {
    const dated = papers.filter(p => p.date).sort((a, b) => a.date - b.date);
    const finalPaper = dated[dated.length - 1] || null;
    const currentStage = finalPaper ? finalPaper.type : null;
    const status = !finalPaper ? "pending" : currentStage === "Abort" ? "abort" : "ongoing";
    return { papers, currentStage, status };
  });
}

export default function Overview({ tenders, filters, setFilters }) {

  // ✅ animated count
  const useCountUp = (target) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const step = Math.ceil(target / 20) || 1;

      const interval = setInterval(() => {
        start += step;
        if (start >= target) {
          setCount(target);
          clearInterval(interval);
        } else {
          setCount(start);
        }
      }, 20);

      return () => clearInterval(interval);
    }, [target]);

    return count;
  };

  const stats = useMemo(() => {
    const grouped = summarizeByTender(tenders);
    const total = grouped.length;

    const ongoing = grouped.filter(t => t.status === "ongoing").length;
    const pending = grouped.filter(t => t.status === "pending").length;
    const aborted = grouped.filter(t => t.status === "abort").length;

    // Papers-per-stage funnel counts every paper of that type across all
    // tenders (not just the current-stage one) — same basis as before.
    const phaseCount = {};
    MS.forEach(m => {
      phaseCount[m] = tenders.filter(t => String(t["Paper Type"] || "").trim() === m).length;
    });

    return { total, ongoing, pending, aborted, phaseCount };
  }, [tenders]);

  // ✅ animated values
  const total = useCountUp(stats.total);
  const ongoing = useCountUp(stats.ongoing);
  const pending = useCountUp(stats.pending);

  // ✅ donut data — Ongoing vs Pending (Aborted shown separately since it's
  // a small, situational slice rather than a normal pipeline state)
  const chartData = {
    labels: ["Ongoing", "Pending"],
    datasets: [
      {
        data: [stats.ongoing, stats.pending],
        backgroundColor: ["#6366f1", "#e2e8f0"],
        borderWidth: 0
      }
    ]
  };

  const Card = ({ label, value, gradient }) => (
    <div
      style={{
        flex: 1,
        padding: "18px",
        borderRadius: "16px",
        background: gradient,
        color: "#fff",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        transition: "transform 0.2s"
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
    >
      <div style={{ fontSize: "13px", opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 600 }}>{value}</div>
    </div>
  );

  const Bar = ({ label, value, color, index, onClick, active }) => (
    <div
      onClick={onClick}
      style={{
        marginBottom: "14px",
        cursor: "pointer",
        transform: active ? "scale(1.05)" : "scale(1)",
        transition: "0.2s"
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "13px",
        marginBottom: "4px"
      }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>

      <div style={{
        height: "10px",
        background: "#e5e7eb",
        borderRadius: "999px",
        overflow: "hidden"
      }}>
        <div style={{
          width: `${Math.min(100, value * 5)}%`,
          height: "100%",
          background: color,
          borderRadius: "999px",
          transition: `width 0.6s ease ${index * 0.1}s`
        }} />
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: "28px" }}>

      {/* ✅ CARDS */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <Card label="Total" value={total}
          gradient="linear-gradient(135deg, #6366f1, #4f46e5)" />

        <Card label="Ongoing" value={ongoing}
          gradient="linear-gradient(135deg, #0ea5e9, #0369a1)" />

        <Card label="Pending" value={pending}
          gradient="linear-gradient(135deg, #64748b, #475569)" />
      </div>

      {/* ✅ CHART + FUNNEL SIDE BY SIDE */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px"
      }}>

        {/* ✅ DONUT CHART */}
        <div style={{
          background: "#fff",
          padding: "18px",
          borderRadius: "16px",
          boxShadow: "0 6px 25px rgba(0,0,0,0.06)"
        }}>
          <h4>Status Overview</h4>
          <Doughnut data={chartData} />
        </div>

        {/* ✅ FUNNEL */}
        <div style={{
          background: "#fff",
          padding: "18px",
          borderRadius: "16px",
          boxShadow: "0 6px 25px rgba(0,0,0,0.06)"
        }}>
          <h4>Procurement Flow</h4>

          {MS.map((m, i) => (
            <Bar
              key={m}
              label={m === "CFT Issuance" ? "CFT" : m}
              value={stats.phaseCount[m]}
              color={COLORS[i]}
              index={i}
              active={filters.phase === m}
              onClick={() =>
                setFilters({
                  ...filters,
                  phase: filters.phase === m ? null : m
                })
              }
            />
          ))}
        </div>

      </div>
    </div>
  );
}