// ── Shared tender model ───────────────────────────────────────────────────────
// ONE place that decides what "a tender" is and what its status is.
// Overview (pages/Home.js) and Paper Trail (components/TenderPaperTrail.js)
// both use this, so their numbers can never disagree again.
//
// Rules (settled with the CMM team):
//  1. A tender = one unique Tender No (or Tender Title if there is no number).
//  2. The same paper type with the same date logged twice counts once.
//  3. Status follows the paper with the LATEST date:
//       - latest paper is Abort            -> "abort"
//       - tender has an LOA paper          -> "awarded"   (LOA = final phase)
//       - no dated paper and no LOA        -> "pending"
//       - otherwise                        -> "ongoing"
//  4. Every presenter/buyer name found on any paper of the tender is kept.

import { tenderKey, parseRowDate } from "./canonicalHelpers";

// Milestone progression for the timeline track (LOA = final phase).
export const MILESTONES = ["TP", "CFT Issuance", "TER", "TCEAR", "CTC", "LOA"];

function diffDays(a, b) { return Math.round((b - a) / 86400000); }
const clean = (v) => String(v == null ? "" : v).trim();

// Extra normalization on top of what the server already does — catches
// inconsistent casing/spacing in the Paper Type value itself.
export function normalizeType(rawType) {
  const type = clean(rawType);
  const tl = type.toLowerCase();
  if (tl === "loa" || tl.includes("letter of award")) return "LOA";
  if (tl === "tender plan" || tl === "tp") return "TP";
  if (tl.includes("cft"))    return "CFT Issuance";
  if (tl === "ter")          return "TER";
  if (tl.includes("tcear"))  return "TCEAR";
  if (tl.includes("a&e"))    return "CTC(A&E)";
  if (tl.includes("acv"))    return "CTC(ACV)";
  if (tl.startsWith("ctc"))  return "CTC";
  if (tl === "ce")           return "CE";
  if (tl.includes("abort"))  return "Abort";
  return type;
}

// ── People: recognise the same presenter written in different ways ───────────
// Handles upper/lower case, extra spaces and dots ("Zainol A.bakar"), short vs
// full names ("Mardiana" / "Mardiana Zulkafli"), titles such as Mohd/Nor/Nurul,
// small typos ("Khairuddin"/"Khairudin"), and several people in one cell
// ("Alicia/mardiana", "Nabilah / Ahmad K").
const STOP = new Set(["mohd","md","mohamed","mohammad","muhammad","mohamad","muhd","nor","nur","nurul","noor","bin","binti","bt","bte","b","abdul","abd"]);
const NO_NAME = /^(n\/?a|n\.a\.?|na|nil|none|tbc|tba|unknown|-+|—)$/i;

function stripAccents(s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; }

// One cell -> a list of names (the cell may hold more than one person).
export function splitPresenterCell(raw) {
  // "Nizam Hanif (On Behalf Nor Ezy ...)" -> the presenter is the person BEFORE "on behalf";
  // anything in brackets is a note, not part of the name.
  const s = clean(raw).replace(/\(?\s*on\s+behalf\b.*$/i, "").replace(/\([^)]*\)?/g, " ").replace(/\s+/g, " ").trim();
  if (!s || NO_NAME.test(s)) return [];
  return s.split(/\s*(?:\/|&|\+|;|\n|\band\b)\s*/i).map(x => x.trim()).filter(x => x && !NO_NAME.test(x));
}

function tokensOf(name) {
  const base = stripAccents(name).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const toks = base.map(t => (t.startsWith("nur") && !STOP.has(t) && t.length - 3 >= 4) ? t.slice(3) : t);
  const kept = toks.filter(t => !STOP.has(t));
  return kept.length ? kept : toks;
}

