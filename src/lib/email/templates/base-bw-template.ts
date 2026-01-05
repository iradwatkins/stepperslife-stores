/**
 * Black & White Email Template System for SteppersLife
 *
 * Design Principles:
 * - NO colorful gradients - white/light gray backgrounds
 * - Black text for all content
 * - Simple black bordered boxes for sections
 * - SteppersLife logo in black/grayscale
 * - Clean, professional, minimalist
 */

// Base styles for all B&W email templates
export const bwBaseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 40px;
  }
  .header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #1a1a1a;
  }
  .logo {
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
  }
  .logo-subtitle {
    font-size: 11px;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 4px;
  }
  .title {
    font-size: 22px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 24px 0 8px;
    text-align: center;
  }
  .subtitle {
    color: #4a4a4a;
    font-size: 15px;
    margin-bottom: 24px;
    text-align: center;
  }
  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 24px 0 12px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 8px;
  }
  .info-box {
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 20px;
    margin: 16px 0;
  }
  .info-box-bordered {
    background: #ffffff;
    border: 2px solid #1a1a1a;
    border-radius: 4px;
    padding: 20px;
    margin: 16px 0;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e5e5e5;
  }
  .info-row:last-child {
    border-bottom: none;
  }
  .info-label {
    color: #666666;
    font-size: 14px;
  }
  .info-value {
    color: #1a1a1a;
    font-weight: 500;
    font-size: 14px;
  }
  .ticket-card {
    background: #ffffff;
    border: 2px solid #1a1a1a;
    border-radius: 4px;
    padding: 20px;
    margin: 16px 0;
  }
  .ticket-header {
    font-size: 11px;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .ticket-type {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin-top: 4px;
  }
  .ticket-code {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 14px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    padding: 8px 16px;
    border-radius: 4px;
    display: inline-block;
    margin-top: 12px;
    color: #1a1a1a;
  }
  .qr-container {
    width: 120px;
    height: 120px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .button {
    display: inline-block;
    background: #1a1a1a;
    color: #ffffff !important;
    text-decoration: none;
    padding: 14px 32px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 14px;
    margin: 20px 0;
  }
  .button-outline {
    display: inline-block;
    background: #ffffff;
    color: #1a1a1a !important;
    text-decoration: none;
    padding: 12px 28px;
    border: 2px solid #1a1a1a;
    border-radius: 4px;
    font-weight: 600;
    font-size: 14px;
    margin: 20px 0;
  }
  .footer {
    text-align: center;
    padding: 30px 20px;
    color: #666666;
    font-size: 13px;
    border-top: 1px solid #e0e0e0;
    margin-top: 24px;
  }
  .footer a {
    color: #1a1a1a;
    text-decoration: underline;
  }
  .divider {
    height: 1px;
    background: #e0e0e0;
    margin: 24px 0;
  }
  .highlight {
    color: #1a1a1a;
    font-weight: 600;
  }
  .text-center {
    text-align: center;
  }
  .text-muted {
    color: #666666;
    font-size: 13px;
  }
  .amount-total {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .receipt-number {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    color: #666666;
  }
  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-confirmed {
    background: #f5f5f5;
    border: 1px solid #1a1a1a;
    color: #1a1a1a;
  }
  .status-pending {
    background: #fafafa;
    border: 1px dashed #666666;
    color: #666666;
  }
  .status-cancelled {
    background: #fafafa;
    border: 1px solid #666666;
    color: #666666;
    text-decoration: line-through;
  }
  .notice-box {
    background: #fafafa;
    border-left: 4px solid #1a1a1a;
    padding: 16px;
    margin: 20px 0;
  }
  .notice-box p {
    margin: 0;
    color: #4a4a4a;
    font-size: 14px;
  }
  @media only screen and (max-width: 600px) {
    .container { padding: 10px; }
    .card { padding: 24px 16px; }
    .title { font-size: 20px; }
    .info-row { flex-direction: column; gap: 4px; }
  }
`;

/**
 * Wraps content in the base B&W template structure
 */
export function wrapBWTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SteppersLife</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>${bwBaseStyles}</style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} SteppersLife. All rights reserved.</p>
      <p style="margin: 0;">
        <a href="https://stepperslife.com">Website</a> &nbsp;|&nbsp;
        <a href="https://stepperslife.com/support">Support</a> &nbsp;|&nbsp;
        <a href="https://stepperslife.com/privacy">Privacy</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generates the standard B&W header with logo
 */
export function bwHeader(subtitle?: string): string {
  return `
    <div class="header">
      <div class="logo">STEPPERSLIFE</div>
      ${subtitle ? `<div class="logo-subtitle">${subtitle}</div>` : ''}
    </div>
  `;
}

/**
 * Formats a price from cents to display format
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats a time for display
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Generates an order number format
 */
export function generateOrderNumber(prefix: string, id: string): string {
  const shortId = id.slice(-8).toUpperCase();
  const date = new Date();
  const year = date.getFullYear();
  return `${prefix}-${year}-${shortId}`;
}

/**
 * Creates an info row for receipt-style emails
 */
export function infoRow(label: string, value: string, bold?: boolean): string {
  return `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #666666; font-size: 14px;">
        ${label}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #1a1a1a; font-size: 14px; text-align: right; font-weight: ${bold ? '700' : '500'};">
        ${value}
      </td>
    </tr>
  `;
}

/**
 * Creates a total row with larger styling
 */
export function totalRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 12px 0 0; border-top: 2px solid #1a1a1a; color: #1a1a1a; font-size: 14px; font-weight: 600;">
        ${label}
      </td>
      <td style="padding: 12px 0 0; border-top: 2px solid #1a1a1a; color: #1a1a1a; font-size: 20px; text-align: right; font-weight: 700;">
        ${value}
      </td>
    </tr>
  `;
}

/**
 * Creates a notice/info box
 */
export function noticeBox(content: string): string {
  return `
    <div class="notice-box">
      <p>${content}</p>
    </div>
  `;
}

/**
 * Creates a section title
 */
export function sectionTitle(title: string): string {
  return `<div class="section-title">${title}</div>`;
}

/**
 * Creates a primary CTA button
 */
export function primaryButton(text: string, url: string): string {
  return `
    <div class="text-center">
      <a href="${url}" class="button">${text}</a>
    </div>
  `;
}

/**
 * Creates an outline button
 */
export function outlineButton(text: string, url: string): string {
  return `
    <div class="text-center">
      <a href="${url}" class="button-outline">${text}</a>
    </div>
  `;
}

/**
 * Status badge generator
 */
export function statusBadge(status: 'confirmed' | 'pending' | 'cancelled'): string {
  const statusText = {
    confirmed: 'CONFIRMED',
    pending: 'PENDING',
    cancelled: 'CANCELLED'
  };
  return `<span class="status-badge status-${status}">${statusText[status]}</span>`;
}

// Export all components for use in individual templates
export const BWTemplate = {
  wrap: wrapBWTemplate,
  header: bwHeader,
  formatPrice,
  formatDate,
  formatTime,
  generateOrderNumber,
  infoRow,
  totalRow,
  noticeBox,
  sectionTitle,
  primaryButton,
  outlineButton,
  statusBadge
};

export default BWTemplate;
