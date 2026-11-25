export default function TrackingTable({ data, setData }) {
 
  if (!data || data.length === 0) {
    return (
      <div style={{
        background: "#ffffff",
        padding: "48px 20px",
        borderRadius: "20px",
        boxShadow: "0 6px 25px rgba(0,0,0,0.04)",
        textAlign: "center",
        color: "#9ca3af",
        fontSize: "13px",
      }}>
        No data uploaded yet...
      </div>
    );
  }
 
  // ── date formatter ─────────────────────────────────────────────────────────
  const formatExcelDate = (value) => {
    if (!value) return "";
    if (isNaN(value)) return value;
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toLocaleDateString("en-CA");
  };
 
  // ── duration calc ──────────────────────────────────────────────────────────
  const calculateDuration = (start, end) => {
    if (!start || !end) return "-";
    const s = new Date(formatExcelDate(start));
    const e = new Date(formatExcelDate(end));
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    if (isNaN(diff)) return "-";
    return diff + " days";
  };
 
  // ── inline edit helper ─────────────────────────────────────────────────────
  const handleChange = (rowIndex, field, value) => {
    const updated = [...data];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };
    setData(updated);
  };
 
  // ── phase badge colours ────────────────────────────────────────────────────
  const phaseStyle = {
    "Phase 1 - Req Creation":  { background: "#EAF3DE", color: "#3B6D11" },
    "Phase 2 - Strategy":      { background: "#E1F5EE", color: "#0F6E56" },
    "Phase 3 - Tender":        { background: "#E6F1FB", color: "#185FA5" },
    "Phase 4 - Evaluation":    { background: "#FAEEDA", color: "#854F0B" },
    "Phase 5 - Award":         { background: "#FBEAF0", color: "#993556" },
    "Phase 6 - Post Award":    { background: "#EEEDFE", color: "#534AB7" },
  };
 
  // ── status badge colours ───────────────────────────────────────────────────
  const statusStyle = {
    "Not Started":  { background: "#F1EFE8", color: "#5F5E5A" },
    "In Progress":  { background: "#E6F1FB", color: "#185FA5" },
    "On Hold":      { background: "#FAEEDA", color: "#854F0B" },
    "Completed":    { background: "#EAF3DE", color: "#3B6D11" },
    "Cancelled":    { background: "#FCEBEB", color: "#A32D2D" },
  };
 
  const badgeBase = {
    display: "inline-block",
    fontSize: "11px",
    padding: "3px 10px",
    borderRadius: "999px",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };
 
  const selectStyle = {
    border: "0.5px solid #e5e7eb",
    borderRadius: "8px",
    padding: "5px 8px",
    fontSize: "12px",
    background: "#fafafa",
    color: "#374151",
    cursor: "pointer",
    width: "100%",
  };
 
  const thStyle = {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: "11px",
    fontWeight: 500,
    color: "#6b7280",
    whiteSpace: "nowrap",
    borderBottom: "0.5px solid #f3f4f6",
  };
 
  const tdStyle = {
    padding: "10px 14px",
    verticalAlign: "middle",
    borderBottom: "0.5px solid #f9fafb",
  };
 
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      boxShadow: "0 6px 25px rgba(0,0,0,0.04)",
      overflowX: "auto",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
 
        <thead style={{ background: "#fafafa" }}>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>PR Number</th>
            <th style={thStyle}>Phase</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Start Date</th>
            <th style={thStyle}>End Date</th>
            <th style={thStyle}>Duration</th>
          </tr>
        </thead>
 
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{ transition: "background 0.1s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
 
              {/* ID */}
              <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px", fontFamily: "monospace" }}>
                {row.ID}
              </td>
 
              {/* PR Number */}
              <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>
                {row.PR_Number || "-"}
              </td>
 
              {/* Phase — dropdown with badge preview */}
              <td style={tdStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{
                    ...badgeBase,
                    ...(phaseStyle[row.Phase] || { background: "#f3f4f6", color: "#374151" }),
                  }}>
                    {row.Phase || "—"}
                  </span>
                  <select
                    value={row.Phase || ""}
                    onChange={(e) => handleChange(i, "Phase", e.target.value)}
                    style={selectStyle}
                  >
                  </select>
                </div>
              </td>
 
              {/* Status — dropdown with badge preview */}
              <td style={tdStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{
                    ...badgeBase,
                    ...(statusStyle[row.Status] || { background: "#f3f4f6", color: "#374151" }),
                  }}>
                    {row.Status || "—"}
                  </span>
                  <select
                    value={row.Status || ""}
                    onChange={(e) => handleChange(i, "Status", e.target.value)}
                    style={selectStyle}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </td>
 
              {/* Start Date */}
              <td style={{ ...tdStyle, fontSize: "12px", color: "#6b7280" }}>
                {formatExcelDate(row.Start_Date) || "-"}
              </td>
 
              {/* End Date */}
              <td style={{ ...tdStyle, fontSize: "12px", color: "#6b7280" }}>
                {formatExcelDate(row.End_Date) || "-"}
              </td>
 
              {/* Duration */}
              <td style={{ ...tdStyle, fontSize: "12px", color: "#374151", fontWeight: 500 }}>
                {calculateDuration(row.Start_Date, row.End_Date)}
              </td>
 
            </tr>
          ))}
        </tbody>
 
      </table>
    </div>
  );
}


