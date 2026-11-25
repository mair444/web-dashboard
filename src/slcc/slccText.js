// Draft wording generated from the data.
const n0 = n => (n == null ? "—" : String(Math.round(n)));
const pct = n => Math.round(n * 100) + "%";
export function focusAreas(d) {
  const out = [];
  if (d.carry.length) {
    const i = d.carryByStage.indexOf(Math.max(...d.carryByStage));
    out.push({ h: `Clear the ${d.carry.length} tenders carried into ${d.P}`, t: `Most are waiting at ${d.stageOrder[i]} (${d.carryByStage[i]}). The longest-running was open for ${d.oldest[0] ? d.oldest[0].open : "—"} days at year end.` });
  }
  if (d.slowest) {
    out.push({ h: `Shorten the slowest step: ${d.slowest.from} to ${d.slowest.to}`, t: `It averages ${n0(d.slowest.avg)} days. From first paper to Letter of Award the average is ${n0(d.avgAward)} days (median ${n0(d.medAward)}) across ${d.awardDays.length} awarded tenders.` });
  }
  if (d.avgPapersPerYear) {
    out.push({ h: `Plan for about ${n0(d.avgPapersPerYear)} Contract Committee papers in ${d.P}`, t: `This is the yearly average of ${d.years.filter(y => y <= d.R).join(", ")}, over about ${n0(d.avgSittings)} sittings a year.` });
  }
  if (d.topPresenter) {
    out.push({ h: d.topShare > 0.25 ? "Balance the presenting workload" : "Keep the presenting workload spread", t: `${d.topPresenter[0]} presented ${pct(d.topShare)} of the ${d.R} papers; ${d.presenters.length} people presented in total.` });
  }
  if (d.noDept > 0) {
    out.push({ h: "Complete the User's Department field", t: `${d.noDept} tender${d.noDept > 1 ? "s have" : " has"} no department listed, so the plan cannot be fully split by department.` });
  }
  if (d.cur.aborted > 0) {
    out.push({ h: `Review the ${d.cur.aborted} aborted tender${d.cur.aborted > 1 ? "s" : ""}`, t: `${pct(d.cur.aborted / Math.max(1, d.cur.total))} of the ${d.R} tenders were aborted. Record the reasons so they can be avoided.` });
  }
  return out.slice(0, 5);
}

export function recommendations(d) {
  const out = [];
  if (d.carry.length) out.push(["Clear the carry-over early in " + d.P, `${d.carry.length} tenders carried over; the oldest was open ${d.oldest[0] ? d.oldest[0].open : "—"} days`]);
  if (d.slowest) out.push([`Set a target time for ${d.slowest.from} to ${d.slowest.to}`, `Currently the slowest step: about ${n0(d.slowest.avg)} days`]);
  out.push([d.topShare > 0.25 ? "Share the presenting work more evenly" : "Keep the presenting workload balanced", d.topPresenter ? `Top presenter: ${pct(d.topShare)} of papers` : "Based on papers per presenter"]);
  out.push([d.noDept > 0 ? "Fill in the department and use fixed drop-down lists" : "Keep entries consistent with drop-down lists", d.noDept > 0 ? `${d.noDept} tenders have no department listed` : "Consistent names keep every figure accurate"]);
  out.push(["Record supplier and SQM results in the master list", "They are not in the current data, so section 04 needs manual input"]);
  return out.slice(0, 5);
}