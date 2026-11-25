// ── Shared "All years" merge logic ────────────────────────────────────────────
// Used identically by Tracker.jsx and Home.jsx so the "All" view behaves the
// same way on both pages.
//
// Rules:
// 1. Years are never combined unless the person explicitly picks "All".
// 2. The year 2024 is treated as legacy/historical — when merging "All" years,
//    only its TP (Tender Plan) papers are pulled in. This shows where each
//    2024 tender started without dragging in its full old lifecycle, so it
//    can be visually connected to its continuation in later years.
// 3. If the *same tender* (matched by Tender No, or Tender Title if no
//    number is given) shows up as already completed (reached LOA, or any CTC
//    stage) in more than one year, only the most recent year's version is shown by
//    default. The older, now-redundant completed copies are tucked into a
//    separate "hidden" bucket that can still be opened on demand, rather
//    than being deleted or silently dropped.

const LEGACY_YEAR = 2024;

function tenderKey(row) {
  const no = String(row["Tender No"] || "").trim();
  const title = String(row["Tender Title"] || "").trim();
  return no || title;
}

// A tender counts as "completed" once it has reached LOA (Letter of Award — the
// final phase). CTC is still accepted so the "All years" view keeps behaving
// exactly as before until LOAs are filled in.
function isCompletedPaper(row) {
  const type = String(row["Paper Type"] || "").trim();
  return type === "LOA" || type.startsWith("CTC");
}

/**
 * @param {number[]} years - all uploaded years, ascending
 * @param {Record<number, {rows: any[]}>} yearFiles
 * @returns {{ visibleRows: any[], hiddenRows: any[] }}
 */
export function mergeAllYears(years, yearFiles) {
  if (!years || years.length === 0) return { visibleRows: [], hiddenRows: [] };

  // Step 1 — gather rows per year, applying the 2024-TP-only rule
  const perYearRows = {};
  years.forEach(year => {
    const rows = yearFiles[year]?.rows || [];
    if (year === LEGACY_YEAR) {
      perYearRows[year] = rows.filter(r => String(r["Paper Type"] || "").trim() === "TP");
    } else {
      perYearRows[year] = rows;
    }
  });

  // Step 2 — find tenders that have a completed (LOA / CTC-stage) paper in more
  // than one year. For those, keep only the most recent year's rows visible;
  // push every other year's rows for that same tender into the hidden bucket.
  const completedYearsByTender = {}; // tenderKey -> Set of years where it's completed
  years.forEach(year => {
    perYearRows[year].forEach(row => {
      if (!isCompletedPaper(row)) return;
      const key = tenderKey(row);
      if (!key) return;
      if (!completedYearsByTender[key]) completedYearsByTender[key] = new Set();
      completedYearsByTender[key].add(year);
    });
  });

  const latestCompletedYearByTender = {};
  Object.entries(completedYearsByTender).forEach(([key, yearSet]) => {
    if (yearSet.size > 1) {
      latestCompletedYearByTender[key] = Math.max(...yearSet);
    }
  });

  const visibleRows = [];
  const hiddenRows = [];

  years.forEach(year => {
    perYearRows[year].forEach(row => {
      const key = tenderKey(row);
      const dupYear = key ? latestCompletedYearByTender[key] : undefined;

      if (dupYear !== undefined && year !== dupYear) {
        // This tender has a more recent completed version elsewhere —
        // this year's copy of it is redundant, hide it (but keep it accessible).
        hiddenRows.push({ ...row, __sourceYear: year, __hiddenReason: "duplicate-completed" });
      } else {
        visibleRows.push({ ...row, __sourceYear: year });
      }
    });
  });

  return { visibleRows, hiddenRows };
}