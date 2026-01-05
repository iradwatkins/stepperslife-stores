/**
 * Utility functions for CSV generation and download
 */

export interface AttendeeData {
  attendeeName: string;
  attendeeEmail: string;
  ticketCode: string;
  tierName: string;
  status: string;
  purchaseDate: number;
  paymentMethod?: string;
}

/**
 * Convert attendee data to CSV format
 */
export function convertToCSV(attendees: AttendeeData[]): string {
  if (attendees.length === 0) {
    return "Name,Email,Ticket Code,Tier,Status,Purchase Date,Payment Method\n";
  }

  // CSV headers
  const headers = ["Name", "Email", "Ticket Code", "Tier", "Status", "Purchase Date", "Payment Method"];
  const headerRow = headers.join(",");

  // CSV rows
  const rows = attendees.map((attendee) => {
    const purchaseDate = new Date(attendee.purchaseDate).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return [
      escapeCSV(attendee.attendeeName),
      escapeCSV(attendee.attendeeEmail),
      escapeCSV(attendee.ticketCode),
      escapeCSV(attendee.tierName),
      escapeCSV(attendee.status),
      escapeCSV(purchaseDate),
      escapeCSV(attendee.paymentMethod || "ONLINE"),
    ].join(",");
  });

  return [headerRow, ...rows].join("\n");
}

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSV(value: string): string {
  if (value == null) return "";

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Download CSV file to user's computer
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate a filename for the attendee export
 */
export function generateAttendeeExportFilename(eventName: string): string {
  const sanitizedName = eventName
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase();

  const date = new Date().toISOString().split("T")[0];

  return `${sanitizedName}_attendees_${date}.csv`;
}
