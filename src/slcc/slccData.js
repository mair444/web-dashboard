// Collects everything the SLCC deck needs from the loaded Excel data.
// Uses the same shared tender model and CC-paper definition as the dashboard,
// so the slides always agree with the Overview page.
import { buildTenders, ccPaperStats, groupPresenters, CC_TYPES } from "../tenderModel";

export const NO_DEPT = "No department listed";
const NO_VALUE = /^(n\/?a|n\.a\.?|na|nil|none|tbc|tba|unknown|-+|—)?$/i;
export function cleanDept(raw) {
  const s = String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");
  return NO_VALUE.test(s) ? NO_DEPT : s;
}
export const keyOf = t => String(t.no || t.title || "").replace(/\s+/g, "").toUpperCase();
const DAY = 86400000;
const diffDays = (a, b) => Math.round((b - a) / DAY);
const avg = a => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : null);
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const fmtDate = d => (d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const stageGroup = s => (["TP", "CFT Issuance", "TER", "TCEAR"].includes(s) ? s : "CTC / CE");

function sittingsOf(rows) {
  let max = 0;
  (rows || []).forEach(r => {
    const m = String(r["Week"] || "").match(/cc[\s\-_]*(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

// Status as it stood at a date: a Letter of Award dated after that date does not count yet.
function statusAsOf(t, end) {
  if (t.tStatus !== "awarded") return t.tStatus;
  return t.loaDate && t.loaDate <= end ? "awarded" : "ongoing";
}

function yearStats(rows, year) {
  const end = new Date(year, 11, 31, 23, 59, 59);
  const tenders = buildTenders(rows);
  tenders.forEach(t => { t.asOf = statusAsOf(t, end); });
  const cc = ccPaperStats(tenders);
  const n = s => tenders.filter(t => t.asOf === s).length;
  return { tenders, cc, sittings: sittingsOf(rows), total: tenders.length, awarded: n("awarded"), ongoing: n("ongoing"), pending: n("pending"), aborted: n("abort") };
}

export function reviewYearsAvailable(yearFiles) {
  return Object.keys(yearFiles || {}).map(Number).sort((a, b) => a - b);
}

export function buildSlccData(yearFiles, reviewYear) {
  const years = reviewYearsAvailable(yearFiles);
  const R = reviewYear, P = R + 1;
  const rowsOf = y => (yearFiles[y] && yearFiles[y].rows) || [];
  const cur = yearStats(rowsOf(R), R);
  const prev = yearFiles[R - 1] ? yearStats(rowsOf(R - 1), R - 1) : null;

  // papers per month in the review year
  const monthly = Array(12).fill(0);
  const monthlyByType = {};
  CC_TYPES.forEach(ty => { monthlyByType[ty] = Array(12).fill(0); });
  cur.tenders.forEach(t => t.papers.forEach(p => {
    if (p.date && CC_TYPES.includes(p.type) && p.date.getFullYear() === R) { monthly[p.date.getMonth()]++; monthlyByType[p.type][p.date.getMonth()]++; }
  }));

  // all years up to and including the review year, merged, for full paper trails
  const upto = years.filter(y => y <= R);
  const all = buildTenders(upto.flatMap(rowsOf));
  // Awarded in the review year = Letter of Award dated within that year.
  // Only tenders that are in the review year's list, so the numbers match the year tab.
  const inYear = new Set(cur.tenders.map(keyOf));
  const awarded = all.filter(t => t.hasLOA && t.loaDate && t.loaDate.getFullYear() === R && inYear.has(keyOf(t)))
    .sort((a, b) => a.loaDate - b.loaDate);
  const awardDays = awarded.map(t => t.awardDays).filter(n => n != null);

  // average time between stages for tenders that reached LOA
  const hops = [["TP", "CFT Issuance"], ["CFT Issuance", "TER"], ["TER", "TCEAR"], ["TCEAR", "LOA"]];
  const stageTimes = hops.map(([a, b]) => {
    const vals = [];
    awarded.forEach(t => {
      const da = a === "LOA" ? null : t.msMap[a];
      const db = b === "LOA" ? t.loaDate : t.msMap[b];
      if (da && db && db >= da) vals.push(diffDays(da, db));
    });
    return { from: a, to: b, avg: avg(vals), n: vals.length };
  });
  const slowest = stageTimes.filter(s => s.avg != null).sort((a, b) => b.avg - a.avg)[0] || null;

  // carry-over into the plan year: not awarded, not aborted at the end of the review year
  const endOfYear = new Date(R, 11, 31, 23, 59, 59);
  const carry = all.filter(t => { const st = statusAsOf(t, endOfYear); return st === "ongoing" || st === "pending"; });
  const stageOrder = ["TP", "CFT Issuance", "TER", "TCEAR", "CTC / CE"];
  const carryByStage = stageOrder.map(s => carry.filter(t => stageGroup(t.currentStage) === s && t.currentStage).length);
  const oldest = carry.filter(t => t.earliest).sort((a, b) => a.earliest - b.earliest).slice(0, 8)
    .map(t => ({ no: t.no, title: t.title, dept: cleanDept(t.dept), stage: t.currentStage || "—", first: t.earliest, open: diffDays(t.earliest, endOfYear) }));

  // workload per department: this year and the average of every year up to R
  const deptMap = new Map();
  const bump = (name, field, n) => { const k = name.toLowerCase(); if (!deptMap.has(k)) deptMap.set(k, { name, tenders: 0, papers: 0, avgPapers: 0 }); deptMap.get(k)[field] += n; };
  cur.tenders.forEach(t => {
    const d = cleanDept(t.dept), n = t.papers.filter(p => p.date && CC_TYPES.includes(p.type)).length;
    bump(d, "tenders", 1); bump(d, "papers", n);
  });
  upto.forEach(y => {
    buildTenders(rowsOf(y)).forEach(t => {
      const n = t.papers.filter(p => p.date && CC_TYPES.includes(p.type)).length;
      if (n) bump(cleanDept(t.dept), "avgPapers", n / upto.length);
    });
  });
  const depts = [...deptMap.values()].sort((a, b) => (a.name === NO_DEPT) - (b.name === NO_DEPT) || b.papers - a.papers);

  const presenters = groupPresenters(cur.tenders);
  const totalPresenterPapers = presenters.reduce((s, p) => s + p[2].papers, 0);
  const avgPapersPerYear = avg(upto.map(y => yearStats(rowsOf(y), y).cc.total));
  const avgSittings = avg(upto.map(y => sittingsOf(rowsOf(y))));

  const noDept = (deptMap.get(NO_DEPT.toLowerCase()) || { tenders: 0 }).tenders;
  const named = depts.filter(d => d.name !== NO_DEPT);
  const topPresenter = presenters[0] || null;
  const topShare = topPresenter && totalPresenterPapers ? topPresenter[2].papers / totalPresenterPapers : 0;

  return {
    R, P, years, cur, prev, monthly, monthlyByType, awarded, awardDays, stageTimes, slowest,
    avgAward: avg(awardDays), medAward: median(awardDays),
    carry, carryByStage, stageOrder, oldest, depts, named, noDept,
    presenters, topPresenter, topShare, avgPapersPerYear, avgSittings,
    partial: R === new Date().getFullYear(),
    generated: new Date(),
  };
}