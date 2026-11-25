// ── MasterTrack backend server ──────────────────────────────────────────────
// Reads the master tender-tracking Excel file directly off disk and serves it
// as parsed JSON. No browser permission prompts, no folder pickers — this runs
// as a plain Node process and just reads the file the same way any desktop
// app would. MASTERLIST_FOLDERS lists every folder to check, in order — the
// first folder that contains a matching file wins.

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const app = express();
app.use(cors());

// ── CONFIGURE THIS ──────────────────────────────────────────────────────────
// The folder holding "CC Master List (FINAL).xlsx" (and the LOA submission file)
// is set with the MASTERLIST_FOLDER environment variable, so no personal or
// machine-specific path is stored in the code. The server checks that folder
// (and its sub-folders) for the file.
//   Windows (cmd):  set MASTERLIST_FOLDER=C:\path\to\folder
//   Linux:          export MASTERLIST_FOLDER=/path/to/folder
//   (or Environment=MASTERLIST_FOLDER=... in the systemd service file)
const MASTERLIST_FOLDERS = [
  process.env.MASTERLIST_FOLDER,
].filter(Boolean);

if (MASTERLIST_FOLDERS.length === 0) {
  console.warn("MASTERLIST_FOLDER is not set - set it to the folder that contains the CC Master List file.");
}

const PORT = process.env.PORT || 4000;

// ── File finding ─────────────────────────────────────────────────────────
function isExcelFile(name) {
  if (name.startsWith("~$")) return false; // Excel lock file while the workbook is open
  if (/copy/i.test(name)) return false;     // ignore "- Copy" duplicates so they never replace the real file
  const lower = name.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function looksLikeMasterList(name) {
  const lower = name.toLowerCase();
  const hasMasterList = lower.includes("master") && lower.includes("list");
  const hasMomPrefix = lower.includes("mom");
  const hasCcPrefix = lower.includes("cc");
  // Match either "MOM Master List" or "CC Master List" naming patterns
  return hasMasterList && (hasMomPrefix || hasCcPrefix);
}

function findMasterListFileInFolder(folder, depth = 0, seen = []) {
  if (depth > 4 || !fs.existsSync(folder)) return { filePath: null, seen };
  const entries = fs.readdirSync(folder, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isFile() && isExcelFile(entry.name)) {
      seen.push(entry.name);
      if (looksLikeMasterList(entry.name)) {
        return { filePath: fullPath, seen };
      }
    } else if (entry.isDirectory()) {
      const result = findMasterListFileInFolder(fullPath, depth + 1, seen);
      if (result.filePath) return result;
    }
  }
  return { filePath: null, seen };
}

// Tries each candidate folder in order, returns the first match.
function findMasterListFile() {
  let allSeen = [];
  for (const folder of MASTERLIST_FOLDERS) {
    const { filePath, seen } = findMasterListFileInFolder(folder);
    allSeen = allSeen.concat(seen);
    if (filePath) return { filePath, seen: allSeen, folderUsed: folder };
  }
  return { filePath: null, seen: allSeen };
}

// ── Parsing logic (ported from Tracker.js — kept identical on purpose) ─────
function yearFromSheetName(name) {
  const m = String(name || "").match(/20\d{2}/);
  return m ? parseInt(m[0]) : null;
}

function yearFromFilename(name) {
  const m = String(name || "").match(/20\d{2}/);
  return m ? parseInt(m[0]) : null;
}

function yearFromRows(rows) {
  const dateKeys = ["Date", "Attendance List", "Start_Date", "End_Date"];
  for (const row of rows) {
    for (const key of dateKeys) {
      const raw = row[key];
      if (!raw) continue;
      let d;
      if (!isNaN(raw) && Number(raw) > 1000) {
        d = new Date(Math.round((Number(raw) - 25569) * 86400 * 1000));
      } else {
        d = new Date(raw);
      }
      if (!isNaN(d) && d.getFullYear() > 1990 && d.getFullYear() < 2100) return d.getFullYear();
    }
  }
  return null;
}

