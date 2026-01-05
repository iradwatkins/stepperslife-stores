/**
 * Cancellation & Refund Email Templates for SteppersLife
 *
 * Black & White design - clean, professional, minimalist
 */

import { BWTemplate } from './base-bw-template';

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface EnrollmentCancellationData {
  studentName: string;
  studentEmail: string;
  orderNumber: string;
  className: string;
  instructorName: string;
  classDate: string;
  classTime: string;
  refundAmount: number; // in cents
  refundStatus: 'pending' | 'processing' | 'completed' | 'none';
  cancellationReason?: string;
  cancelledAt: Date;
}

export interface RefundConfirmationData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  itemName: string;
  itemType: 'class' | 'event' | 'product';
  refundAmount: number; // in cents
  originalPaymentMethod: string;
  refundMethod: string;
  estimatedArrival: string;
  refundedAt: Date;
}

export interface InstructorCancellationNotificationData {
  instructorName: string;
  instructorEmail: string;
  studentName: string;
  className: string;
  classDate: string;
  tierName: string;
  refundAmount: number;
  reason?: string;
  remainingEnrollments: number;
  cancelledAt: Date;
}

// ============================================================================
// ENROLLMENT CANCELLATION (STUDENT)
// ============================================================================

export function generateEnrollmentCancellationEmail(data: EnrollmentCancellationData): {
  subject: string;
  html: string;
} {
  const refundStatusText = {
    pending: 'Your refund is being processed and will be issued within 5-7 business days.',
    processing: 'Your refund is currently being processed.',
    completed: 'Your refund has been issued to your original payment method.',
    none: 'This enrollment is not eligible for a refund based on our cancellation policy.',
  };

  const content = `
    <div class="card">
      ${BWTemplate.header('Enrollment Cancellation')}

      <h1 class="title">Enrollment Cancelled</h1>
      <p class="subtitle">Your enrollment has been cancelled as requested.</p>

      <div class="text-center" style="margin-bottom: 24px;">
        <span class="receipt-number">${data.orderNumber}</span>
      </div>

      ${BWTemplate.sectionTitle('Cancelled Enrollment')}
      <div class="info-box-bordered">
        <div style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;">
          ${data.className}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Instructor</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.instructorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.classDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Time</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.classTime}</td>
          </tr>
        </table>
      </div>

      ${data.refundAmount > 0 ? `
        ${BWTemplate.sectionTitle('Refund Information')}
        <div class="info-box">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Refund Amount</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 700; text-align: right;">
                ${BWTemplate.formatPrice(data.refundAmount)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 12px 0 0; color: #666666; font-size: 14px;">
                ${refundStatusText[data.refundStatus]}
              </td>
            </tr>
          </table>
        </div>
      ` : `
        ${BWTemplate.noticeBox('This cancellation is not eligible for a refund based on our cancellation policy.')}
      `}

      ${data.cancellationReason ? `
        ${BWTemplate.sectionTitle('Cancellation Reason')}
        <div class="info-box">
          <p style="margin: 0; color: #666666; font-size: 14px;">${data.cancellationReason}</p>
        </div>
      ` : ''}

      ${BWTemplate.noticeBox('If you cancelled by mistake or have any questions, please contact us within 24 hours at support@stepperslife.com')}

      ${BWTemplate.primaryButton('View My Enrollments', 'https://stepperslife.com/my-classes')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions about your cancellation?<br>
        Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a;">support@stepperslife.com</a>
      </p>
    </div>
  `;

  return {
    subject: `Enrollment Cancelled: ${data.className}`,
    html: BWTemplate.wrap(content, `Your enrollment for ${data.className} has been cancelled`),
  };
}

// ============================================================================
// REFUND CONFIRMATION
// ============================================================================

export function generateRefundConfirmationEmail(data: RefundConfirmationData): {
  subject: string;
  html: string;
} {
  const itemTypeLabel = {
    class: 'Class Enrollment',
    event: 'Event Ticket',
    product: 'Product Order',
  };

  const content = `
    <div class="card">
      ${BWTemplate.header('Refund Confirmation')}

      <h1 class="title">Refund Processed</h1>
      <p class="subtitle">Your refund has been successfully processed.</p>

      <div class="text-center" style="margin-bottom: 24px;">
        <span class="receipt-number">${data.orderNumber}</span>
        <span style="margin: 0 8px; color: #ccc;">|</span>
        ${BWTemplate.statusBadge('confirmed')}
      </div>

      ${BWTemplate.sectionTitle('Refund Details')}
      <div class="info-box-bordered">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Item</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500; text-align: right;">${data.itemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Type</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${itemTypeLabel[data.itemType]}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Original Payment</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.originalPaymentMethod}</td>
          </tr>
        </table>
      </div>

      ${BWTemplate.sectionTitle('Refund Amount')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${BWTemplate.totalRow('Amount Refunded', BWTemplate.formatPrice(data.refundAmount))}
      </table>

      <div class="info-box" style="margin-top: 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Refund Method</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.refundMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Estimated Arrival</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.estimatedArrival}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Processed On</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${BWTemplate.formatDate(data.refundedAt)}</td>
          </tr>
        </table>
      </div>

      ${BWTemplate.noticeBox('Please allow 5-10 business days for the refund to appear on your statement, depending on your financial institution.')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions about your refund?<br>
        Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a;">support@stepperslife.com</a>
      </p>
    </div>
  `;

  return {
    subject: `Refund Processed: ${BWTemplate.formatPrice(data.refundAmount)} - Order #${data.orderNumber}`,
    html: BWTemplate.wrap(content, `Your refund of ${BWTemplate.formatPrice(data.refundAmount)} has been processed`),
  };
}

// ============================================================================
// INSTRUCTOR CANCELLATION NOTIFICATION
// ============================================================================

export function generateInstructorCancellationNotification(data: InstructorCancellationNotificationData): {
  subject: string;
  html: string;
} {
  const content = `
    <div class="card">
      ${BWTemplate.header('Cancellation Notice')}

      <h1 class="title">Enrollment Cancelled</h1>
      <p class="subtitle">A student has cancelled their enrollment in your class.</p>

      ${BWTemplate.sectionTitle('Cancellation Details')}
      <div class="info-box-bordered">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Student</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${data.studentName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Class</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.className}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${data.classDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Tier</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${data.tierName}</td>
          </tr>
        </table>
      </div>

      ${data.reason ? `
        ${BWTemplate.sectionTitle('Reason Provided')}
        <div class="info-box">
          <p style="margin: 0; color: #666666; font-size: 14px; font-style: italic;">"${data.reason}"</p>
        </div>
      ` : ''}

      ${BWTemplate.sectionTitle('Revenue Impact')}
      <div class="info-box">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #666666; font-size: 14px;">Refund Amount</td>
            <td style="padding: 4px 0; color: #1a1a1a; font-size: 14px; text-align: right;">-${BWTemplate.formatPrice(data.refundAmount)}</td>
          </tr>
        </table>
      </div>

      ${BWTemplate.sectionTitle('Class Status')}
      <div class="info-box">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #666666; font-size: 14px;">Remaining Enrollments</td>
            <td style="padding: 4px 0; color: #1a1a1a; font-size: 14px; text-align: right; font-weight: 600;">${data.remainingEnrollments} students</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666666; font-size: 14px;">Cancelled At</td>
            <td style="padding: 4px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${BWTemplate.formatDate(data.cancelledAt)}</td>
          </tr>
        </table>
      </div>

      ${BWTemplate.primaryButton('View Class Roster', 'https://stepperslife.com/organizer/classes')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        This is an automated notification from SteppersLife.
      </p>
    </div>
  `;

  return {
    subject: `Cancellation: ${data.studentName} - ${data.className}`,
    html: BWTemplate.wrap(content, `${data.studentName} has cancelled their enrollment in ${data.className}`),
  };
}

// ============================================================================
// EVENT TICKET CANCELLATION
// ============================================================================

export interface TicketCancellationData {
  attendeeName: string;
  attendeeEmail: string;
  orderNumber: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  ticketCount: number;
  refundAmount: number;
  refundStatus: 'pending' | 'processing' | 'completed' | 'none';
  cancelledAt: Date;
}

export function generateTicketCancellationEmail(data: TicketCancellationData): {
  subject: string;
  html: string;
} {
  const refundStatusText = {
    pending: 'Your refund is being processed and will be issued within 5-7 business days.',
    processing: 'Your refund is currently being processed.',
    completed: 'Your refund has been issued to your original payment method.',
    none: 'This ticket is not eligible for a refund based on the event\'s cancellation policy.',
  };

  const content = `
    <div class="card">
      ${BWTemplate.header('Ticket Cancellation')}

      <h1 class="title">Tickets Cancelled</h1>
      <p class="subtitle">Your ticket order has been cancelled as requested.</p>

      <div class="text-center" style="margin-bottom: 24px;">
        <span class="receipt-number">${data.orderNumber}</span>
      </div>

      ${BWTemplate.sectionTitle('Cancelled Event')}
      <div class="info-box-bordered">
        <div style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;">
          ${data.eventName}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Date</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.eventDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Time</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.eventTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Venue</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${data.venueName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Tickets</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${data.ticketCount} cancelled</td>
          </tr>
        </table>
      </div>

      ${data.refundAmount > 0 ? `
        ${BWTemplate.sectionTitle('Refund Information')}
        <div class="info-box">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Refund Amount</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 700; text-align: right;">
                ${BWTemplate.formatPrice(data.refundAmount)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 12px 0 0; color: #666666; font-size: 14px;">
                ${refundStatusText[data.refundStatus]}
              </td>
            </tr>
          </table>
        </div>
      ` : `
        ${BWTemplate.noticeBox(refundStatusText.none)}
      `}

      ${BWTemplate.noticeBox('Your tickets are no longer valid for entry. If you cancelled by mistake, please contact us immediately.')}

      ${BWTemplate.primaryButton('View My Tickets', 'https://stepperslife.com/my-tickets')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions about your cancellation?<br>
        Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a;">support@stepperslife.com</a>
      </p>
    </div>
  `;

  return {
    subject: `Tickets Cancelled: ${data.eventName}`,
    html: BWTemplate.wrap(content, `Your tickets for ${data.eventName} have been cancelled`),
  };
}
