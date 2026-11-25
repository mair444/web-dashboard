// Browser entry point: builds the deck and downloads it as a .pptx file.
// Runs fully in the browser; nothing is uploaded anywhere.
import pptxgen from "pptxgenjs";
import { buildSlccData } from "./slccData";
import { buildSlcc } from "./buildSlcc";
import { loadDraft } from "./slccDraft";

export async function generateSlcc(yearFiles, reviewYear, draftOverride) {
  const data = buildSlccData(yearFiles, reviewYear);
  const draft = draftOverride || loadDraft(data);
  const pptx = buildSlcc(new pptxgen(), data, draft);
  await pptx.writeFile({ fileName: `SLCC ${data.P} (generated from MasterTracker).pptx` });
  return data;
}