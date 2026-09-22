export type ExcelCellValue = string | number | boolean | Date | null | undefined | Record<string, unknown>;

export type ExcelColumnKind = "text" | "number" | "currency" | "date" | "datetime" | "status";

export interface ExcelReportColumn {
  key: string;
  header: string;
  width?: number;
  kind?: ExcelColumnKind;
}

export interface ExcelReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  sheetName?: string;
  columns: ExcelReportColumn[];
  rows: Array<Record<string, ExcelCellValue>>;
}

export function createExcelReportBuffer(options: ExcelReportOptions): Promise<Uint8Array>;
export function downloadExcelReport(options: ExcelReportOptions): Promise<void>;
