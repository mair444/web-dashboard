// Builds the SLCC deck in the layout of the department's previous SLCC deck.
// Everything the dashboard data can fill is filled; the rest comes from the "Fill in content" draft.
// Charts and tables are native PowerPoint objects, so they stay editable.
import { CC_TYPES } from "../tenderModel";
import { fmtDate, keyOf } from "./slccData";
import { parseTable, parseExtra, num, PLAN_COLS, TOP_COLS, SQM_DONE_COLS, SQM_PLAN_COLS, ORG_COLS } from "./slccDraft";

const C = { blue: "009FE3", dark: "3C4043", navy: "0B3FD8", mid: "6B7280", pale: "CFE4F7", pink: "FBD5D5", gold: "FFC000", green: "5FBF8A", grey: "E5E7EB", white: "FFFFFF" };
const FONT = "Arial";
const TYPE_LABEL = { "TP": "Tender Plan", "CFT Issuance": "CFT Issuance", "TER": "TER", "TCEAR": "TCEAR", "CTC": "CTC", "CTC(A&E)": "CTC (A&E)", "CTC(ACV)": "CTC (ACV)", "CE": "CE", "Abort": "Abort" };
const TYPE_COLOR = { "TP": "2B9AD1", "CFT Issuance": "7FB5D6", "TER": "A8D8EE", "TCEAR": "5FBF8A", "CTC": "8FD45A", "CTC(A&E)": "B5E04D", "CTC(ACV)": "C9CCD1", "CE": "17607A", "Abort": "1F5F6B" };
const DOMAIN_COLORS = ["F97316", "3FA800", "EA0000", "0096E0", "7C3AED", "0EA5E9", "F59E0B", "64748B"];
const lines = s => String(s || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const bullet = l => l.replace(/^[-•*]\s*/, "");
const isBullet = l => /^[-•*]\s/.test(l);
const money = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const mil = n => (n / 1e6).toFixed(1) + " mil";
const cut = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const groupBy = (arr, f) => { const m = new Map(); arr.forEach(x => { const k = f(x) || "Not stated"; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };

export function buildSlcc(pptx, d, draft) {
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = `SLCC ${d.P}`;
  pptx.author = "MasterTracker";
  const R = d.R, P = d.P;
  const extras = parseExtra(draft.extra);
  const plan = parseTable(draft.plan, PLAN_COLS);
  const top = parseTable(draft.topSuppliers, TOP_COLS);
  const sqmDone = parseTable(draft.sqmDone, SQM_DONE_COLS);
  const sqmPlan = parseTable(draft.sqmPlan, SQM_PLAN_COLS);
  const org = parseTable(draft.org, ORG_COLS);
  const spend = lines(draft.spend).map(l => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ""]; });
  let count = 0;

  const logo = s => { if (draft.logo) s.addImage({ data: draft.logo, x: 11.3, y: 0.3, w: 1.7, h: 0.8, sizing: { type: "contain", w: 1.7, h: 0.8 } }); };
  const foot = s => {
    count++;
    s.addText([{ text: String(count), options: { bold: true } }, { text: "   |   " + draft.ref }], { x: 0.5, y: 7.05, w: 8, h: 0.3, fontFace: FONT, fontSize: 9, color: C.dark });
  };
  const slide = (title, sub, big) => {
    const s = pptx.addSlide(); s.background = { color: C.white }; logo(s);
    if (title) s.addText(title, { x: 0.5, y: 0.3, w: 10.5, h: sub ? 0.6 : 0.8, fontFace: FONT, fontSize: big ? 30 : 26, bold: !!big, color: big ? C.navy : C.blue, valign: "middle" });
    if (sub) s.addText(sub, { x: 0.5, y: 0.85, w: 10.5, h: 0.4, fontFace: FONT, fontSize: 15, bold: true, color: C.navy });
    foot(s); return s;
  };
  const divider = (num, title) => {
    const s = pptx.addSlide(); s.background = { color: C.white }; logo(s);
    s.addText(num + ".", { x: 0.8, y: 1.8, w: 8, h: 2.2, fontFace: FONT, fontSize: 120, color: C.blue });
    s.addText(title, { x: 0.8, y: 4.0, w: 11, h: 0.9, fontFace: FONT, fontSize: 36, color: C.blue });
    foot(s);
  };
  const bullets = (s, ls, o) => s.addText(ls.map(l => ({ text: bullet(l), options: { bullet: { type: o && o.numbered ? "number" : "bullet" }, breakLine: true, paraSpaceAfter: 6 } })),
    { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: FONT, fontSize: o.size || 18, color: C.dark, valign: "top" });
  const th = (t, extra) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.blue }, align: "center", ...extra } });
  const note = (s, t, y) => s.addText(t, { x: 0.5, y: y || 6.55, w: 12.3, h: 0.4, fontFace: FONT, fontSize: 11, italic: true, color: C.mid });
  // free-text slides (Suppliers Day, domain scope and constraints, etc.) for a section
  const extraFor = sec => extras.filter(e => e.sec === sec).forEach(e => {
    const s = slide(e.title, null, true);
    const parts = [];
    e.lines.forEach(l => {
      if (isBullet(l)) parts.push({ text: bullet(l), options: { bullet: true, breakLine: true, fontSize: 16, color: C.dark, paraSpaceAfter: 5 } });
      else parts.push({ text: l, options: { breakLine: true, bold: true, fontSize: 18, color: C.navy, paraSpaceBefore: 8, paraSpaceAfter: 4 } });
    });
    s.addText(parts, { x: 0.6, y: 1.4, w: 12, h: 5.4, fontFace: FONT, valign: "top" });
  });
  const placeholder = (title, what) => {
    if (draft.skipEmpty) return;
    const s = slide(title, null, true);
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.8, w: 11.7, h: 4, fill: { color: "FFF7E0" }, line: { color: C.gold, dashType: "dash", width: 1.5 } });
    s.addText("To be filled in\n" + what, { x: 0.8, y: 1.8, w: 11.7, h: 4, align: "center", valign: "middle", fontFace: FONT, fontSize: 20, color: "92400E" });
  };
  const tableSlides = (title, header, rows, colW, opts) => {
    const per = (opts && opts.per) || 12;
    for (let i = 0; i < rows.length; i += per) {
      const s = slide(title + (rows.length > per ? ` (${Math.floor(i / per) + 1}/${Math.ceil(rows.length / per)})` : ""), null, true);
      s.addTable([header.map(h => th(h, { fontSize: 11 })), ...rows.slice(i, i + per).map(r => r.map((c, j) => ({ text: String(c), options: { fontSize: 10.5, color: C.dark, fill: { color: (opts && opts.fill) || C.pale }, align: j === 1 || (opts && opts.left && opts.left.includes(j)) ? "left" : "center" } })))],
        { x: 0.5, y: 1.4, w: 12.3, colW, fontFace: FONT, border: { type: "solid", color: C.white, pt: 1 }, valign: "middle" });
    }
  };

  // ── Title ──
  { const s = pptx.addSlide(); s.background = { color: C.white }; logo(s);
    s.addText("TEPMY", { x: 0.7, y: 1.2, w: 9, h: 0.9, fontFace: FONT, fontSize: 44, bold: true, color: C.blue });
    s.addText("Procurement\nStrategic Local Contract Committee - SLCC", { x: 0.7, y: 2.1, w: 11, h: 1.5, fontFace: FONT, fontSize: 28, bold: true, color: C.blue, valign: "top" });
    s.addText(String(R), { x: 0.7, y: 3.9, w: 5, h: 1, fontFace: FONT, fontSize: 44, bold: true, color: C.blue });
    s.addText(`Generated from MasterTracker · ${fmtDate(d.generated)}`, { x: 0.7, y: 6.7, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: C.mid });
    count++; }
  // ── Summary ──
  { const s = slide("Summary");
    ["01.Objectives and Formal Approval", "02.Main Highlights from Previous Year", `03.Master Procurement Plan ${P}`, "04.Key Suppliers and SQM", "05.Organization and Resources", `06.Key Focus Area in ${P}`, "07.Recommendations and Approvals"]
      .forEach((t, i) => s.addText(t, { x: 0.8, y: 1.3 + i * 0.75, w: 9, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.dark })); }

  // ── 01 ──
  divider("01", "Objectives and Formal Approval");
  { const s = slide("Objective"); bullets(s, lines(draft.objectives), { x: 0.9, y: 1.5, w: 11.5, h: 5, numbered: true, size: 20 }); }
  extraFor("01");

  // ── 02 ──
  divider("02", `Main Highlights for ${R}`);
  { const s = slide(`Main Highlights of ${R}`); bullets(s, lines(draft.agenda), { x: 0.9, y: 1.5, w: 11.5, h: 4, size: 20 }); }
  extraFor("02");

  // Contract Committee key figures (same layout as the previous deck)
  const types = CC_TYPES.filter(t => d.monthlyByType[t].some(n => n > 0));
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  { const s = slide(`CONTRACT COMMITTEE ${R}`, "Monthly Sittings & Papers by Category", true);
    s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.4, w: 12.3, h: 4.3, fill: { color: "E2E2E2" }, line: { color: "E2E2E2" } });
    s.addChart(pptx.charts.BAR, types.map(t => ({ name: TYPE_LABEL[t], labels: MON, values: d.monthlyByType[t] })), {
      x: 0.6, y: 2.2, w: 12.1, h: 3.5, barGrouping: "stacked", chartColors: types.map(t => TYPE_COLOR[t]), showLegend: true, legendPos: "l", legendFontSize: 11, legendFontFace: FONT,
      catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, valGridLine: { color: "D0D0D0", size: 0.5 }, barGapWidthPct: 60 });
    s.addText([{ text: "Total ", options: { color: C.dark } }, { text: String(d.cur.sittings), options: { color: C.blue } }, { text: ` sittings in ${R}`, options: { color: C.dark, breakLine: true } },
      { text: "Total ", options: { color: C.dark } }, { text: String(d.cur.cc.total), options: { color: C.blue } }, { text: " papers presented", options: { color: C.dark } }],
      { x: 8.8, y: 1.45, w: 3.9, h: 0.75, fontFace: FONT, fontSize: 16, bold: true, align: "right" });
    const w = Math.min(1.5, 12.3 / types.length - 0.1);
    types.forEach((t, i) => {
      s.addShape(pptx.ShapeType.roundRect, { x: 0.5 + i * (w + 0.1), y: 5.85, w, h: 1.1, fill: { color: C.green }, rectRadius: 0.06 });
      s.addText(TYPE_LABEL[t], { x: 0.55 + i * (w + 0.1), y: 5.88, w: w - 0.1, h: 0.35, fontFace: FONT, fontSize: 11, bold: true, color: C.white });
      s.addText(String(d.monthlyByType[t].reduce((a, b) => a + b, 0)), { x: 0.5 + i * (w + 0.1), y: 6.2, w: w - 0.1, h: 0.7, fontFace: FONT, fontSize: 28, bold: true, color: C.white, align: "right" });
    }); }

  // Dashboard review: status, change vs previous year, average papers per department
  { const s = slide("PROCUREMENT DASHBOARD", `Tenders and trends (${R})`, true);
    const tiles = [["Tenders", d.cur.total, d.prev && d.prev.total], ["CC papers", d.cur.cc.total, d.prev && d.prev.cc.total], ["Sittings", d.cur.sittings, d.prev && d.prev.sittings], ["Awarded (LOA)", d.awarded.length, null]];
    tiles.forEach(([l, v, pv], i) => {
      s.addShape(pptx.ShapeType.roundRect, { x: 0.5 + i * 3.1, y: 1.5, w: 2.9, h: 1.3, fill: { color: i % 2 ? "1570D8" : "0B3FD8" }, rectRadius: 0.08 });
      s.addText(l.toUpperCase(), { x: 0.65 + i * 3.1, y: 1.55, w: 2.6, h: 0.35, fontFace: FONT, fontSize: 11, color: C.white });
      s.addText(String(v), { x: 0.65 + i * 3.1, y: 1.85, w: 2.6, h: 0.6, fontFace: FONT, fontSize: 30, bold: true, color: C.white });
      s.addText(pv != null ? `${v >= pv ? "▲" : "▼"} ${Math.abs(v - pv)} vs ${R - 1}` : "", { x: 0.65 + i * 3.1, y: 2.4, w: 2.6, h: 0.3, fontFace: FONT, fontSize: 10, color: "DCE8FF" });
    });
    const st = [["Awarded", d.cur.awarded], ["Ongoing", d.cur.ongoing], ["Pending", d.cur.pending], ["Aborted", d.cur.aborted]].filter(x => x[1] > 0);
    s.addChart(pptx.charts.DOUGHNUT, [{ name: "Status", labels: st.map(x => x[0]), values: st.map(x => x[1]) }], { x: 0.5, y: 3.0, w: 4.4, h: 3.6, chartColors: ["0B3FD8", "5FBF8A", "FFC000", "EA0000"], holeSize: 55, showLegend: true, legendPos: "b", legendFontSize: 11, showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 11 });
    const dp = d.named.slice(0, 8);
    s.addText("Average papers per year, by user department", { x: 5.2, y: 3.0, w: 7.6, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: C.blue });
    if (dp.length) s.addChart(pptx.charts.BAR, [{ name: `${R}`, labels: dp.map(x => cut(x.name, 22)), values: dp.map(x => x.papers) }, { name: "Yearly average", labels: dp.map(x => cut(x.name, 22)), values: dp.map(x => Math.round(x.avgPapers * 10) / 10) }],
      { x: 5.2, y: 3.35, w: 7.6, h: 3.3, barDir: "bar", chartColors: ["0B3FD8", "9CC8F5"], showLegend: true, legendPos: "b", legendFontSize: 10, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, catAxisOrientation: "maxMin", valGridLine: { color: "E5E7EB", size: 0.5 } });
    note(s, d.partial ? `${R} is still in progress: figures are year to date.` : "", 6.7); }

  // Contract awards (LOA) – supplier and value come from the fill-in panel
  if (d.awarded.length) {
    const info = draft.awards || {};
    const get = t => info[keyOf(t)] || {};
    const hasSup = d.awarded.some(t => get(t).supplier), hasVal = d.awarded.some(t => get(t).value);
    const header = ["No.", "Tender", "User Dept", "LOA date", ...(hasSup ? ["Supplier"] : []), ...(hasVal ? ["Value (MYR)"] : [])];
    const rows = d.awarded.map((t, i) => [i + 1, cut(t.no ? `${t.no} – ${t.title}` : t.title, 70), cut(t.dept || "—", 18), fmtDate(t.loaDate), ...(hasSup ? [get(t).supplier || ""] : []), ...(hasVal ? [get(t).value || ""] : [])]);
    const colW = hasSup || hasVal ? [0.5, 5.4, 1.8, 1.4, ...(hasSup ? [2] : []), ...(hasVal ? [1.5] : [])] : [0.6, 7.7, 2.2, 1.8];
    const sc = colW.reduce((a, b) => a + b, 0); tableSlides(`CONTRACTS AWARDED IN ${R}`, header, rows, colW.map(w => w * 12.3 / sc), { per: 15, left: [1] });
  }

  // Spend dashboard, PO/RO, top suppliers: not in the Excel, so they come from the fill-in panel
  if (spend.length) {
    const s = slide("PROCUREMENT DASHBOARD", `Key figures (${R})`, true);
    const per = Math.min(4, spend.length);
    spend.slice(0, 8).forEach(([l, v], i) => {
      const x = 0.5 + (i % 4) * 3.1, y = 1.6 + Math.floor(i / 4) * 1.7;
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.9, h: 1.5, fill: { color: i % 2 ? "1570D8" : "0B3FD8" }, rectRadius: 0.08 });
      s.addText(l.toUpperCase(), { x: x + 0.15, y: y + 0.1, w: 2.6, h: 0.4, fontFace: FONT, fontSize: 11, color: C.white });
      s.addText(v, { x: x + 0.15, y: y + 0.5, w: 2.6, h: 0.8, fontFace: FONT, fontSize: 28, bold: true, color: C.white });
    });
    if (per) note(s, "Figures entered manually (Fill in content).", 6.6);
  }
  if (top.length) tableSlides("LIST OF TOP 20 SUPPLIERS BY SPEND", ["No.", "Supplier Name", "Contract Title / Scope", "Invoiced (MYR/Mil)", "Purchasing Group / Department"],
    top.map((r, i) => [i + 1, r.supplier, cut(r.scope, 90), r.value, r.dept]), [0.5, 3, 5.3, 1.5, 2], { per: 10, fill: C.white, left: [1, 2] });
  else if (!spend.length) placeholder("PROCUREMENT DASHBOARD", "Spend, awards value, PO/RO figures and Top 20 suppliers are not in the Excel file.\nOpen \"Fill in content\" to add them.");

  // ── 03 Master Procurement Plan ──
  divider("03", "Master Procurement Plan (18 Months)");
  if (plan.length) {
    const byDom = groupBy(plan, r => r.domain), doms = [...byDom.entries()];
    const total = sum(plan, r => num(r.budget));
    { const s = slide(`${P} MASTER PROCUREMENT PLAN`, "BY DOMAIN", true);
      s.addChart(pptx.charts.DOUGHNUT, [{ name: "Contracts", labels: doms.map(x => x[0]), values: doms.map(x => x[1].length) }], { x: 0.5, y: 1.5, w: 5.4, h: 4, chartColors: DOMAIN_COLORS, holeSize: 55, showLegend: true, legendPos: "b", legendFontSize: 11, showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 12 });
      s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 5.7, w: 2.5, h: 1.1, fill: { color: "F7A5A5" }, rectRadius: 0.06 });
      s.addText([{ text: "TOTAL CONTRACT", options: { fontSize: 11, bold: true, breakLine: true } }, { text: String(plan.length), options: { fontSize: 30 } }], { x: 0.7, y: 5.7, w: 2.5, h: 1.1, align: "center", fontFace: FONT, color: C.dark });
      if (total) { s.addShape(pptx.ShapeType.roundRect, { x: 3.4, y: 5.7, w: 2.5, h: 1.1, fill: { color: "F7A5A5" }, rectRadius: 0.06 });
        s.addText([{ text: "Est. VALUE (MYR)", options: { fontSize: 11, bold: true, breakLine: true } }, { text: mil(total), options: { fontSize: 26 } }], { x: 3.4, y: 5.7, w: 2.5, h: 1.1, align: "center", fontFace: FONT, color: C.dark }); }
      doms.slice(0, 4).forEach(([name, rows], i) => {
        const x = 6.5 + (i % 2) * 3.3, y = 1.7 + Math.floor(i / 2) * 2.4;
        s.addText(Math.round(rows.length / plan.length * 100) + "%", { x, y, w: 3, h: 0.8, fontFace: FONT, fontSize: 40, bold: true, color: DOMAIN_COLORS[i] });
        s.addText(name, { x, y: y + 0.8, w: 3, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color: C.blue });
        s.addText(`${rows.length} contract${rows.length === 1 ? "" : "s"}${total ? " · " + mil(sum(rows, r => num(r.budget))) : ""}`, { x, y: y + 1.3, w: 3, h: 0.4, fontFace: FONT, fontSize: 12, color: C.dark });
      }); }
    const hasDept = plan.some(r => r.dept);
    if (hasDept) { const bd = [...groupBy(plan, r => r.dept).entries()].sort((a, b) => b[1].length - a[1].length);
      const s = slide("MASTER PROCUREMENT PLAN", "NO. OF INITIATIVES / CONTRACTS BY DEPARTMENT", true);
      s.addChart(pptx.charts.PIE, [{ name: "Contracts", labels: bd.map(x => x[0]), values: bd.map(x => x[1].length) }], { x: 0.5, y: 1.5, w: 7.5, h: 5.2, showLegend: true, legendPos: "r", legendFontSize: 11, showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 11 });
      s.addTable([[th("Department"), th("Contract Nos.")], ...bd.map(x => [{ text: x[0], options: { align: "center", fill: { color: C.pale } } }, { text: String(x[1].length), options: { bold: true, align: "center", fill: { color: C.pale } } }])], { x: 8.5, y: 1.6, w: 4.3, colW: [2.8, 1.5], fontFace: FONT, fontSize: 12, color: C.dark, border: { type: "solid", color: C.white, pt: 1 } }); }
    if (plan.some(r => r.route)) { const routes = [...new Set(plan.map(r => r.route).filter(Boolean))];
      const s = slide("MASTER PROCUREMENT PLAN", "Contracts by Threshold Limit", true);
      s.addChart(pptx.charts.BAR, routes.map(rt => ({ name: rt, labels: doms.map(x => x[0]), values: doms.map(x => x[1].filter(r => r.route === rt).length) })), { x: 0.5, y: 1.5, w: 12.3, h: 5, showLegend: true, legendPos: "r", showValue: true, valGridLine: { color: "E5E7EB", size: 0.5 }, catAxisLabelFontSize: 12 }); }
    if (total) { const s = slide("MASTER PROCUREMENT PLAN", "Estimated Value by Domain (MYR)", true);
      s.addChart(pptx.charts.BAR, [{ name: "Estimated Contract Value", labels: doms.map(x => `${x[0]} (${x[1].length})`), values: doms.map(x => sum(x[1], r => num(r.budget))) }], { x: 0.5, y: 1.5, w: 12.3, h: 5, barDir: "bar", chartColors: ["F97316"], showValue: true, dataLabelFormatCode: "#,##0", valAxisLabelFormatCode: "#,##0", showLegend: false, catAxisOrientation: "maxMin", valGridLine: { color: "E5E7EB", size: 0.5 } }); }
    extraFor("03");
    doms.forEach(([name, rows]) => tableSlides(`Procurement Plan – ${name.toUpperCase()}`, ["Year", "Paper Type", "Status", "Op/OBO", "Subject", "Strategy (TP)", "Management Mode", "Budget"],
      rows.map(r => [r.year, r.type, r.status, r.op, cut(r.subject, 85), r.strategy, r.mode, num(r.budget) ? money(num(r.budget)) : r.budget].map(v => v == null ? "" : v)), [0.6, 1.5, 1.2, 1, 4.1, 1.6, 1.2, 1.1], { per: 12, fill: C.pink, left: [4] }));
  } else { placeholder(`${P} MASTER PROCUREMENT PLAN`, "The plan list (new initiatives with domain, strategy and budget) is not in the CC Master List.\nPaste it in \"Fill in content\" and the charts and tables are built automatically."); extraFor("03"); }

  // Carry-over from the dashboard data (always available)
  { const s = slide(`TENDERS CARRIED INTO ${P}`, `Open at 31 Dec ${R}: ${d.carry.length} tenders`, true);
    s.addChart(pptx.charts.BAR, [{ name: "Tenders", labels: d.stageOrder, values: d.carryByStage }], { x: 0.5, y: 1.5, w: 5.6, h: 4.6, chartColors: ["0B3FD8"], showValue: true, showLegend: false, valGridLine: { color: "E5E7EB", size: 0.5 }, catAxisLabelFontSize: 11 });
    s.addText("Longest-running", { x: 6.4, y: 1.45, w: 6, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: C.blue });
    s.addTable([["Tender", "Dept", "Stage", "Days open"].map(h => th(h, { fontSize: 10 })), ...d.oldest.map(o => [cut(o.no ? o.no + " – " + o.title : o.title, 46), cut(o.dept, 14), o.stage, o.open].map((c, j) => ({ text: String(c), options: { fontSize: 9.5, align: j === 0 ? "left" : "center", fill: { color: C.pale }, color: C.dark } })))],
      { x: 6.4, y: 1.85, w: 6.4, colW: [3.2, 1.2, 1, 1], fontFace: FONT, border: { type: "solid", color: C.white, pt: 1 } }); }

  // ── 04 Key suppliers and SQM ──
  divider("04", "Key Suppliers and SQM");
  { const s = slide("Key Suppliers and Service Quality Meeting", null, true); s.addText("", { x: 0, y: 0, w: 0.1, h: 0.1 });
    bullets(s, lines(draft.sqmIntro), { x: 0.6, y: 1.6, w: 12, h: 4.5, numbered: true, size: 18 }); }
  extraFor("04");
  if (sqmDone.length) tableSlides(`Completed SQM for ${R}`, ["VENDOR NAME", "CONTRACT", "CONTRACT DESCRIPTION", "CONTRACT OWNER", "SQM DATE"], sqmDone.map(r => [r.vendor, r.contract, r.desc, r.owner, r.date]), [2.4, 1.8, 4.9, 1.8, 1.4], { per: 10, fill: C.white, left: [0, 2] });
  else placeholder(`Completed SQM for ${R}`, "Add the completed SQMs (vendor, contract, owner, date) in \"Fill in content\".");
  if (sqmPlan.length) tableSlides(`Planned SQM for ${P}`, ["No.", "VENDOR NAME", "CONTRACT VALUE (MYR/Mil)", "CONTRACT DESCRIPTION", "CONTRACT OWNER"], sqmPlan.map((r, i) => [i + 1, r.vendor, r.value, cut(r.desc, 90), r.owner]), [0.5, 2.6, 1.7, 5.7, 1.8], { per: 14, fill: C.white, left: [1, 3] });
  else placeholder(`Planned SQM for ${P}`, "Add the planned SQM list in \"Fill in content\".");

  // ── 05 Organization ──
  divider("05", "Organization and Resources");
  if (org.length) {
    const s = slide("Procurement Organization Chart"); const groups = [...groupBy(org, r => r.group).entries()];
    const w = Math.min(2.5, 12.3 / groups.length - 0.15);
    groups.forEach(([g, rows], gi) => rows.slice(0, 6).forEach((r, i) => {
      const x = 0.5 + gi * (w + 0.15), y = 1.5 + i * 0.95;
      s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.85, fill: { color: i === 0 ? "A9BCC4" : "C9ECFC" }, line: { color: C.white } });
      s.addText([{ text: r.role, options: { bold: true, fontSize: 9.5, breakLine: true } }, { text: r.name + (r.pt ? `  (${r.pt})` : ""), options: { fontSize: 9 } }], { x, y, w, h: 0.85, align: "center", valign: "middle", fontFace: FONT, color: C.dark });
    })); note(s, "P = Permanent, T = Temporary contract", 6.7);
  } else placeholder("Procurement Organization Chart", "Add the team (group, role, name) in \"Fill in content\".");
  { const s = slide(`CC papers presented in ${R}`, `${d.presenters.length} presenters`, true);
    const pr = d.presenters.slice(0, 10);
    if (pr.length) s.addChart(pptx.charts.BAR, [{ name: "Papers", labels: pr.map(p => cut(p[0], 24)), values: pr.map(p => p[2].papers) }], { x: 0.5, y: 1.5, w: 12.3, h: 5, barDir: "bar", chartColors: ["0B3FD8"], showValue: true, showLegend: false, catAxisOrientation: "maxMin", valGridLine: { color: "E5E7EB", size: 0.5 } }); }
  extraFor("05");

  // ── 06 Key focus ──
  divider("06", `Key Focus Area in ${P}`);
  { const boxes = String(draft.focus).split(/\n\s*\n/).map(b => lines(b)).filter(b => b.length).slice(0, 6);
    const s = slide(`${boxes.length} KEY FOCUS AREA IN ${P}`, null, false); s.addText("Procurement Department", { x: 0.5, y: 0.85, w: 10, h: 0.35, fontFace: FONT, fontSize: 14, color: C.mid });
    const bw = 6.0, bh = boxes.length > 4 ? 1.7 : 2.55, cols = 2;
    boxes.forEach((b, i) => { const x = 0.5 + (i % cols) * (bw + 0.3), y = 1.5 + Math.floor(i / cols) * (bh + 0.2);
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: bw, h: bh, fill: { color: "FBDADA" }, rectRadius: 0.1 });
      s.addText([{ text: b[0], options: { bold: true, fontSize: 16, color: C.blue, breakLine: true, paraSpaceAfter: 4 } }, ...b.slice(1).map(l => ({ text: bullet(l), options: { bullet: true, fontSize: 12, color: C.dark, breakLine: true } }))], { x: x + 0.2, y: y + 0.1, w: bw - 0.4, h: bh - 0.2, fontFace: FONT, valign: "top", shrinkText: true }); });
    const fd = lines(draft.focusData);
    if (fd.length) { const s2 = slide("Pointers from the dashboard data", `Evidence for the ${P} focus areas`, true); bullets(s2, fd, { x: 0.7, y: 1.6, w: 12, h: 5, size: 16 }); } }
  extraFor("06");

  // ── 07 ──
  divider("07", "Recommendations and Approvals");
  { const s = slide("Recommendations"); bullets(s, lines(draft.recs), { x: 0.9, y: 1.5, w: 11.5, h: 5, size: 18 }); }
  { const s = slide("Approval"); const ls = lines(draft.approval);
    s.addText(ls[0] || "", { x: 0.9, y: 1.5, w: 11.5, h: 0.9, fontFace: FONT, fontSize: 20, color: C.dark, valign: "top" });
    bullets(s, ls.slice(1), { x: 0.9, y: 2.5, w: 11.5, h: 3, size: 20 }); }
  extraFor("07");
  { const s = slide(null); s.addText("THANK YOU", { x: 0.5, y: 2.6, w: 12.3, h: 1, align: "center", fontFace: FONT, fontSize: 40, bold: true, color: C.navy });
    s.addText("[Procurement Department]", { x: 0.5, y: 3.6, w: 12.3, h: 0.6, align: "center", fontFace: FONT, fontSize: 20, bold: true, color: C.navy }); }
  return pptx;
}

// which parts are filled, for the checklist in the panel
export function checklist(d, draft) {
  const t = (s, c) => parseTable(s, c).length;
  return [
    ["Contract Committee figures, tenders, awards, carry-over, presenters", "auto", true],
    ["Spend dashboard figures", "manual", lines(draft.spend).length > 0],
    ["Top 20 suppliers", "manual", t(draft.topSuppliers, TOP_COLS) > 0],
    [`Master Procurement Plan ${d.P} (charts and tables)`, "manual", t(draft.plan, PLAN_COLS) > 0],
    [`Completed SQM ${d.R}`, "manual", t(draft.sqmDone, SQM_DONE_COLS) > 0],
    [`Planned SQM ${d.P}`, "manual", t(draft.sqmPlan, SQM_PLAN_COLS) > 0],
    ["Organization chart", "manual", t(draft.org, ORG_COLS) > 0],
    ["Extra slides (Suppliers Day, domain scope, etc.)", "manual", parseExtra(draft.extra).length > 0],
  ];
}