const CANONICAL_PAPER_TYPES = {
  "tp": "TP",
  "tender plan": "TP",
  "cft issuance": "CFT Issuance",
  "cft": "CFT Issuance",
  "ter": "TER",
  "tcear": "TCEAR",
  "ctc": "CTC",
  "ctc(a&e)": "CTC(A&E)",
  "ctc (a&e)": "CTC(A&E)",
  "ctc a&e": "CTC(A&E)",
  "ctc(acv)": "CTC(ACV)",
  "ctc (acv)": "CTC(ACV)",
  "ctc acv": "CTC(ACV)",
  "ce": "CE",
  "abort": "Abort",
  "aborted": "Abort",
};

function canonicalisePaperType(raw) {
  if (!raw) return "";
  const key = String(raw).toLowerCase().trim();
  return CANONICAL_PAPER_TYPES[key] || String(raw).trim();
}

const KEEP_UPPER = new Set(["HSE", "IT", "PR", "CC", "TER", "TCEAR", "CTC", "TP", "CE", "CFT", "HQ", "QA", "QC"]);

function titleCase(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  return s.replace(/\w\S*/g, (w) => {
    const upper = w.toUpperCase();
    if (KEEP_UPPER.has(upper.replace(/[^A-Z]/g, ""))) return upper;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

function normaliseSheetRows(raw) {
  return raw
    .filter((row) => Object.keys(row).length > 0)
    .map((item, index) => {
      const r = {};
      Object.keys(item).forEach((k) => {
        r[k.toLowerCase().trim()] = item[k];
      });
      const get = (...keys) => {
        for (const k of keys) {
          const v = r[k.toLowerCase().trim()];
          if (v !== undefined && v !== "") return v;
        }
        return "";
      };
      const paperTypeRaw = canonicalisePaperType(get("paper type", "paper_type"));
      const subjectRaw = get("subject");
      const presenterRaw = get("presenter", "buyer");

      return {
        ID: index + 1,
        PR_Number: get("pr_number", "pr number"),
        "Tender Title": titleCase(get("tender title", "tender_title")),
        // FIX: .trim() added so stray leading/trailing spaces in the Excel
        // cell don't make the same tender look like two different tenders.
        "Tender No": get("tender no", "tender_no", "tender number").toString().trim().toUpperCase(),
        "Paper Type": paperTypeRaw || canonicalisePaperType(subjectRaw),
        Subject: titleCase(subjectRaw || paperTypeRaw),
        Presenter: titleCase(presenterRaw),
        Buyer: titleCase(presenterRaw),
        User: titleCase(get("user")),
        Department: titleCase(get("user's department", "user department", "dept", "department")),
        "Attendance List": get("attendance list", "attendance_list", "date"),
        Date: get("date", "attendance list", "attendance_list"),
        Week: get("week").toString().trim().toUpperCase(),
        Status: titleCase(get("status")) || "Not Started",
        Phase: titleCase(get("phase")) || "Phase 1 - Req Creation",
        Start_Date: get("start_date", "start date"),
        End_Date: get("end_date", "end date"),
        LOA_Date: get("loa date", "loa_date", "letter of award date", "award date", "date of award", "loa"),
      };
    });
}

// ── LOA (Letter of Award) — the FINAL phase of the paper trail ─────────────
// LOA rows can come from three places (first one wins per tender):
//   1. a sheet inside the master workbook named like "LOA_Data" / "Letter_Of_Award"
//   2. a standalone "Letter Of Award Submission.xlsx" in any of the folders above
//   3. an "LOA Date" column on the year tabs
// Each LOA becomes a normal row with Paper Type "LOA", placed in the year of its
// LOA date, so every page of the dashboard receives it without extra plumbing.
const LOA_NAME_RE = /letter.?of.?award|(^|[^a-z])loa([^a-z]|$)/i;

const normHeader = (v) =>
  String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function looseDate(v) {
  if (v === "" || v == null) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "number") {
    return v > 1000 ? new Date(Math.round((v - 25569) * 86400 * 1000)) : null;
  }
  const s = String(v).trim();
  if (/^\d{4,6}(\.\d+)?$/.test(s) && Number(s) > 1000) {
    return new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
  }
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/); // dd/mm/yyyy
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const toSerial = (d) => Math.round(d.getTime() / 86400000 + 25569);

// Finds the header row (it may not be row 1) and reads the LOA records below it.
function parseLoaMatrix(matrix) {
  const preview = matrix.slice(0, 8).map((r) => r.slice(0, 8).map((c) => String(c).slice(0, 40)));
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const heads = (matrix[i] || []).map(normHeader);
    const find = (re) => heads.findIndex((h) => re.test(h));
    const cNo = find(/^tender (no|number|num|ref|reference)\b|^tender$/);
    let cDate = find(/(loa|award).*date|date.*(loa|award)/);
    if (cDate < 0) cDate = find(/\bdate\b/);
    if (cNo < 0 || cDate < 0) continue;
    const cTitle = find(/title|description|subject/);
    const cBuyer = find(/buyer|presenter|procurement/);
    const cDomain = find(/domain/);

    const records = [];
    let skippedNoDate = 0;
    matrix.slice(i + 1).forEach((r) => {
      const no = String(r[cNo] == null ? "" : r[cNo]).trim().toUpperCase();
      const title = cTitle >= 0 ? String(r[cTitle] == null ? "" : r[cTitle]).trim() : "";
      if (!no && !title) return;
      const date = looseDate(r[cDate]);
      if (!date) { skippedNoDate++; return; }
      records.push({
        no,
        title,
        buyer: cBuyer >= 0 ? String(r[cBuyer] == null ? "" : r[cBuyer]).trim() : "",
        domain: cDomain >= 0 ? String(r[cDomain] == null ? "" : r[cDomain]).trim() : "",
        date,
      });
    });
    return { headerRow: i + 1, records, skippedNoDate, preview };
  }
  return { headerRow: null, records: [], skippedNoDate: 0, preview };
}

function findLoaFiles() {
  const found = [];
  const walk = (folder, depth) => {
    if (depth > 2 || !fs.existsSync(folder)) return;
    let entries = [];
    try { entries = fs.readdirSync(folder, { withFileTypes: true }); } catch (e) { return; }
    for (const entry of entries) {
      const full = path.join(folder, entry.name);
      if (entry.isFile() && isExcelFile(entry.name) && LOA_NAME_RE.test(entry.name) && !looksLikeMasterList(entry.name)) {
        found.push(full);
      } else if (entry.isDirectory()) {
        walk(full, depth + 1);
      }
    }
  };
  MASTERLIST_FOLDERS.forEach((f) => walk(f, 0));
  return [...new Set(found)];
}

function collectLoa(wb, yearBuckets) {
  const info = {
    sheetsInWorkbook: wb.SheetNames.map((n) => ({ name: n, range: (wb.Sheets[n] || {})["!ref"] || "(empty)" })),
    sources: [],
  };
  const seen = new Set();
  const records = [];
  const add = (rec, source) => {
    const key = (rec.no || rec.title).replace(/\s+/g, "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    records.push({ ...rec, source });
    return true;
  };
  const readSheet = (ws, label) => {
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    const r = parseLoaMatrix(matrix);
    let added = 0;
    r.records.forEach((rec) => { if (add(rec, label)) added++; });
    info.sources.push({
      source: label,
      rowsInSheet: matrix.length,
      headerRowFound: r.headerRow,
      recordsFound: r.records.length,
      added,
      rowsSkippedNoDate: r.skippedNoDate,
      firstRows: r.preview,
    });
  };

  // 1. LOA sheet(s) inside the master workbook
  wb.SheetNames.filter((n) => LOA_NAME_RE.test(n)).forEach((n) => readSheet(wb.Sheets[n], `sheet "${n}"`));

  // 2. standalone LOA submission file(s)
  findLoaFiles().forEach((fp) => {
    try {
      const w = XLSX.read(fs.readFileSync(fp), { type: "buffer" });
      w.SheetNames.forEach((n) => readSheet(w.Sheets[n], `file "${path.basename(fp)}" / sheet "${n}"`));
    } catch (e) {
      info.sources.push({ source: `file "${path.basename(fp)}"`, error: e.message });
    }
  });

  // 3. an LOA date column on the year tabs
  let fromYearTabs = 0;
  Object.values(yearBuckets).forEach((rows) =>
    rows.forEach((row) => {
      const d = looseDate(row.LOA_Date);
      if (!d) return;
      if (add({ no: row["Tender No"], title: row["Tender Title"], buyer: row.Presenter, domain: "", date: d }, "year-tab LOA column")) fromYearTabs++;
    })
  );
  info.sources.push({ source: "year-tab LOA column", added: fromYearTabs });

  return { records, info };
}

function injectLoaRows(records, yearBuckets) {
  // A tender can span years (e.g. papers in 2025, LOA in 2026). Put its LOA in
  // the LATEST year tab where that tender already exists, so the LOA shows up
  // on the same tender card. If the tender isn't found anywhere, fall back to
  // the year of the LOA date.
  const key = (v) => String(v || "").replace(/\s+/g, "").toUpperCase();
  const latestYearByTender = {};
  Object.entries(yearBuckets).forEach(([yr, rows]) =>
    rows.forEach((r) => {
      const k = key(r["Tender No"]);
      if (k && (!latestYearByTender[k] || Number(yr) > latestYearByTender[k])) latestYearByTender[k] = Number(yr);
    })
  );

  records.forEach((rec, i) => {
    const serial = toSerial(rec.date);
    const dateYear = new Date(Math.round((serial - 25569) * 86400 * 1000)).getUTCFullYear();
    const year = latestYearByTender[key(rec.no)] || dateYear;
    if (!yearBuckets[year]) yearBuckets[year] = [];
    yearBuckets[year].push({
      ID: 100000 + i,
      PR_Number: "",
      "Tender Title": titleCase(rec.title),
      "Tender No": rec.no,
      "Paper Type": "LOA",
      Subject: "Letter Of Award",
      Presenter: titleCase(rec.buyer),
      Buyer: titleCase(rec.buyer),
      User: "",
      Department: "",
      Domain: titleCase(rec.domain),
      "Attendance List": serial,
      Date: serial,
      Week: "",
      Status: "Awarded",
      Phase: "LOA",
      Start_Date: "",
      End_Date: "",
      LOA_Date: serial,
    });
  });
}

function parseWorkbookFile(filePath, fileName) {
  const buffer = fs.readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const filenameYear = yearFromFilename(fileName);

  const yearBuckets = {};
  const guessedYears = [];
  const emptySheets = [];
  const warnings = [];

  wb.SheetNames.forEach((sheetName) => {
    if (LOA_NAME_RE.test(sheetName)) return; // LOA sheets are read separately below
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (raw.length === 0) {
      emptySheets.push(sheetName);
      return;
    }

    const formatted = normaliseSheetRows(raw);
    const usable = formatted.filter((r) => r["Tender No"] || r["Tender Title"] || r["Paper Type"]);
    if (usable.length === 0) {
      emptySheets.push(sheetName);
      return;
    }

    let year = yearFromSheetName(sheetName);
    let guessed = false;
    if (!year) year = yearFromRows(usable);
    if (!year) year = filenameYear;
    if (!year) {
      year = new Date().getFullYear();
      guessed = true;
    }
    if (guessed) guessedYears.push({ sheetName, year });

    if (!yearBuckets[year]) yearBuckets[year] = [];
    yearBuckets[year] = yearBuckets[year].concat(usable);
  });

  const loa = collectLoa(wb, yearBuckets);
  injectLoaRows(loa.records, yearBuckets);

  if (guessedYears.length > 0) {
    warnings.push(
      `Could not detect a year for sheet${guessedYears.length > 1 ? "s" : ""} ` +
        guessedYears.map((g) => `"${g.sheetName}"`).join(", ") +
        ` — defaulted to ${new Date().getFullYear()}.`
    );
  }
  if (emptySheets.length > 0) {
    warnings.push(
      `Skipped empty or unrecognised sheet${emptySheets.length > 1 ? "s" : ""} ` +
        emptySheets.map((s) => `"${s}"`).join(", ") + "."
    );
  }

  const years = {};
  Object.entries(yearBuckets).forEach(([year, rows]) => {
    years[year] = {
      rows,
      fileName: wb.SheetNames.length > 1 ? `${fileName} (multi-year)` : fileName,
      uploadedAt: new Date().toISOString(),
    };
  });

  return { years, warnings, loaInfo: loa.info, loaCount: loa.records.length };
}

// ── API ──────────────────────────────────────────────────────────────────
// ── Resilience: last-good cache ───────────────────────────────────────────
// Every successful read is saved to disk. If a later read fails (OneDrive
// offline / not synced yet / file locked), the dashboard still gets the last
// good data plus a clear warning, instead of an empty "could not load" screen.
const CACHE_FILE = path.join(__dirname, "last-good.json");

function saveCache(payload) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(payload)); } catch (e) { /* non-fatal */ }
}
function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch (e) { return null; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tries to read the Excel file up to 3 times — a cloud-only OneDrive file needs
// a few seconds to download the first time Node touches it.
async function readMasterListWithRetry() {
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { filePath, seen, folderUsed } = findMasterListFile();
    if (!filePath) {
      lastErr = { notFound: true, seen };
    } else {
      try {
        const fileName = path.basename(filePath);
        const parsed = parseWorkbookFile(filePath, fileName);
        console.log("Using file:", filePath);
        return { ok: true, filePath, fileName, folderUsed, ...parsed };
      } catch (err) {
        lastErr = { message: err.message };
        console.error(`Read attempt ${attempt} failed:`, err.message);
      }
    }
    if (attempt < 3) await sleep(2000);
  }
  return { ok: false, ...lastErr };
}

