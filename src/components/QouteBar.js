import { useState, useEffect } from "react";

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "Small steps every day lead to big results.",
  "Focus on progress, not perfection.",
  "What you do today can improve all your tomorrows.",
  "Discipline is choosing between what you want now and what you want most.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your only limit is your mind.",
  "Work hard in silence, let success make the noise.",
  "Be the change you wish to see in the world.",
  "Don't watch the clock — do what it does. Keep going.",
  "The harder you work, the luckier you get.",
  "Dream big. Start small. Act now.",
  "Consistency beats talent when talent doesn't show up.",
  "Every expert was once a beginner.",
  "Make today count.",
  "A year from now you will wish you had started today.",
  "Push yourself because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "It always seems impossible until it's done.",
  "Strive for progress, not perfection.",
];

export default function QuoteBar() {
  const today    = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const startIdx  = dayOfYear % QUOTES.length;

  const [idx,  setIdx]  = useState(startIdx);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx((prev) => (prev + 1) % QUOTES.length); setFade(true); }, 350);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: "100%",
      background: "linear-gradient(90deg, #fce4f3 0%, #fdf0fb 50%, #fce4f3 100%)",
      borderBottom: "1px solid #f3b8e0",
      padding: "8px 24px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      zIndex: 100,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: "12px", color: "#f472b6", flexShrink: 0 }}>✦</span>
      <p style={{
        margin: 0,
        fontSize: "12px",
        fontStyle: "italic",
        color: "#9d174d",
        fontWeight: 500,
        opacity: fade ? 1 : 0,
        transform: fade ? "translateY(0)" : "translateY(-4px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        flex: 1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        "{QUOTES[idx]}"
      </p>
      <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
        {QUOTES.map((_, i) => (
          <div
            key={i}
            onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 300); }}
            style={{
              width: i === idx ? "12px" : "4px", height: "4px",
              borderRadius: "999px",
              background: i === idx ? "#ec4899" : "#f9a8d4",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}