function withinOneEdit(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

function tokenMatch(a, b, single) {
  if (a === b) return "exact";
  if (!single && a.length === 1 && b.length > 1 && b[0] === a) return "initial";
  if (Math.min(a.length, b.length) >= 2 && Math.max(a.length, b.length) >= 3 && withinOneEdit(a, b)) return "fuzzy";
  return null;
}

// Every token of A appears in B (exactly, as an initial, or with one small typo).
function isSubset(A, B) {
  let fuzzy = 0;
  for (const a of A) {
    let best = null;
    for (const b of B) {
      const r = tokenMatch(a, b, A.length === 1);
      if (r === "exact" || r === "initial") { best = r; break; }
      if (r === "fuzzy") best = "fuzzy";
    }
    if (!best) return false;
    if (best === "fuzzy") fuzzy++;
  }
  return fuzzy === 0 || (fuzzy === 1 && A.length >= 2);
}

function nice(name) {
  return name.replace(/\./g, ". ").replace(/\s+/g, " ").trim()
    .split(" ").map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(" ");
}

// counts: Map(spelling -> number of times seen). Returns:
//   lookup(spelling) -> the one display name for that person
//   report: [{ name, spellings[] }] and ambiguous[] for the check file
export function buildPeopleIndex(counts) {
  const items = [...counts.entries()].map(([spelling, n]) => ({ spelling, n, tokens: tokensOf(spelling) }))
    .filter(it => it.tokens.length);
  const parent = items.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (isSubset(items[i].tokens, items[j].tokens) && isSubset(items[j].tokens, items[i].tokens)) parent[find(j)] = find(i);

  const groups = {};
  items.forEach((it, i) => { (groups[find(i)] = groups[find(i)] || []).push(it); });
  const list = Object.values(groups).map(members => ({
    members,
    rep: members.slice().sort((a, b) => b.tokens.length - a.tokens.length || b.n - a.n)[0],
  }));

  const maximal = list.filter(g => !list.some(h => h !== g && isSubset(g.rep.tokens, h.rep.tokens)));
  const target = new Map(); // group -> final group
  const ambiguous = [];
  list.forEach(g => {
    if (maximal.includes(g)) { target.set(g, g); return; }
    const homes = maximal.filter(h => isSubset(g.rep.tokens, h.rep.tokens));
    if (homes.length === 1) target.set(g, homes[0]);
    else { target.set(g, g); ambiguous.push({ name: nice(g.rep.spelling), couldBe: homes.map(h => nice(h.rep.spelling)) }); }
  });

  const people = new Map(); // final group -> { spellings, best }
  list.forEach(g => {
    const t = target.get(g);
    if (!people.has(t)) people.set(t, []);
    people.get(t).push(...g.members);
  });
  const display = new Map();
  const report = [];
  people.forEach(members => {
    const best = members.slice().sort((a, b) =>
      b.spelling.split(/\s+/).length - a.spelling.split(/\s+/).length || b.n - a.n)[0];
    const name = nice(best.spelling);
    members.forEach(mm => display.set(mm.spelling, name));
    report.push({ name, spellings: members.map(mm => `${mm.spelling} (${mm.n})`) });
  });
  return { lookup: s => display.get(s) || nice(s), report, ambiguous };
}

// Names are recognised using the spellings from EVERY year, so a person is the same
// person whichever year (or "All") is being viewed. App.js calls setNameSource once per load.
let NAME_SOURCE = [];
export function setNameSource(yearFiles) {
  const all = [];
  Object.values(yearFiles || {}).forEach(f => { (f && f.rows || []).forEach(r => all.push(r)); });
  NAME_SOURCE = all;
}
function spellingsOf(rows, counts) {
  (rows || []).forEach(row => {
    const buyer = clean(row["Buyer/Presenter"] || row["Presenter"] || row["Buyer"]);
    splitPresenterCell(buyer).map(x => x.replace(/\s+/g, " ")).forEach(x => counts.set(x, (counts.get(x) || 0) + 1));
  });
}

// Rows (one per paper) -> tenders (one per tender) with status.
export function buildTenders(raw, opts) {
  const map = {};
  const spellCounts = new Map();
  (raw || []).forEach(row => {
    const title   = clean(row["Tender Title"]);
    const no      = clean(row["Tender No"]);
    const type    = normalizeType(row["Paper Type"]);
    const buyer   = clean(row["Buyer/Presenter"] || row["Presenter"] || row["Buyer"]);
    const user    = clean(row["User"]);
    const dept    = clean(row["User's Department"] || row["Department"]);
    const week    = clean(row["Week"]);
    const status  = clean(row["Status"]);
    const subject = clean(row["Subject"]);
    const date    = parseRowDate(row);

    if (!title && !no) return;
    const key = tenderKey(row) || no || title;

    if (!map[key]) map[key] = { no, title, buyer, user, dept, week, status, subject, presenters: [], people: [], papers: [] };
    const t = map[key];

    if (buyer   && !t.buyer)   t.buyer   = buyer;
    if (user    && !t.user)    t.user    = user;
    if (dept    && !t.dept)    t.dept    = dept;
    if (week    && !t.week)    t.week    = week;
    if (subject && !t.subject) t.subject = subject;
    if (status)                t.status  = status;

    // Every name in the presenter cell (there can be more than one person).
    const parts = splitPresenterCell(buyer).map(x => x.replace(/\s+/g, " "));
    parts.forEach(x => spellCounts.set(x, (spellCounts.get(x) || 0) + 1));

    if (type) t.papers.push({ type, date, week, status, buyer, subject, parts });
  });

  if (NAME_SOURCE.length) {
    const all = new Map();
    spellingsOf(NAME_SOURCE, all);
    spellCounts.forEach((n, k) => { if (!all.has(k)) all.set(k, n); });
    spellCounts.clear();
    all.forEach((n, k) => spellCounts.set(k, n));
  }
  const index = buildPeopleIndex(spellCounts);
  if (opts && opts.report) opts.report.index = index;

  return Object.values(map).map(t => {
    // De-duplicate papers: same type + same date logged twice counts once.
    // If the duplicate row names another presenter, that person is kept.
    const seen = new Map();
    t.papers = t.papers.filter(p => {
      const sig = `${p.type}__${p.date ? p.date.getTime() : "no-date"}`;
      if (seen.has(sig)) { seen.get(sig).parts = [...new Set([...seen.get(sig).parts, ...p.parts])]; return false; }
      seen.set(sig, p);
      return true;
    });
    t.papers.forEach(p => { p.people = [...new Set(p.parts.map(index.lookup))]; });
    t.people = [...new Set(t.papers.flatMap(p => p.people))];
    t.presenters = t.people;

    const types = [...new Set(t.papers.map(p => p.type).filter(Boolean))];

    const msMap = {};
    MILESTONES.forEach(m => {
      const match = t.papers.find(p => p.type === m && p.date);
      if (match) msMap[m] = match.date;
    });

    const ctcVariants = t.papers.filter(p => p.type === "CTC(A&E)" || p.type === "CTC(ACV)");

    const datedPapers = t.papers.filter(p => p.date).sort((a, b) => a.date - b.date);
    const startPaper = datedPapers[0] || null;
    const finalPaper = datedPapers[datedPapers.length - 1] || null;

    const earliest = startPaper ? startPaper.date : null;
    const latest   = finalPaper ? finalPaper.date : null;
    const totalDays = earliest && latest && earliest.getTime() !== latest.getTime()
      ? diffDays(earliest, latest) : null;

    const currentStage = finalPaper ? finalPaper.type : null;

    const loaPaper = t.papers.find(p => p.type === "LOA") || null;
    const hasLOA   = !!loaPaper;
    const loaDate  = loaPaper ? loaPaper.date : null;
    const awardDays = earliest && loaDate ? Math.max(0, diffDays(earliest, loaDate)) : null;

    const tStatus = (!finalPaper && !hasLOA) ? "pending"
      : currentStage === "Abort" ? "abort"
      : hasLOA ? "awarded"
      : "ongoing";

    return {
      ...t, types, msMap, ctcVariants, earliest, latest, totalDays, tStatus, currentStage, hasLOA, loaDate, awardDays,
      // Names the Overview page already uses:
      filled: types,
      complete: tStatus === "awarded",
      aborted: tStatus === "abort",
    };
  });
}

// ── Papers presented at Contract Committee ────────────────────────────────────
// ONE definition used by every page: a paper counts as "presented at CC" when
// it has a date and is one of these nine types. LOA is not a CC paper, and the
// same paper type on the same date for the same tender counts once (already
// handled in buildTenders).
export const CC_TYPES = ["TP", "CFT Issuance", "TER", "TCEAR", "CTC", "CTC(A&E)", "CTC(ACV)", "CE", "Abort"];

export function ccPaperStats(tenders) {
  const catTotals = {};
  CC_TYPES.forEach(c => { catTotals[c] = 0; });
  let total = 0, loa = 0, undated = 0, other = 0;
  (tenders || []).forEach(t => t.papers.forEach(p => {
    if (p.type === "LOA") { loa++; return; }
    if (!CC_TYPES.includes(p.type)) { other++; return; }
    if (!p.date) { undated++; return; }
    catTotals[p.type]++;
    total++;
  }));
  return { total, catTotals, loa, undated, other };
}

// People -> [[name, tenders[], { papers, tenders }], ...], most papers first.
// "papers" = papers presented at Contract Committee (same definition as the
// rest of the dashboard); a paper presented by two people counts for both.
// Every person is kept, with or without a department.
export function groupPresenters(tenders) {
  const byName = new Map();
  const get = n => { if (!byName.has(n)) byName.set(n, { tenders: [], papers: 0 }); return byName.get(n); };
  (tenders || []).forEach(t => {
    (t.people || []).forEach(n => get(n).tenders.push(t));
    t.papers.forEach(p => {
      if (!p.date || !CC_TYPES.includes(p.type)) return;
      (p.people || []).forEach(n => { get(n).papers++; });
    });
  });
  return [...byName.entries()]
    .map(([name, v]) => [name, v.tenders, { papers: v.papers, tenders: v.tenders.length }])
    .sort((a, b) => b[2].papers - a[2].papers || b[2].tenders - a[2].tenders || a[0].localeCompare(b[0]));
}