app.get("/api/masterlist", async (req, res) => {
  const r = await readMasterListWithRetry();

  if (r.ok) {
    const payload = {
      years: r.years,
      warnings: r.warnings,
      loaCount: r.loaCount,
      fileName: r.fileName,
      folderUsed: r.folderUsed,
      loadedAt: new Date().toISOString(),
    };
    saveCache(payload);
    return res.json(payload);
  }

  const reason = r.notFound
    ? "The CC Master List file could not be found (is the data folder reachable and up to date?)"
    : `The CC Master List file could not be read (${r.message})`;

  const cached = loadCache();
  if (cached) {
    console.warn("Serving cached data. Reason:", reason);
    return res.json({
      ...cached,
      stale: true,
      warnings: [
        `${reason}. Showing the last data loaded at ${cached.loadedAt}. It will update automatically once the file is reachable.`,
        ...(cached.warnings || []),
      ],
    });
  }

  if (r.notFound) {
    return res.status(404).json({
      error: "Master list file not found",
      foldersChecked: MASTERLIST_FOLDERS,
      excelFilesSeen: r.seen,
    });
  }
  res.status(500).json({ error: `Failed to read/parse file: ${r.message}` });
});

// Shows exactly what the server found for LOA — open this in the browser to debug.
app.get("/api/loa-debug", (req, res) => {
  const { filePath, folderUsed } = findMasterListFile();
  if (!filePath) return res.status(404).json({ error: "Master list file not found" });
  try {
    const { years, loaInfo, loaCount } = parseWorkbookFile(filePath, path.basename(filePath));
    const sample = [];
    Object.entries(years).forEach(([year, y]) =>
      y.rows.filter((r) => r["Paper Type"] === "LOA").forEach((r) =>
        sample.push({ year, tenderNo: r["Tender No"], title: r["Tender Title"], buyer: r.Presenter, loaDateSerial: r.Date })
      )
    );
    res.json({ masterFile: filePath, folderUsed, loaCount, sample: sample.slice(0, 10), ...loaInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", folders: MASTERLIST_FOLDERS });
});

// ── Serve the dashboard from this same server ─────────────────────────────
// After `npm run build` in the dashboard folder, this server also serves the
// finished dashboard — so there is ONE program to run and ONE address to open:
// http://localhost:4000
const BUILD_CANDIDATES = [
  process.env.DASHBOARD_BUILD,
  path.join(__dirname, "..", "build"),
  path.join(__dirname, "..", "dashboard", "build"),
  path.join(__dirname, "build"),
].filter(Boolean);
const BUILD_DIR = BUILD_CANDIDATES.find((d) => fs.existsSync(path.join(d, "index.html")));

if (BUILD_DIR) {
  app.use(express.static(BUILD_DIR));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(BUILD_DIR, "index.html")));
}

const server = app.listen(PORT, () => {
  console.log(`MasterTrack running at http://localhost:${PORT}`);
  console.log(
    BUILD_DIR
      ? `Dashboard served from: ${BUILD_DIR}`
      : `Dashboard build not found — run "npm run build" in the dashboard folder to serve it from here.`
  );
  console.log(`Watching folders (in priority order):`);
  MASTERLIST_FOLDERS.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use — MasterTrack is probably already running. Open http://localhost:${PORT}`);
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});

// Never let one bad request kill the whole server.
process.on("uncaughtException", (e) => console.error("Uncaught:", e));
process.on("unhandledRejection", (e) => console.error("Unhandled:", e));