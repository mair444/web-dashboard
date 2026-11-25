import * as XLSX from "xlsx";
import { useEffect, useRef, useState } from "react";

// Minimal IndexedDB helper — the only way to persist a folder handle across
// page reloads/browser restarts. localStorage can't store handles (they're
// not serializable), IndexedDB can.
const DB_NAME = "mastertrack-fs";
const STORE_NAME = "handles";
const HANDLE_KEY = "masterListFolder";

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle() {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Finds the MasterList file inside a connected folder.
// Matches "MOM Master List.xlsx" and small naming variations
// (MOM_Master_List_2026.xlsx, MOM-Master-List-v2.xlsx, etc).
async function findMasterListFile(dirHandle) {
  for await (const [name, handle] of dirHandle.entries()) {
    if (
      handle.kind === "file" &&
      /mom.*master.*list/i.test(name) &&
      /\.xlsx?$/i.test(name)
    ) {
      return handle;
    }
  }
  return null;
}

async function readWorkbookFromFileHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return { jsonData: XLSX.utils.sheet_to_json(sheet), fileName: file.name };
}

export default function FileUpload({ setConfig, setUploads, setInsights }) {
  const [folderName, setFolderName] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error | unsupported
  const dirHandleRef = useRef(null);

  const isSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const loadFromHandle = async (fileHandle) => {
    const { jsonData, fileName } = await readWorkbookFromFileHandle(fileHandle);
    setConfig(jsonData);
    setUploads((prev) => [
      { name: fileName, date: new Date().toLocaleString() },
      ...prev,
    ]);
    setInsights([`Loaded ${jsonData.length} records`]);
  };

  const connectAndRefresh = async (dirHandle) => {
    const fileHandle = await findMasterListFile(dirHandle);
    if (!fileHandle) {
      setStatus("error");
      setInsights(["Connected folder, but no MOM Master List file was found in it."]);
      return;
    }
    await loadFromHandle(fileHandle);
    setStatus("connected");
  };

  // On mount: try to silently reconnect to a previously granted folder.
  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }
    (async () => {
      const savedHandle = await loadHandle();
      if (!savedHandle) return;

      const permission = await savedHandle.queryPermission({ mode: "read" });
      if (permission === "granted") {
        dirHandleRef.current = savedHandle;
        setFolderName(savedHandle.name);
        setStatus("connecting");
        await connectAndRefresh(savedHandle);
      }
      // If permission isn't "granted" (e.g. "prompt"), we deliberately don't
      // auto-request it — browsers require that to happen from a user
      // gesture (a click), so we just wait for the person to hit Connect/Reconnect.
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      dirHandleRef.current = dirHandle;
      setFolderName(dirHandle.name);
      setStatus("connecting");
      await saveHandle(dirHandle);
      await connectAndRefresh(dirHandle);
    } catch (err) {
      // AbortError just means the person cancelled the picker — not a real error.
      if (err.name !== "AbortError") {
        console.error(err);
        setStatus("error");
      }
    }
  };

  const handleReconnectPermission = async () => {
    const savedHandle = await loadHandle();
    if (!savedHandle) return handleConnectFolder();
    const permission = await savedHandle.requestPermission({ mode: "read" });
    if (permission === "granted") {
      dirHandleRef.current = savedHandle;
      setFolderName(savedHandle.name);
      setStatus("connecting");
      await connectAndRefresh(savedHandle);
    }
  };

  const handleRefresh = async () => {
    if (!dirHandleRef.current) return;
    setStatus("connecting");
    await connectAndRefresh(dirHandleRef.current);
  };

  // Fallback for Firefox/Safari — keeps the old upload path alive.
  const handleFallbackFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setConfig(jsonData);
      setUploads((prev) => [
        { name: file.name, date: new Date().toLocaleString() },
        ...prev,
      ]);
      setInsights([`Loaded ${jsonData.length} records`]);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "16px",
        borderRadius: "18px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {!isSupported ? (
        <>
          <label style={{ cursor: "pointer" }}>
            <div
              style={{
                display: "inline-block",
                padding: "10px 18px",
                background: "#f3f4f6",
                borderRadius: "999px",
              }}
            >
              Upload Master List
            </div>
            <input type="file" onChange={handleFallbackFile} style={{ display: "none" }} />
          </label>
          <span style={{ fontSize: "13px", color: "#9ca3af" }}>
            Folder auto-connect needs Chrome or Edge — using manual upload here.
          </span>
        </>
      ) : status === "connected" ? (
        <>
          <div
            style={{
              padding: "10px 18px",
              background: "#eef2ff",
              color: "#6366f1",
              borderRadius: "999px",
              fontWeight: 600,
            }}
          >
            Connected: {folderName}
          </div>
          <button
            onClick={handleRefresh}
            style={{
              padding: "10px 18px",
              background: "#f3f4f6",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </>
      ) : (
        <button
          onClick={handleConnectFolder}
          style={{
            padding: "10px 18px",
            background: "#f3f4f6",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Connect Folder
        </button>
      )}

      {status === "error" && (
        <button
          onClick={handleReconnectPermission}
          style={{
            padding: "10px 18px",
            background: "#fee2e2",
            color: "#dc2626",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
          }}
        >import * as XLSX from "xlsx";
import { useEffect, useRef, useState } from "react";

console.log("FileUpload.jsx v2 loaded — folder auto-connect version");

const DB_NAME = "mastertrack-fs";
const STORE_NAME = "handles";
const HANDLE_KEY = "masterListFolder";

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle() {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function findMasterListFile(dirHandle) {
  for await (const [name, handle] of dirHandle.entries()) {
    if (
      handle.kind === "file" &&
      /mom.*master.*list/i.test(name) &&
      /\.xlsx?$/i.test(name)
    ) {
      return handle;
    }
  }
  return null;
}

async function readWorkbookFromFileHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return { jsonData: XLSX.utils.sheet_to_json(sheet), fileName: file.name };
}

export default function FileUpload({ setConfig, setUploads, setInsights }) {
  const [folderName, setFolderName] = useState(null);
  const [status, setStatus] = useState("idle");
  const dirHandleRef = useRef(null);

  const isSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const loadFromHandle = async (fileHandle) => {
    const { jsonData, fileName } = await readWorkbookFromFileHandle(fileHandle);
    setConfig(jsonData);
    setUploads((prev) => [
      { name: fileName, date: new Date().toLocaleString() },
      ...prev,
    ]);
    setInsights([`Loaded ${jsonData.length} records`]);
  };

  const connectAndRefresh = async (dirHandle) => {
    const fileHandle = await findMasterListFile(dirHandle);
    if (!fileHandle) {
      setStatus("error");
      setInsights(["Connected folder, but no MOM Master List file was found in it."]);
      return;
    }
    await loadFromHandle(fileHandle);
    setStatus("connected");
  };

  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }
    (async () => {
      const savedHandle = await loadHandle();
      if (!savedHandle) return;
      const permission = await savedHandle.queryPermission({ mode: "read" });
      if (permission === "granted") {
        dirHandleRef.current = savedHandle;
        setFolderName(savedHandle.name);
        setStatus("connecting");
        await connectAndRefresh(savedHandle);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      dirHandleRef.current = dirHandle;
      setFolderName(dirHandle.name);
      setStatus("connecting");
      await saveHandle(dirHandle);
      await connectAndRefresh(dirHandle);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        setStatus("error");
      }
    }
  };

  const handleReconnectPermission = async () => {
    const savedHandle = await loadHandle();
    if (!savedHandle) return handleConnectFolder();
    const permission = await savedHandle.requestPermission({ mode: "read" });
    if (permission === "granted") {
      dirHandleRef.current = savedHandle;
      setFolderName(savedHandle.name);
      setStatus("connecting");
      await connectAndRefresh(savedHandle);
    }
  };

  const handleRefresh = async () => {
    if (!dirHandleRef.current) return;
    setStatus("connecting");
    await connectAndRefresh(dirHandleRef.current);
  };

  const handleFallbackFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setConfig(jsonData);
      setUploads((prev) => [
        { name: file.name, date: new Date().toLocaleString() },
        ...prev,
      ]);
      setInsights([`Loaded ${jsonData.length} records`]);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "16px",
        borderRadius: "18px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {!isSupported ? (
        <>
          <label style={{ cursor: "pointer" }}>
            <div
              style={{
                display: "inline-block",
                padding: "10px 18px",
                background: "#f3f4f6",
                borderRadius: "999px",
              }}
            >
              Upload Master List
            </div>
            <input type="file" onChange={handleFallbackFile} style={{ display: "none" }} />
          </label>
          <span style={{ fontSize: "13px", color: "#9ca3af" }}>
            Folder auto-connect needs Chrome or Edge — using manual upload here.
          </span>
        </>
      ) : status === "connected" ? (
        <>
          <div
            style={{
              padding: "10px 18px",
              background: "#eef2ff",
              color: "#6366f1",
              borderRadius: "999px",
              fontWeight: 600,
            }}
          >
            Connected: {folderName}
          </div>
          <button
            onClick={handleRefresh}
            style={{
              padding: "10px 18px",
              background: "#f3f4f6",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </>
      ) : (
        <button
          onClick={handleConnectFolder}
          style={{
            padding: "10px 18px",
            background: "#f3f4f6",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Connect Folder
        </button>
      )}

      {status === "error" && (
        <button
          onClick={handleReconnectPermission}
          style={{
            padding: "10px 18px",
            background: "#fee2e2",
            color: "#dc2626",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
          Reconnect
        </button>
      )}
    </div>
  );
}