/**
 * Reminder Email Templates
 *
 * Black & white email templates for:
 * - Class reminders (24h before)
 * - Event reminders (24h before)
 */

import { BWTemplate } from './base-bw-template';

// ============================================================================
// CLASS REMINDER EMAIL (24 hours before)
// ============================================================================

export interface ClassReminderData {
  studentName: string;
  studentEmail: string;
  className: string;
  instructorName: string;
  classDate: string;
  classTime: string;
  classEndTime?: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venueZip: string;
  ticketCode: string;
  whatToBring?: string;
  specialInstructions?: string;
}

export function generateClassReminderEmail(data: ClassReminderData): { html: string; subject: string } {
  // Generate Google Maps link
  const mapsQuery = encodeURIComponent(
    `${data.venueName}, ${data.venueAddress}, ${data.venueCity}, ${data.venueState} ${data.venueZip}`
  );
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const content = `
    <div class="card">
      ${BWTemplate.header('Class Reminder')}

      <h1 class="title">Your Class is Tomorrow!</h1>
      <p class="subtitle">Hey ${data.studentName}, this is a friendly reminder about your upcoming class.</p>

      ${BWTemplate.sectionTitle('Class Details')}
      <div class="info-box-bordered">
        <div style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;">
          ${data.className}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Instructor</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.instructorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${data.classDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Time</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">
              ${data.classTime}${data.classEndTime ? ` - ${data.classEndTime}` : ''}
            </td>
          </tr>
        </table>
      </div>

      ${BWTemplate.sectionTitle('Location')}
      <div class="info-box">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">${data.venueName}</div>
        <div style="color: #666666; font-size: 14px; line-height: 1.5;">
          ${data.venueAddress}<br>
          ${data.venueCity}, ${data.venueState} ${data.venueZip}
        </div>
        <div style="margin-top: 12px;">
          <a href="${mapsLink}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;">
            Get Directions
          </a>
        </div>
      </div>

      ${BWTemplate.sectionTitle('Your Ticket')}
      <div class="info-box" style="text-align: center;">
        <div style="font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 16px; color: #1a1a1a; background: #f5f5f5; border: 1px solid #e0e0e0; padding: 12px 24px; border-radius: 4px; display: inline-block;">
          ${data.ticketCode}
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666666;">
          Show this code at check-in
        </div>
      </div>

      ${data.whatToBring ? `
        ${BWTemplate.sectionTitle('What to Bring')}
        ${BWTemplate.noticeBox(data.whatToBring)}
      ` : ''}

      ${data.specialInstructions ? `
        ${BWTemplate.sectionTitle('Special Instructions')}
        ${BWTemplate.noticeBox(data.specialInstructions)}
      ` : ''}

      ${BWTemplate.noticeBox('Please arrive 10-15 minutes early to check in. Wear comfortable clothing and shoes suitable for dancing.')}

      ${BWTemplate.primaryButton('View My Classes', 'https://stepperslife.com/my-classes')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions about your class?<br>
        Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a;">support@stepperslife.com</a>
      </p>
    </div>
  `;

  return {
    html: BWTemplate.wrap(content, `Reminder: ${data.className} is tomorrow!`),
    subject: `Reminder: ${data.className} is tomorrow - ${data.classDate}`
  };
}

// ============================================================================
// EVENT REMINDER EMAIL (24 hours before)
// ============================================================================

export interface EventReminderData {
  attendeeName: string;
  attendeeEmail: string;
  eventName: string;
  organizerName?: string;
  eventDate: string;
  eventTime: string;
  eventEndTime?: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venueZip: string;
  ticketCode: string;
  ticketTier?: string;
  seatInfo?: string;
  specialInstructions?: string;
  dressCode?: string;
}

