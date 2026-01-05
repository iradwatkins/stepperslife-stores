/**
 * Utility functions for exporting data to CSV and PDF formats
 */
import { toast } from "sonner";

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => string | number | null | undefined);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  // Build CSV header
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Build CSV rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value =
          typeof col.accessor === "function"
            ? col.accessor(item)
            : item[col.accessor];

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }

        // Handle dates
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }

        // Handle numbers
        if (typeof value === "number") {
          return value.toString();
        }

        // Handle strings (escape quotes)
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });

  // Combine headers and rows
  const csv = [headers, ...rows].join("\n");

  // Create blob and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a date for display in exports
 */
export function formatExportDate(timestamp: number | undefined | null): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a datetime for display in exports
 */
export function formatExportDateTime(timestamp: number | undefined | null): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format currency for exports (cents to dollars)
 */
export function formatExportCurrency(cents: number | undefined | null): string {
  if (cents === null || cents === undefined) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Generate a filename with date
 */
export function generateExportFilename(prefix: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}`;
}
