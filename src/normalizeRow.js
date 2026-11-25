// ── Row Normalizer ─────────────────────────────────────────────────────────
// Takes a raw parsed Excel row (whatever headers it happened to have) plus
// the field mapping produced by schemaDetector, and turns it into a clean
// canonical row using MasterTrack's established rules:
//
//   - "TP" and "Tender Plan" are the same paper type -> always "TP"
//   - Buyer/Presenter: if a file has both a Buyer and a Presenter column,
//     "Presenter" wins whenever it has a value
//   - Subject / Paper Type: if a file only has one of the two columns,
//     that single column's value populates both fields

import { CANONICAL_FIELDS, CROSSOVER_PAIRS } from "./schemaDetector.js";

function firstNonEmpty(values) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function pickBuyerPresenter(sources, rawRow) {
  if (!sources || sources.length === 0) return "";
  if (sources.length === 1) return rawRow[sources[0].header] ?? "";

  // Prefer whichever source column is literally named "presenter"
  const presenterSource = sources.find((s) => /presenter/i.test(s.header));
  if (presenterSource) {
    const val = rawRow[presenterSource.header];
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return firstNonEmpty(sources.map((s) => rawRow[s.header]));
}

export function normalizePaperType(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.toLowerCase() === "tender plan") return "TP";
  return trimmed;
}

function valueForField(field, mappingByField, rawRow) {
  const sources = mappingByField[field];
  if (!sources || sources.length === 0) return "";

  if (field === "Buyer/Presenter") return pickBuyerPresenter(sources, rawRow);

  return firstNonEmpty(sources.map((s) => rawRow[s.header]));
}

/**
 * @param {Record<string, any>} rawRow - one row as parsed by SheetJS
 * @param {Record<string, Array<{header:string, confidence:number}>>} mappingByField
 * @returns {Record<string, any>} canonical row, plus __raw for traceability
 */
export function normalizeRow(rawRow, mappingByField) {
  const canonical = {};

  CANONICAL_FIELDS.forEach((field) => {
    canonical[field] = valueForField(field, mappingByField, rawRow);
  });

  // Subject / Paper Type crossover: whichever one actually has a source
  // column fills in the other when it's blank.
  CROSSOVER_PAIRS.forEach(([fieldA, fieldB]) => {
    const hasA = !!(mappingByField[fieldA] && mappingByField[fieldA].length);
    const hasB = !!(mappingByField[fieldB] && mappingByField[fieldB].length);

    if (hasA && !hasB && !canonical[fieldB]) canonical[fieldB] = canonical[fieldA];
    if (hasB && !hasA && !canonical[fieldA]) canonical[fieldA] = canonical[fieldB];
  });

  canonical["Paper Type"] = normalizePaperType(canonical["Paper Type"]);

  canonical.__raw = rawRow;
  return canonical;
}

export function normalizeRows(rawRows, mappingByField) {
  return rawRows.map((row) => normalizeRow(row, mappingByField));
}