export function generateEventReminderEmail(data: EventReminderData): { html: string; subject: string } {
  // Generate Google Maps link
  const mapsQuery = encodeURIComponent(
    `${data.venueName}, ${data.venueAddress}, ${data.venueCity}, ${data.venueState} ${data.venueZip}`
  );
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const content = `
    <div class="card">
      ${BWTemplate.header('Event Reminder')}

      <h1 class="title">Your Event is Tomorrow!</h1>
      <p class="subtitle">Hey ${data.attendeeName}, get ready for an amazing experience!</p>

      ${BWTemplate.sectionTitle('Event Details')}
      <div class="info-box-bordered">
        <div style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;">
          ${data.eventName}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${data.organizerName ? `
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Hosted by</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.organizerName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${data.eventDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Time</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">
              ${data.eventTime}${data.eventEndTime ? ` - ${data.eventEndTime}` : ''}
            </td>
          </tr>
          ${data.ticketTier ? `
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Ticket</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.ticketTier}</td>
          </tr>
          ` : ''}
          ${data.seatInfo ? `
          <tr>
            <td style="padding: 8px 0; color: #666666; font-size: 14px;">Seating</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.seatInfo}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${BWTemplate.sectionTitle('Venue')}
      <div class="info-box">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">${data.venueName}</div>
        <div style="color: #666666; font-size: 14px; line-height: 1.5;">
          ${data.venueAddress}<br>
          ${data.venueCity}, ${data.venueState} ${data.venueZip}
        </div>
        <div style="margin-top: 12px;">
          <a href="${mapsLink}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;">
            Get Directions
          </a>
        </div>
      </div>

      ${BWTemplate.sectionTitle('Your Ticket')}
      <div class="info-box" style="text-align: center;">
        <div style="font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 16px; color: #1a1a1a; background: #f5f5f5; border: 1px solid #e0e0e0; padding: 12px 24px; border-radius: 4px; display: inline-block;">
          ${data.ticketCode}
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666666;">
          Present this code at entry
        </div>
      </div>

      ${data.dressCode ? `
        ${BWTemplate.sectionTitle('Dress Code')}
        ${BWTemplate.noticeBox(data.dressCode)}
      ` : ''}

      ${data.specialInstructions ? `
        ${BWTemplate.sectionTitle('Important Information')}
        ${BWTemplate.noticeBox(data.specialInstructions)}
      ` : ''}

      ${BWTemplate.noticeBox('We recommend arriving 15-30 minutes before the event starts to ensure smooth entry. Have your ticket code ready.')}

      ${BWTemplate.primaryButton('View My Tickets', 'https://stepperslife.com/my-tickets')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions about your event?<br>
        Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a;">support@stepperslife.com</a>
      </p>
    </div>
  `;

  return {
    html: BWTemplate.wrap(content, `Reminder: ${data.eventName} is tomorrow!`),
    subject: `Reminder: ${data.eventName} is tomorrow - ${data.eventDate}`
  };
}

// ============================================================================
// MULTI-CLASS REMINDER (for students with multiple classes)
// ============================================================================

export interface MultiClassReminderData {
  studentName: string;
  studentEmail: string;
  classes: Array<{
    className: string;
    instructorName: string;
    classDate: string;
    classTime: string;
    venueName: string;
    venueAddress: string;
    ticketCode: string;
  }>;
}

export function generateMultiClassReminderEmail(data: MultiClassReminderData): { html: string; subject: string } {
  const classCards = data.classes.map((cls, index) => `
    <div style="background: #ffffff; border: 2px solid #1a1a1a; border-radius: 4px; padding: 20px; margin: ${index > 0 ? '16px' : '0'} 0;">
      <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px;">
        ${cls.className}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #666666; width: 80px;">Instructor</td>
          <td style="padding: 4px 0; color: #1a1a1a;">${cls.instructorName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666666;">When</td>
          <td style="padding: 4px 0; color: #1a1a1a; font-weight: 600;">${cls.classDate} at ${cls.classTime}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666666;">Where</td>
          <td style="padding: 4px 0; color: #1a1a1a;">${cls.venueName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666666;">Ticket</td>
          <td style="padding: 4px 0;">
            <span style="font-family: monospace; background: #f5f5f5; padding: 2px 8px; border-radius: 2px; font-size: 12px;">${cls.ticketCode}</span>
          </td>
        </tr>
      </table>
    </div>
  `).join('');

  const content = `
    <div class="card">
      ${BWTemplate.header('Class Reminder')}

      <h1 class="title">You Have Classes Tomorrow!</h1>
      <p class="subtitle">Hey ${data.studentName}, here's your schedule for tomorrow.</p>

      ${BWTemplate.sectionTitle(`Your Classes (${data.classes.length})`)}
      ${classCards}

      ${BWTemplate.noticeBox('Remember to arrive 10-15 minutes early for each class. Wear comfortable clothing and shoes suitable for dancing.')}

      ${BWTemplate.primaryButton('View All My Classes', 'https://stepperslife.com/my-classes')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        Questions about your classes?<br>
        Contact us at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a;">support@stepperslife.com</a>
      </p>
    </div>
  `;

  return {
    html: BWTemplate.wrap(content, `Reminder: You have ${data.classes.length} classes tomorrow!`),
    subject: `Reminder: You have ${data.classes.length} classes tomorrow`
  };
}
