// ── Canonical Helpers ──────────────────────────────────────────────────────
// These only make sense once a row has already gone through normalizeRow —
// they read the canonical field names (Tender No, Tender Title, Paper Type),
// not whatever the original Excel headers happened to be.
//
// Kept in one place so mergeAllYears.js, ContractCommittee.jsx, etc. can't
// quietly drift out of sync on what "the same tender" or "a completed
// paper" actually means.

import { normalizePaperType } from "./normalizeRow";

export const LEGACY_YEAR = 2024;

// The full lifecycle, in order. Useful anywhere that needs to render a
// milestone track or check "how far along is this tender".
export const PAPER_TYPE_ORDER = [
  "TP",
  "CFT Issuance",
  "TER",
  "TCEAR",
  "CTC",
  "CTC(A&E)",
  "CTC(ACV)",
  "CE",
  "Abort",
];

export function tenderKey(row) {
  const no = String(row["Tender No"] || "").trim();
  const title = String(row["Tender Title"] || "").trim();
  return no || title;
}

export function isTenderPlan(row) {
  return normalizePaperType(row["Paper Type"]) === "TP";
}

export function isCompletedPaper(row) {
  const type = normalizePaperType(row["Paper Type"]);
  return type.startsWith("CTC");
}
// NOTE: isCompletedPaper is kept for any other page that still displays
// paper-type-based status, but it is no longer used to decide what's
// hidden in the "All years" merge — see buildTenderTimelines below.
// If ContractCommittee.jsx (or anywhere else) still branches on CTC to
// mean "done", that should move to isFinalPaper() from a timeline instead.

// True for the CTC(A&E) / CTC(ACV) sub-types that get hidden behind the
// toggle in the summary panel and per-tender milestone track.
export function isCtcSubtype(row) {
  const type = normalizePaperType(row["Paper Type"]);
  return type === "CTC(A&E)" || type === "CTC(ACV)";
}

// Parses whatever's in the Date column — a JS Date (already parsed by
// SheetJS with cellDates), an Excel serial number, or a date string —
// into a real Date. Returns null if it can't make sense of it.
export function parseRowDate(row) {
  const raw = row["Date"];
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

  if (typeof raw === "number" && isFinite(raw)) {
    const excelEpoch = Date.UTC(1899, 11, 30); // Excel's day-0
    return new Date(excelEpoch + raw * 86400000);
  }

  if (typeof raw === "string" && raw.trim()) {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Groups rows by tenderKey and finds, for each tender, the earliest-dated
 * row (its starting point) and the latest-dated row (its current/final
 * status) — replacing the old CTC-prefix check entirely.
 *
 * Rows with an unparseable date are excluded from the start/final
 * calculation (they can't be ordered) but are otherwise left alone.
 *
 * @param {any[]} rows
 * @returns {Record<string, {startRow: any, finalRow: any, startDate: Date|null, finalDate: Date|null}>}
 */
export function buildTenderTimelines(rows) {
  const byKey = {};

  rows.forEach((row) => {
    const key = tenderKey(row);
    if (!key) return;
    const date = parseRowDate(row);
    if (!date) return; // can't place it on a timeline without a date
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({ row, date });
  });

  const timelines = {};
  Object.entries(byKey).forEach(([key, entries]) => {
    const sorted = [...entries].sort((a, b) => a.date - b.date);
    timelines[key] = {
      startRow: sorted[0].row,
      finalRow: sorted[sorted.length - 1].row,
      startDate: sorted[0].date,
      finalDate: sorted[sorted.length - 1].date,
    };
  });

  return timelines;
}