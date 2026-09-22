const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const HEADER_ROW_NUMBER = 4;

function safeText(value) {
  let normalized = "";

  if (typeof value === "string") normalized = value;
  else if (value !== null && value !== undefined) {
    normalized = typeof value === "object" && !(value instanceof Date) ? JSON.stringify(value) : String(value);
  }

  return /^[=+\-@\t\r]/.test(normalized) ? `'${normalized}` : normalized;
}

function dateValue(value, includeTime) {
  if (value instanceof Date) return value;
  if (typeof value !== "string" || !value) return safeText(value);

  if (!includeTime) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? safeText(value) : parsed;
}

function normalizedValue(value, kind) {
  if (kind === "date") return dateValue(value, false);
  if (kind === "datetime") return dateValue(value, true);
  if (kind === "number" || kind === "currency") {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : safeText(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return safeText(value);
}

function statusColors(value) {
  const status = String(value ?? "").toLowerCase();

  if (["active", "approved", "paid"].includes(status)) return { fill: "FF171717", font: "FFFFFFFF" };
  if (["completed", "online", "available", "full coverage"].includes(status)) {
    return { fill: "FFE7F5EC", font: "FF18723C" };
  }
  if (status.includes("cancelled") || ["rejected", "inactive", "offline"].includes(status)) {
    return { fill: "FFFDE8E8", font: "FFB42318" };
  }
  if (["pending", "requested", "processed", "partial coverage", "away"].includes(status)) {
    return { fill: "FFFFF4D6", font: "FF8A5700" };
  }
  return { fill: "FFF0F1F3", font: "FF3F3F46" };
}

function reportFilename(filename) {
  return filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename.replace(/\.csv$/i, "")}.xlsx`;
}

export async function createExcelReportBuffer(options) {
  const excelModule = await import("exceljs");
  const Workbook = excelModule.Workbook ?? excelModule.default?.Workbook;

  if (!Workbook) throw new Error("Excel workbook support could not be loaded.");
  if (!options.columns.length) throw new Error("At least one export column is required.");

  const workbook = new Workbook();
  const exportedAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const lastColumn = options.columns.length;

  workbook.creator = "SpaceCat ASTROTOURISM";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = options.subtitle ?? options.title;
  workbook.title = options.title;

  const worksheet = workbook.addWorksheet((options.sheetName || "Report").slice(0, 31), {
    properties: { defaultRowHeight: 22 },
    views: [{ state: "frozen", ySplit: HEADER_ROW_NUMBER }],
  });

  worksheet.columns = options.columns.map((column) => ({ key: column.key, width: column.width ?? 18 }));
  worksheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = options.title;
  titleCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF171717" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells(2, 1, 2, lastColumn);
  const metadataCell = worksheet.getCell(2, 1);
  const details = options.subtitle ? `${options.subtitle} • ` : "";
  metadataCell.value = `${details}Exported ${exportedAt} • ${options.rows.length} record${options.rows.length === 1 ? "" : "s"}`;
  metadataCell.font = { color: { argb: "FF6B7280" }, size: 10 };
  metadataCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 8;

  const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);
  headerRow.values = options.columns.map((column) => column.header);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF27272A" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE4E4E7" } },
      bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
    };
  });

  options.rows.forEach((item, index) => {
    const values = Object.fromEntries(
      options.columns.map((column) => [column.key, normalizedValue(item[column.key], column.kind)]),
    );
    const row = worksheet.addRow(values);
    row.height = 27;

    row.eachCell((cell) => {
      cell.font = { color: { argb: "FF27272A" }, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE4E4E7" } } };
      if (index % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
      }
    });

    options.columns.forEach((column) => {
      const cell = row.getCell(column.key);
      if (column.kind === "date") cell.numFmt = "dd mmm yyyy";
      if (column.kind === "datetime") cell.numFmt = "dd mmm yyyy hh:mm";
      if (column.kind === "number") cell.numFmt = "#,##0.00";
      if (column.kind === "currency") cell.numFmt = '"$"#,##0.00';
      if (column.kind === "status") {
        const colors = statusColors(item[column.key]);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } };
        cell.font = { bold: true, color: { argb: colors.font }, size: 10 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  worksheet.autoFilter = {
    from: { row: HEADER_ROW_NUMBER, column: 1 },
    to: { row: Math.max(HEADER_ROW_NUMBER, HEADER_ROW_NUMBER + options.rows.length), column: lastColumn },
  };
  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  worksheet.headerFooter.oddFooter = "SpaceCat ASTROTOURISM • &P of &N";

  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output);
}

export async function downloadExcelReport(options) {
  if (typeof document === "undefined") throw new Error("Excel downloads are only available in the browser.");

  const output = await createExcelReportBuffer(options);
  const url = URL.createObjectURL(new Blob([output], { type: EXCEL_MIME_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = reportFilename(options.filename);
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
