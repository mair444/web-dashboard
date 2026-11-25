// ── Schema Detector ────────────────────────────────────────────────────────
// Looks at whatever column headers a given Excel file actually has and
// figures out which MasterTrack field each one represents, without anyone
// telling it "this column is Paper Type" up front.
//
// It doesn't care about column order or exact naming — "Presenter",
// "Buyer/Presenter", and "Presented By" all resolve to the same canonical
// field. When it isn't confident, it says so, so the UI can ask a human
// once instead of silently guessing wrong.

// The fields MasterTrack actually works with.
export const CANONICAL_FIELDS = [
  "No",
  "Week",
  "Date",
  "Tender No",
  "Tender Title",
  "Paper Type",
  "Subject",
  "Buyer/Presenter",
  "User",
  "User's Department",
  "Attendance List",
  "Status",
];

// Known aliases seen across different files. This list is meant to grow —
// add to it whenever a new file uses a header that isn't recognized.
const SYNONYMS = {
  "No": ["no", "no.", "#", "item no", "s/n", "sn", "serial no", "item", "sl", "sl no"],
  "Week": ["week", "wk", "week no", "week number", "week #", "cc week"],
  "Date": ["date", "cc date", "meeting date", "sitting date", "date of cc", "held on", "date held"],
  "Tender No": [
    "tender no", "tender number", "tender no.", "tenderno", "ref no",
    "reference no", "tender ref", "rfx no", "rfx number", "contract no",
  ],
  "Tender Title": [
    "tender title", "title", "tender name", "project title",
    "tender description", "contract title", "name of tender",
  ],
  "Paper Type": [
    "paper type", "type", "papertype", "category", "stage",
    "paper category", "document type", "cc paper type",
  ],
  "Subject": ["subject", "topic", "agenda", "agenda item"],
  "Buyer/Presenter": [
    "buyer", "presenter", "buyer/presenter", "buyer presenter",
    "presented by", "pic", "presenter name", "buyer name",
  ],
  "User": ["user", "requestor", "requester", "requesting user", "end user"],
  "User's Department": [
    "user's department", "users department", "user department",
    "department", "dept", "requesting department",
  ],
  "Attendance List": [
    "attendance list", "attendance", "attendees", "present",
    "list of attendees", "participants",
  ],
  "Status": ["status", "approval status", "outcome", "result", "cc status"],
};

// Fields that legitimately share a single source column in some files.
// When only one side of a pair is detected, the value should populate both.
export const CROSSOVER_PAIRS = [["Subject", "Paper Type"]];

// Fields that may legitimately be sourced from more than one column in the
// same file (e.g. a file with both a "Buyer" and a "Presenter" column).
export const MULTI_SOURCE_FIELDS = ["Buyer/Presenter", "Subject", "Paper Type"];

const AUTO_ACCEPT_THRESHOLD = 0.72; // confident enough, no review needed
const REVIEW_THRESHOLD = 0.4; // plausible, but should be confirmed
// below REVIEW_THRESHOLD -> treated as an unmapped/extra column

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenSet(str) {
  return new Set(normalize(str).split(" ").filter(Boolean));
}

function jaccard(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((t) => {
    if (setB.has(t)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function levRatio(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// Score a single header against a single canonical field (incl. its synonyms).
function scoreHeaderAgainstField(header, field) {
  const nHeader = normalize(header);
  const candidates = [field, ...(SYNONYMS[field] || [])];

  let best = 0;
  candidates.forEach((candidate) => {
    if (nHeader === normalize(candidate)) {
      best = Math.max(best, 1);
      return;
    }
    const score = 0.6 * jaccard(header, candidate) + 0.4 * levRatio(header, candidate);
    best = Math.max(best, score);
  });
  return best;
}

/**
 * Detects, for a single header string, which canonical field(s) it plausibly
 * maps to, ranked by confidence.
 * @returns {Array<{field: string, confidence: number}>}
 */
export function scoreHeader(header) {
  return CANONICAL_FIELDS
    .map((field) => ({ field, confidence: scoreHeaderAgainstField(header, field) }))
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Given the list of headers found in a file (Object.keys of a parsed row),
 * builds a mapping from canonical field -> [{header, confidence}] and flags
 * which headers need human confirmation.
 *
 * @param {string[]} headers
 * @returns {{
 *   mappingByField: Record<string, Array<{header:string, confidence:number}>>,
 *   review: Array<{header:string, bestGuess:string, confidence:number, candidates: Array<{field:string, confidence:number}>}>,
 *   unmapped: string[],
 * }}
 */
export function detectSchema(headers) {
  const mappingByField = {};
  const review = [];
  const unmapped = [];

  headers.forEach((header) => {
    const ranked = scoreHeader(header);
    const [top] = ranked;

    if (!top || top.confidence < REVIEW_THRESHOLD) {
      unmapped.push(header);
      return;
    }

    if (top.confidence >= AUTO_ACCEPT_THRESHOLD) {
      if (!mappingByField[top.field]) mappingByField[top.field] = [];
      mappingByField[top.field].push({ header, confidence: top.confidence });
      return;
    }

    // Confident enough to be plausible, not confident enough to trust blindly.
    review.push({
      header,
      bestGuess: top.field,
      confidence: top.confidence,
      candidates: ranked.slice(0, 3),
    });
  });

  return { mappingByField, review, unmapped };
}

/**
 * Merges a human's confirmed choices (from the review step) into the
 * auto-detected mapping. `decisions` is { [header]: fieldNameOrNull }
 * where null means "ignore this column".
 */
export function applyReviewDecisions(mappingByField, decisions) {
  const merged = Object.fromEntries(
    Object.entries(mappingByField).map(([field, sources]) => [field, [...sources]])
  );

  Object.entries(decisions).forEach(([header, field]) => {
    if (!field) return; // ignored
    if (!merged[field]) merged[field] = [];
    merged[field].push({ header, confidence: 1 }); // human-confirmed
  });

  return merged;
}