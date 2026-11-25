// Content for the SLCC deck that cannot come from the Excel data.
// It is typed into the "Fill in content" panel and kept in this browser (localStorage), one draft per year.
import { focusAreas, recommendations } from "./slccText";

const KEY = y => "mt-slcc-draft-" + y;

export function defaultDraft(d) {
  const R = d.R, P = d.P;
  const fa = focusAreas(d);
  const rec = recommendations(d);
  return {
    ref: `TEPMY/C&P DEPT/SCC-${R}/1`,
    logo: "",
    objectives: [
      `Review ${R} Performance Highlights`,
      `Present TEPMY Procurement Dashboard for ${R} status and trend`,
      `Validate the ${P} Master Procurement Plan (18 Months)`,
      `Review key suppliers and SQM outcomes for ${R}`,
      `Seek Local Contract Committee approval for ${P} planned SQMs`,
      "Assess Procurement organizational capacity, resources status, and identify potential constraints",
    ].join("\n"),
    agenda: ["Contract Committee (CC) papers – key figures", "Procurement dashboard – review on overall figures and trends", "Procurement plan (Master Procurement Plan) overview"].join("\n"),
    focus: [
      "PROCUREMENT CYCLE\n- Continuous optimization on the procurement cycle time\n- To maintain strategic oversight of approval timelines (both TGP and Petronas requirements)" +
        (d.slowest ? `\n- Slowest step in ${R}: ${d.slowest.from} to ${d.slowest.to} (about ${Math.round(d.slowest.avg)} days)` : ""),
      "DIGITALIZATION\n- Continue to develop analytics providing visibility on procurement statistics\n- Implementation of E-Sourcing for procurement processes",
      "PROCUREMENT COMPLIANCE\n- Continuously ensure Procurement activities are fully compliant with internal and external policies (TGP and PETRONAS)",
      "COST OPTIMIZATION\n- Ensuring tenders (>50%) exceeding TTL are negotiated\n- Focus on securing advantageous terms and driving continuous cost optimization initiative",
    ].join("\n\n"),
    focusData: fa.map(f => `${f.h}: ${f.t}`).join("\n"),
    recs: rec.map(r => `${r[0]} – ${r[1]}`).join("\n"),
    approval: `The Strategic Contracts Committee is requested to validate the following strategic deliverables:\n- ${P} Master Procurement Plan\n- Key Supplier lists and proposed SQM for ${P}`,
    spend: "", // lines "Label: value" for the Procurement Dashboard slide
    topSuppliers: "", // pasted table: Supplier, Contract / Scope, Invoiced (MYR mil), Department
    plan: "", // pasted Master Procurement Plan table
    sqmIntro: "The SQM (performance review) is a requirement under the Company Rule on Supplier Relationship Management.\nThe purpose of the SQM is to conduct an annual performance review of Strategic and Key Suppliers, with the results communicated to the supplier. Where necessary, action plans will be defined.",
    sqmDone: "", // pasted: Vendor, Contract, Description, Owner, SQM date
    sqmPlan: "", // pasted: Vendor, Contract Value (MYR mil), Description, Owner
    org: "", // pasted: Group, Role, Name, P/T
    extra: "", // free slides, separated by a line with ---
    awards: {}, // tender key -> { supplier, value }
    skipEmpty: true,
  };
}

export function loadDraft(d) {
  const base = defaultDraft(d);
  try {
    const raw = localStorage.getItem(KEY(d.R));
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch (e) { /* storage blocked: use defaults */ }
  return base;
}

export function saveDraft(year, draft) {
  try { localStorage.setItem(KEY(year), JSON.stringify(draft)); return true; } catch (e) { return false; }
}

// ── pasted tables (copy cells in Excel, paste into the box) ──
export function parseTable(text, defaults) {
  const lines = String(text || "").split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
  const cells = lines.map(l => l.split(sep).map(c => c.trim()));
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, "");
  const names = Object.keys(defaults);
  const aliases = {};
  names.forEach(n => { aliases[norm(n)] = n; (defaults[n] || []).forEach(a => { aliases[norm(a)] = n; }); });
  const first = cells[0].map(norm);
  const hasHeader = first.filter(h => aliases[h]).length >= 2;
  const cols = hasHeader ? cells[0].map(c => aliases[norm(c)] || null) : names.slice(0, cells[0].length);
  return (hasHeader ? cells.slice(1) : cells).map(r => {
    const o = {};
    cols.forEach((c, i) => { if (c) o[c] = r[i] || ""; });
    return o;
  });
}

export const num = s => { const n = parseFloat(String(s || "").replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };

export const PLAN_COLS = {
  year: ["Year"], type: ["Paper Type", "Type"], status: ["Status"], op: ["Op/OBO", "OBO"], subject: ["Subject", "Title", "Description"],
  strategy: ["Strategy (TP)", "Strategy", "Sourcing strategy"], domain: ["Domain"], dept: ["Department", "User Department", "Users Department"],
  mode: ["Management Mode"], budget: ["Budget", "Estimated Value", "Value"], route: ["Threshold", "Approval route", "Threshold limit"],
};
export const TOP_COLS = { supplier: ["Supplier Name", "Supplier", "Vendor"], scope: ["Contract Title / Scope", "Contract", "Scope"], value: ["Invoiced", "Invoiced (MYR/Mil)", "Spend", "Value"], dept: ["Purchasing Group / Department", "Department", "Group"] };
export const SQM_DONE_COLS = { vendor: ["Vendor Name", "Vendor", "Supplier"], contract: ["Contract", "Contract No"], desc: ["Contract Description", "Description"], owner: ["Contract Owner", "Owner"], date: ["SQM Date", "Date"] };
export const SQM_PLAN_COLS = { vendor: ["Vendor Name", "Vendor", "Supplier"], value: ["Contract Value", "Contract Value (MYR/Mil)", "Value"], desc: ["Contract Description", "Description"], owner: ["Contract Owner", "Owner"] };
export const ORG_COLS = { group: ["Group", "Team", "Column"], role: ["Role", "Position", "Title"], name: ["Name"], pt: ["P/T", "Type", "Contract"] };

// split the free slides: blocks separated by "---"; first line "03 | Title"; "- " lines are bullets
export function parseExtra(text) {
  return String(text || "").split(/^\s*---\s*$/m).map(b => b.trim()).filter(Boolean).map(b => {
    const ls = b.split(/\r?\n/);
    const m = ls[0].match(/^\s*(0[1-7])\s*\|\s*(.*)$/);
    return { sec: m ? m[1] : null, title: m ? m[2] : ls[0], lines: ls.slice(1).filter(l => l.trim()) };
  });
}