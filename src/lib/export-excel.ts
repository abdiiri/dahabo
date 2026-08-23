import * as XLSX from "xlsx";

/**
 * Turns a raw cell value into something a spreadsheet cell can hold as-is.
 * Dates are left as ISO strings (Excel parses these fine and it's more
 * useful than a locale-formatted date baked in as plain text); everything
 * else is stringified except numbers/booleans, which stay as their own type
 * so Excel treats them as numbers rather than text.
 */
function toCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

/**
 * Exports a table's currently-visible rows to a downloaded .xlsx file, using
 * each column's plain value (via `exportValue` if the column defines one,
 * otherwise the column's own field) — not the rendered JSX, which may be a
 * badge or icon that doesn't stringify usefully.
 */
export function exportRowsToExcel<T>(
  filename: string,
  columns: { header: string; exportValue: (row: T) => unknown }[],
  rows: T[],
) {
  const sheetRows = rows.map((row) => {
    const record: Record<string, string | number | boolean> = {};
    for (const col of columns) {
      record[col.header] = toCellValue(col.exportValue(row));
    }
    return record;
  });
  const sheet = XLSX.utils.json_to_sheet(sheetRows, { header: columns.map((c) => c.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
