import { NextRequest, NextResponse } from "next/server";
import { sendPostalEmail } from "@/lib/email/client";
import QRCode from "qrcode";

interface Ticket {
  _id: string;
  _creationTime: number;
  orderId: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  eventId: string;
  tierId: string;
  status: string;
  qrCodeUrl?: string;
  seatInfo?: {
    tableNumber?: number;
    seatNumber?: number;
    rowNumber?: number;
    sectionName?: string;
  };
}

interface Event {
  _id: string;
  name: string;
  startDate: number;
  endDate?: number;
  location: {
    venueName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  imageUrl?: string;
}

interface Order {
  _id: string;
  _creationTime: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, orderDetails, tickets, event } = await request.json();


    // Validation
    if (!email || !orderDetails || !tickets || !event) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!process.env.POSTAL_API_KEY) {
      console.error("POSTAL_API_KEY is not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    // Generate QR codes for each ticket
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket: Ticket) => {
        try {
          // Generate QR code as data URL
          const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticketCode, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });

          return {
            ...ticket,
            qrCodeDataUrl,
          };
        } catch (qrError) {
          console.error(`Failed to generate QR code for ticket ${ticket._id}:`, qrError);
          return ticket;
        }
      })
    );

    // Format event date
    const eventDate = new Date(event.startDate);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = eventDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Format order total
    const orderTotal = (orderDetails.totalAmount / 100).toFixed(2);

    // Generate Google Maps link
    const mapsQuery = encodeURIComponent(
      `${event.location.venueName}, ${event.location.address}, ${event.location.city}, ${event.location.state} ${event.location.zipCode}`
    );
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    // Generate ticket HTML rows
    const ticketRows = ticketsWithQR
      .map((ticket, index) => {
        const seatInfo = ticket.seatInfo
          ? `
            <tr>
              <td style="padding: 5px 15px; color: #666; font-size: 14px;">
                ${
                  ticket.seatInfo.tableNumber
                    ? `Table ${ticket.seatInfo.tableNumber}, Seat ${ticket.seatInfo.seatNumber}`
                    : ticket.seatInfo.rowNumber
                    ? `Section ${ticket.seatInfo.sectionName || "N/A"}, Row ${ticket.seatInfo.rowNumber}, Seat ${ticket.seatInfo.seatNumber}`
                    : "General Admission"
                }
              </td>
            </tr>`
          : "";

        return `
          <tr>
            <td style="padding: 20px 0; border-bottom: ${index < ticketsWithQR.length - 1 ? "2px solid #f0f0f0" : "none"};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <div style="background: white; padding: 20px; display: inline-block; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                      ${ticket.qrCodeDataUrl ? `<img src="${ticket.qrCodeDataUrl}" alt="Ticket QR Code" width="300" height="300" style="display: block;" />` : '<p style="color: #999;">QR code unavailable</p>'}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 10px 15px; background: #f8f9fa; border-radius: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 5px 15px; color: #333; font-weight: bold; font-size: 14px;">
                          Ticket #${index + 1}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 15px; color: #666; font-size: 14px;">
                          ${ticket.attendeeName}
                        </td>
                      </tr>
                      ${seatInfo}
                      <tr>
                        <td style="padding: 5px 15px; color: #999; font-size: 12px; font-family: monospace;">
                          ${ticket.ticketCode}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      })
      .join("");

    // Create HTML email template
    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tickets for ${event.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: #1a1a1a; padding: 40px 30px; text-align: center; border-bottom: 3px solid #000000;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                STEPPERSLIFE
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Ticket Confirmation
              </p>
            </td>
          </tr>

          <!-- Event Information -->
          <tr>
            <td style="padding: 30px;">
              ${event.imageUrl ? `
              <div style="margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
                <img src="${event.imageUrl}" alt="${event.name}" style="width: 100%; height: auto; display: block;" />
              </div>
              ` : ""}

              <h2 style="margin: 0 0 15px 0; color: #333; font-size: 24px;">
                ${event.name}
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                      <strong style="color: #333;">📅 Date:</strong> ${formattedDate}
                    </p>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                      <strong style="color: #333;">🕐 Time:</strong> ${formattedTime}
                    </p>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                      <strong style="color: #333;">📍 Location:</strong> ${event.location.venueName}
                    </p>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      ${event.location.address}, ${event.location.city}, ${event.location.state} ${event.location.zipCode}
                    </p>
                    <p style="margin: 15px 0 0 0;">
                      <a href="${mapsLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #1a1a1a; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600;">
                        Get Directions
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Tickets Section -->
              <h3 style="margin: 30px 0 20px 0; color: #333; font-size: 20px;">
                Your Tickets (${ticketsWithQR.length})
              </h3>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${ticketRows}
              </table>

              <!-- Order Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; background: #f8f9fa; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Order Summary</h4>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">Order Number:</td>
                        <td align="right" style="padding: 5px 0; color: #333; font-size: 14px; font-family: monospace;">${orderDetails._id.substring(0, 12).toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">Payment Method:</td>
                        <td align="right" style="padding: 5px 0; color: #333; font-size: 14px;">${orderDetails.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0 5px 0; color: #1a1a1a; font-weight: bold; font-size: 16px; border-top: 2px solid #1a1a1a;">Total Paid:</td>
                        <td align="right" style="padding: 10px 0 5px 0; color: #1a1a1a; font-weight: bold; font-size: 18px; border-top: 2px solid #1a1a1a;">$${orderTotal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important Information -->
              <div style="margin-top: 30px; padding: 20px; background: #fff8e1; border-left: 4px solid #ffc107; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">📱 Important Information</h4>
                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.6;">
                  <li>Save this email or screenshot your QR codes</li>
                  <li>Show your QR code at event check-in</li>
                  <li>Each ticket can only be scanned once</li>
                  <li>Arrive early to avoid lines</li>
                  <li>Contact support if you have any issues</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #fafafa; padding: 30px; text-align: center; border-top: 2px solid #1a1a1a;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Questions? Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a; text-decoration: underline;">support@stepperslife.com</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SteppersLife. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                <a href="https://stepperslife.com" style="color: #1a1a1a; text-decoration: underline;">Visit SteppersLife</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Postal (self-hosted)
    const emailResponse = await sendPostalEmail({
      from: "SteppersLife Events <events@stepperslife.com>",
      to: email,
      subject: `Your Tickets for ${event.name} - ${formattedDate}`,
      html: htmlEmail,
    });

    if (!emailResponse.success) {
      throw new Error(emailResponse.error || "Failed to send email");
    }

    return NextResponse.json({
      success: true,
      emailId: emailResponse.messageId,
      message: "Ticket confirmation email sent successfully",
    });
  } catch (error) {
    console.error("Error sending ticket confirmation email:", error);

    return NextResponse.json(
      {
        error: "Failed to send ticket confirmation email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
