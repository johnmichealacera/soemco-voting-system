import * as XLSX from "xlsx"

export type ExportRow = Record<string, string | number>

/**
 * Escape a CSV cell value (wrap in quotes if contains comma, newline, or quote).
 */
function escapeCSVCell(value: string | number): string {
  const s = String(value)
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Download data as a CSV file.
 */
export function downloadCSV(rows: ExportRow[], filename: string): void {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]!)
  const headerLine = headers.map(escapeCSVCell).join(",")
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSVCell(row[h] ?? "")).join(",")
  )
  const csv = [headerLine, ...dataLines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download data as a single-sheet Excel file.
 */
export function downloadExcel(
  rows: ExportRow[],
  sheetName: string,
  filename: string
): void {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}])
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)) // Excel sheet name max 31 chars
  const outFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  XLSX.writeFile(wb, outFilename)
}

/**
 * Download data as a multi-sheet Excel file.
 */
export function downloadExcelMulti(
  sheets: { name: string; data: ExportRow[] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new()
  for (const { name, data } of sheets) {
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{}])
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  }
  const outFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  XLSX.writeFile(wb, outFilename)
}
