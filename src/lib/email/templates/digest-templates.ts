/**
 * Instructor Digest Email Templates
 *
 * Black & white email templates for:
 * - Daily enrollment digest
 * - Weekly summary digest
 */

import { BWTemplate } from './base-bw-template';

// ============================================================================
// INSTRUCTOR DAILY DIGEST
// ============================================================================

export interface InstructorDailyDigestData {
  instructorName: string;
  instructorEmail: string;
  digestDate: string;
  enrollments: Array<{
    studentName: string;
    className: string;
    tierName: string;
    enrolledAt: Date | string;
    amountCents: number;
  }>;
  cancellations: Array<{
    studentName: string;
    className: string;
    cancelledAt: Date | string;
    refundAmountCents: number;
  }>;
  summary: {
    totalNewEnrollments: number;
    totalCancellations: number;
    grossRevenueCents: number;
    platformFeesCents: number;
    netRevenueCents: number;
  };
  upcomingClasses: Array<{
    className: string;
    classDate: string;
    enrollmentCount: number;
    capacity: number;
  }>;
}

export function generateInstructorDailyDigest(data: InstructorDailyDigestData): { html: string; subject: string } {
  // Format enrollments table
  const enrollmentRows = data.enrollments.length > 0
    ? data.enrollments.map(e => {
        const time = typeof e.enrolledAt === 'string'
          ? new Date(e.enrolledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : e.enrolledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px;">
              <div style="font-weight: 500; color: #1a1a1a;">${e.studentName}</div>
              <div style="font-size: 12px; color: #666666; margin-top: 2px;">${e.className} - ${e.tierName}</div>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 12px; color: #666666; text-align: center;">
              ${time}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; font-weight: 500; text-align: right; color: #1a1a1a;">
              ${BWTemplate.formatPrice(e.amountCents)}
            </td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #666666; font-size: 14px;">No new enrollments today</td></tr>`;

  // Format cancellations table
  const cancellationRows = data.cancellations.length > 0
    ? data.cancellations.map(c => {
        const time = typeof c.cancelledAt === 'string'
          ? new Date(c.cancelledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : c.cancelledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px;">
              <div style="font-weight: 500; color: #666666; text-decoration: line-through;">${c.studentName}</div>
              <div style="font-size: 12px; color: #999999; margin-top: 2px;">${c.className}</div>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 12px; color: #666666; text-align: center;">
              ${time}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; color: #666666; text-align: right;">
              -${BWTemplate.formatPrice(c.refundAmountCents)}
            </td>
          </tr>
        `;
      }).join('')
    : null;

  // Format upcoming classes
  const upcomingClassesRows = data.upcomingClasses.length > 0
    ? data.upcomingClasses.map(c => {
        const fillPercent = Math.round((c.enrollmentCount / c.capacity) * 100);
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px;">
              <div style="font-weight: 500; color: #1a1a1a;">${c.className}</div>
              <div style="font-size: 12px; color: #666666; margin-top: 2px;">${c.classDate}</div>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
              <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${c.enrollmentCount}</span>
              <span style="font-size: 12px; color: #666666;">/${c.capacity}</span>
              <div style="font-size: 11px; color: #666666;">${fillPercent}% full</div>
            </td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="2" style="padding: 20px; text-align: center; color: #666666; font-size: 14px;">No upcoming classes</td></tr>`;

  const content = `
    <div class="card">
      ${BWTemplate.header('Daily Digest')}

      <h1 class="title">Your Daily Summary</h1>
      <p class="subtitle">${data.digestDate}</p>

      ${BWTemplate.sectionTitle('Quick Stats')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="width: 33.33%; text-align: center; padding: 20px; background: #fafafa; border: 1px solid #e0e0e0;">
            <div style="font-size: 28px; font-weight: 700; color: #1a1a1a;">${data.summary.totalNewEnrollments}</div>
            <div style="font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">New Enrollments</div>
          </td>
          <td style="width: 33.33%; text-align: center; padding: 20px; background: #fafafa; border: 1px solid #e0e0e0; border-left: none;">
            <div style="font-size: 28px; font-weight: 700; color: #1a1a1a;">${data.summary.totalCancellations}</div>
            <div style="font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Cancellations</div>
          </td>
          <td style="width: 33.33%; text-align: center; padding: 20px; background: #fafafa; border: 1px solid #e0e0e0; border-left: none;">
            <div style="font-size: 28px; font-weight: 700; color: #1a1a1a;">${BWTemplate.formatPrice(data.summary.netRevenueCents)}</div>
            <div style="font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Net Revenue</div>
          </td>
        </tr>
      </table>

      ${BWTemplate.sectionTitle('New Enrollments')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
        <thead>
          <tr style="background: #fafafa;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Student / Class</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Time</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${enrollmentRows}
        </tbody>
      </table>

      ${cancellationRows ? `
        ${BWTemplate.sectionTitle('Cancellations')}
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
          <thead>
            <tr style="background: #fafafa;">
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Student / Class</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Time</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Refund</th>
            </tr>
          </thead>
          <tbody>
            ${cancellationRows}
          </tbody>
        </table>
      ` : ''}

      ${BWTemplate.sectionTitle('Revenue Breakdown')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${BWTemplate.infoRow('Gross Revenue', BWTemplate.formatPrice(data.summary.grossRevenueCents))}
        ${BWTemplate.infoRow('Platform Fees (10%)', `-${BWTemplate.formatPrice(data.summary.platformFeesCents)}`)}
        ${BWTemplate.totalRow('Net Revenue', BWTemplate.formatPrice(data.summary.netRevenueCents))}
      </table>

      ${BWTemplate.sectionTitle('Upcoming Classes')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
        <thead>
          <tr style="background: #fafafa;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Class</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Enrolled</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingClassesRows}
        </tbody>
      </table>

      ${BWTemplate.primaryButton('View Instructor Dashboard', 'https://stepperslife.com/organizer/dashboard')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        This is your daily digest from SteppersLife.<br>
        <a href="https://stepperslife.com/settings/notifications" style="color: #1a1a1a;">Manage notification preferences</a>
      </p>
    </div>
  `;

  return {
    html: BWTemplate.wrap(content, `Daily Digest: ${data.summary.totalNewEnrollments} new enrollments`),
    subject: `Daily Digest: ${data.summary.totalNewEnrollments} enrollments, ${BWTemplate.formatPrice(data.summary.netRevenueCents)} earned - ${data.digestDate}`
  };
}

// ============================================================================
// INSTRUCTOR WEEKLY DIGEST
// ============================================================================

export interface InstructorWeeklyDigestData {
  instructorName: string;
  instructorEmail: string;
  weekStart: string;
  weekEnd: string;
  enrollments: Array<{
    studentName: string;
    className: string;
    tierName: string;
    enrolledAt: Date | string;
    amountCents: number;
  }>;
  cancellations: Array<{
    studentName: string;
    className: string;
    cancelledAt: Date | string;
    refundAmountCents: number;
  }>;
  summary: {
    totalNewEnrollments: number;
    totalCancellations: number;
    grossRevenueCents: number;
    platformFeesCents: number;
    netRevenueCents: number;
    classesHeld: number;
    studentsAttended: number;
  };
  topClasses: Array<{
    className: string;
    enrollments: number;
    revenue: number;
  }>;
  comparison?: {
    enrollmentChange: number; // percentage change from previous week
    revenueChange: number;
  };
}

export function generateInstructorWeeklyDigest(data: InstructorWeeklyDigestData): { html: string; subject: string } {
  // Top classes section
  const topClassesRows = data.topClasses.length > 0
    ? data.topClasses.map((c, i) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px;">
            <span style="display: inline-block; width: 20px; height: 20px; background: #1a1a1a; color: #ffffff; border-radius: 50%; text-align: center; line-height: 20px; font-size: 11px; font-weight: 600; margin-right: 8px;">${i + 1}</span>
            ${c.className}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; text-align: center; color: #666666;">
            ${c.enrollments} enrolled
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; font-weight: 500; text-align: right; color: #1a1a1a;">
            ${BWTemplate.formatPrice(c.revenue)}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #666666; font-size: 14px;">No classes this week</td></tr>`;

  // Comparison badges
  const comparisonSection = data.comparison ? `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e0e0e0;">
      <span style="font-size: 12px; color: #666666; margin-right: 16px;">
        vs. last week:
        <span style="color: ${data.comparison.enrollmentChange >= 0 ? '#1a1a1a' : '#666666'}; font-weight: 600;">
          ${data.comparison.enrollmentChange >= 0 ? '+' : ''}${data.comparison.enrollmentChange}% enrollments
        </span>
      </span>
      <span style="font-size: 12px; color: #666666;">
        <span style="color: ${data.comparison.revenueChange >= 0 ? '#1a1a1a' : '#666666'}; font-weight: 600;">
          ${data.comparison.revenueChange >= 0 ? '+' : ''}${data.comparison.revenueChange}% revenue
        </span>
      </span>
    </div>
  ` : '';

  const content = `
    <div class="card">
      ${BWTemplate.header('Weekly Summary')}

      <h1 class="title">Your Week in Review</h1>
      <p class="subtitle">${data.weekStart} - ${data.weekEnd}</p>

      ${BWTemplate.sectionTitle('Weekly Highlights')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 8px;">
        <tr>
          <td style="width: 25%; text-align: center; padding: 20px 10px; background: #fafafa; border: 1px solid #e0e0e0;">
            <div style="font-size: 32px; font-weight: 700; color: #1a1a1a;">${data.summary.totalNewEnrollments}</div>
            <div style="font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Enrollments</div>
          </td>
          <td style="width: 25%; text-align: center; padding: 20px 10px; background: #fafafa; border: 1px solid #e0e0e0; border-left: none;">
            <div style="font-size: 32px; font-weight: 700; color: #1a1a1a;">${data.summary.classesHeld}</div>
            <div style="font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Classes Held</div>
          </td>
          <td style="width: 25%; text-align: center; padding: 20px 10px; background: #fafafa; border: 1px solid #e0e0e0; border-left: none;">
            <div style="font-size: 32px; font-weight: 700; color: #1a1a1a;">${data.summary.studentsAttended}</div>
            <div style="font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Students</div>
          </td>
          <td style="width: 25%; text-align: center; padding: 20px 10px; background: #1a1a1a; border: 1px solid #1a1a1a;">
            <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${BWTemplate.formatPrice(data.summary.netRevenueCents)}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Net Revenue</div>
          </td>
        </tr>
      </table>
      ${comparisonSection}

      ${BWTemplate.sectionTitle('Top Performing Classes')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
        <thead>
          <tr style="background: #fafafa;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Class</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Students</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0;">Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${topClassesRows}
        </tbody>
      </table>

      ${BWTemplate.sectionTitle('Revenue Breakdown')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${BWTemplate.infoRow('Gross Ticket Sales', BWTemplate.formatPrice(data.summary.grossRevenueCents))}
        ${BWTemplate.infoRow('Refunds Issued', `-${BWTemplate.formatPrice(data.cancellations.reduce((sum, c) => sum + c.refundAmountCents, 0))}`)}
        ${BWTemplate.infoRow('Platform Fees (10%)', `-${BWTemplate.formatPrice(data.summary.platformFeesCents)}`)}
        ${BWTemplate.totalRow('Net Revenue', BWTemplate.formatPrice(data.summary.netRevenueCents))}
      </table>

      ${data.summary.totalCancellations > 0 ? `
        ${BWTemplate.noticeBox(`${data.summary.totalCancellations} cancellation${data.summary.totalCancellations > 1 ? 's' : ''} this week. Consider following up with students to understand why.`)}
      ` : ''}

      ${BWTemplate.primaryButton('View Full Analytics', 'https://stepperslife.com/organizer/analytics')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        This is your weekly summary from SteppersLife.<br>
        <a href="https://stepperslife.com/settings/notifications" style="color: #1a1a1a;">Manage notification preferences</a>
      </p>
    </div>
  `;

  return {
    html: BWTemplate.wrap(content, `Weekly Summary: ${BWTemplate.formatPrice(data.summary.netRevenueCents)} earned`),
    subject: `Weekly Summary: ${data.summary.totalNewEnrollments} enrollments, ${BWTemplate.formatPrice(data.summary.netRevenueCents)} earned`
  };
}

// ============================================================================
// NO ACTIVITY DIGEST (sent when instructor has no recent activity)
// ============================================================================

export interface NoActivityDigestData {
  instructorName: string;
  instructorEmail: string;
  lastActivityDate?: string;
  upcomingClasses: Array<{
    className: string;
    classDate: string;
    enrollmentCount: number;
    capacity: number;
  }>;
}

export function generateNoActivityDigest(data: NoActivityDigestData): { html: string; subject: string } {
  const upcomingSection = data.upcomingClasses.length > 0
    ? data.upcomingClasses.map(c => `
        <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; margin-bottom: 12px;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">${c.className}</div>
          <div style="font-size: 13px; color: #666666;">${c.classDate}</div>
          <div style="font-size: 13px; color: #1a1a1a; margin-top: 8px;">
            <span style="font-weight: 600;">${c.enrollmentCount}</span> / ${c.capacity} enrolled
          </div>
        </div>
      `).join('')
    : `
      <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 24px; text-align: center;">
        <div style="font-size: 14px; color: #666666; margin-bottom: 16px;">No upcoming classes scheduled</div>
        <a href="https://stepperslife.com/organizer/classes/create" style="display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;">
          Create a Class
        </a>
      </div>
    `;

  const content = `
    <div class="card">
      ${BWTemplate.header('Activity Update')}

      <h1 class="title">No Recent Activity</h1>
      <p class="subtitle">Hey ${data.instructorName}, we noticed there hasn't been any enrollment activity recently.</p>

      ${data.lastActivityDate ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 13px; color: #666666;">Last activity: ${data.lastActivityDate}</span>
        </div>
      ` : ''}

      ${BWTemplate.sectionTitle('Your Upcoming Classes')}
      ${upcomingSection}

      ${BWTemplate.noticeBox('Tip: Promote your classes on social media or share your class links with your network to boost enrollments.')}

      ${BWTemplate.primaryButton('View Dashboard', 'https://stepperslife.com/organizer/dashboard')}

      <div class="divider"></div>

      <p class="text-muted text-center">
        This is an automated update from SteppersLife.<br>
        <a href="https://stepperslife.com/settings/notifications" style="color: #1a1a1a;">Manage notification preferences</a>
      </p>
    </div>
  `;

  return {
    html: BWTemplate.wrap(content, 'Activity update from SteppersLife'),
    subject: `Activity Update: Check your upcoming classes`
  };
}
