/**
 * Email Templates for Stepperslife Platform
 * These templates generate HTML emails with consistent branding
 */

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: #ffffff; border-radius: 4px; padding: 40px; border: 1px solid #e0e0e0; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; }
  .logo { font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; }
  .title { font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 20px 0 10px; }
  .subtitle { color: #4a4a4a; font-size: 15px; margin-bottom: 30px; }
  .button { display: inline-block; background: #1a1a1a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-weight: 600; margin: 20px 0; }
  .button:hover { opacity: 0.9; }
  .info-box { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #666666; font-size: 14px; }
  .info-value { color: #1a1a1a; font-weight: 500; }
  .ticket-card { background: #ffffff; border: 2px solid #1a1a1a; color: #1a1a1a; border-radius: 4px; padding: 24px; margin: 20px 0; }
  .ticket-number { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 14px; background: #f5f5f5; border: 1px solid #e0e0e0; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 10px; }
  .qr-placeholder { width: 120px; height: 120px; background: white; border: 1px solid #e0e0e0; border-radius: 4px; margin: 20px auto; display: flex; align-items: center; justify-content: center; color: #1a1a1a; }
  .footer { text-align: center; padding: 30px 20px; color: #666666; font-size: 13px; border-top: 1px solid #e0e0e0; margin-top: 24px; }
  .footer a { color: #1a1a1a; text-decoration: underline; }
  .divider { height: 1px; background: #e0e0e0; margin: 24px 0; }
  .highlight { color: #1a1a1a; font-weight: 600; }
  .text-center { text-align: center; }
  .mt-20 { margin-top: 20px; }
  .mb-20 { margin-bottom: 20px; }
`

function wrapTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SteppersLife</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} SteppersLife. All rights reserved.</p>
      <p>
        <a href="https://stepperslife.com">Visit Website</a> |
        <a href="https://stepperslife.com/support">Support</a> |
        <a href="https://stepperslife.com/privacy">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

export interface WelcomeEmailData {
  name: string
  email: string
}

export function welcomeEmailTemplate(data: WelcomeEmailData): { subject: string; html: string } {
  const content = `
    <div class="card">
      <div class="header">
        <div class="logo">SteppersLife</div>
      </div>
      <h1 class="title">Welcome to the Community!</h1>
      <p class="subtitle">Hey ${data.name}, we're thrilled to have you join SteppersLife!</p>
      
      <p>SteppersLife is your gateway to the vibrant world of stepping events, performances, and community gatherings. Here's what you can do:</p>
      
      <div class="info-box">
        <p><strong>🎫 Discover Events</strong> - Find stepping events in your area</p>
        <p><strong>🎟️ Buy Tickets</strong> - Secure your spot at the hottest events</p>
        <p><strong>👥 Connect</strong> - Meet fellow steppers and dance enthusiasts</p>
        <p><strong>🏪 Shop</strong> - Browse vendor stores for stepping gear</p>
      </div>
      
      <div class="text-center">
        <a href="https://stepperslife.com/events" class="button">Explore Events</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #666666; font-size: 14px;">Your account was created with: <span class="highlight">${data.email}</span></p>
      <p style="color: #666666; font-size: 14px;">If you didn't create this account, please contact us immediately at <a href="mailto:support@stepperslife.com" style="color: #1a1a1a; text-decoration: underline;">support@stepperslife.com</a></p>
    </div>
  `
  
  return {
    subject: `Welcome to SteppersLife, ${data.name}!`,
    html: wrapTemplate(content, 'Welcome to SteppersLife - Your stepping journey starts here!')
  }
}

export interface TicketPurchaseEmailData {
  buyerName: string
  buyerEmail: string
  orderNumber: string
  eventName: string
  eventDate: string
  eventTime: string
  eventLocation: string
  tickets: Array<{
    ticketNumber: string
    ticketType: string
    attendeeName: string
    price: number
  }>
  subtotal: number
  fees: number
  total: number
}

export function ticketPurchaseEmailTemplate(data: TicketPurchaseEmailData): { subject: string; html: string } {
  const ticketCards = data.tickets.map(ticket => `
    <div class="ticket-card">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase;">Ticket</div>
          <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${ticket.ticketType}</div>
          <div style="margin-top: 8px; opacity: 0.9;">${ticket.attendeeName}</div>
        </div>
        <div class="qr-placeholder">QR</div>
      </div>
      <div class="ticket-number">${ticket.ticketNumber}</div>
    </div>
  `).join('')

  const content = `
    <div class="card">
      <div class="header">
        <div class="logo">SteppersLife</div>
      </div>
      <h1 class="title">Your Tickets are Confirmed! 🎉</h1>
      <p class="subtitle">Order #${data.orderNumber}</p>
      
      <div class="info-box">
        <h3 style="margin: 0 0 15px 0; color: #1f2937;">${data.eventName}</h3>
        <div class="info-row">
          <span class="info-label">📅 Date</span>
          <span class="info-value">${data.eventDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏰ Time</span>
          <span class="info-value">${data.eventTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📍 Location</span>
          <span class="info-value">${data.eventLocation}</span>
        </div>
      </div>
      
      <h3 style="margin-top: 30px;">Your Tickets</h3>
      ${ticketCards}
      
      <div class="info-box mt-20">
        <h4 style="margin: 0 0 15px 0; color: #1f2937;">Order Summary</h4>
        <div class="info-row">
          <span class="info-label">Subtotal</span>
          <span class="info-value">$${(data.subtotal / 100).toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fees</span>
          <span class="info-value">$${(data.fees / 100).toFixed(2)}</span>
        </div>
        <div class="info-row" style="border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 8px;">
          <span class="info-label" style="font-weight: 600; color: #1a1a1a;">Total</span>
          <span class="info-value" style="font-size: 18px; color: #1a1a1a; font-weight: 700;">$${(data.total / 100).toFixed(2)}</span>
        </div>
      </div>
      
      <div class="text-center mt-20">
        <a href="https://stepperslife.com/orders/${data.orderNumber}" class="button">View Order Details</a>
      </div>
      
      <div class="divider"></div>
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 20px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>📱 Pro Tip:</strong> Save this email or take a screenshot of your tickets. You'll need to show them at the door!
        </p>
      </div>
    </div>
  `
  
  return {
    subject: `Your tickets for ${data.eventName} are confirmed!`,
    html: wrapTemplate(content, `Order confirmed! Your tickets for ${data.eventName} are ready.`)
  }
}

export interface OrderConfirmationEmailData {
  buyerName: string
  orderNumber: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  shippingAddress?: {
    street: string
    city: string
    state: string
    zip: string
  }
}

export function orderConfirmationEmailTemplate(data: OrderConfirmationEmailData): { subject: string; html: string } {
  const itemRows = data.items.map(item => `
    <div class="info-row">
      <span class="info-label">${item.name} x${item.quantity}</span>
      <span class="info-value">$${(item.price * item.quantity / 100).toFixed(2)}</span>
    </div>
  `).join('')

  const addressSection = data.shippingAddress ? `
    <div class="info-box">
      <h4 style="margin: 0 0 10px 0; color: #1f2937;">Shipping Address</h4>
      <p style="margin: 0; color: #6b7280;">
        ${data.shippingAddress.street}<br>
        ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
      </p>
    </div>
  ` : ''

  const content = `
    <div class="card">
      <div class="header">
        <div class="logo">SteppersLife</div>
      </div>
      <h1 class="title">Order Confirmed! 🛍️</h1>
      <p class="subtitle">Thank you for your purchase, ${data.buyerName}!</p>
      <p style="text-align: center; color: #6b7280;">Order #${data.orderNumber}</p>
      
      <div class="info-box">
        <h4 style="margin: 0 0 15px 0; color: #1f2937;">Order Items</h4>
        ${itemRows}
        <div class="divider"></div>
        <div class="info-row">
          <span class="info-label">Subtotal</span>
          <span class="info-value">$${(data.subtotal / 100).toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Shipping</span>
          <span class="info-value">$${(data.shipping / 100).toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tax</span>
          <span class="info-value">$${(data.tax / 100).toFixed(2)}</span>
        </div>
        <div class="info-row" style="border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 8px;">
          <span class="info-label" style="font-weight: 600; color: #1a1a1a;">Total</span>
          <span class="info-value" style="font-size: 18px; color: #1a1a1a; font-weight: 700;">$${(data.total / 100).toFixed(2)}</span>
        </div>
      </div>
      
      ${addressSection}
      
      <div class="text-center mt-20">
        <a href="https://stepperslife.com/orders/${data.orderNumber}" class="button">Track Order</a>
      </div>
    </div>
  `
  
  return {
    subject: `Order #${data.orderNumber} Confirmed - SteppersLife`,
    html: wrapTemplate(content, 'Your order has been confirmed and is being processed.')
  }
}

export interface PasswordResetEmailData {
  name: string
  resetUrl: string
  expiresIn: string
}

export function passwordResetEmailTemplate(data: PasswordResetEmailData): { subject: string; html: string } {
  const content = `
    <div class="card">
      <div class="header">
        <div class="logo">SteppersLife</div>
      </div>
      <h1 class="title">Reset Your Password</h1>
      <p class="subtitle">Hi ${data.name}, we received a request to reset your password.</p>
      
      <div class="text-center">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
        This link will expire in ${data.expiresIn}.
      </p>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      
      <p style="color: #666666; font-size: 14px;">
        If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
        <a href="${data.resetUrl}" style="color: #1a1a1a; word-break: break-all; text-decoration: underline;">${data.resetUrl}</a>
      </p>
    </div>
  `
  
  return {
    subject: 'Reset Your SteppersLife Password',
    html: wrapTemplate(content, 'Password reset requested for your SteppersLife account')
  }
}

export interface EventReminderEmailData {
  attendeeName: string
  eventName: string
  eventDate: string
  eventTime: string
  eventLocation: string
  ticketCount: number
}

export function eventReminderEmailTemplate(data: EventReminderEmailData): { subject: string; html: string } {
  const content = `
    <div class="card">
      <div class="header">
        <div class="logo">SteppersLife</div>
      </div>
      <h1 class="title">Event Reminder! 🎉</h1>
      <p class="subtitle">Hey ${data.attendeeName}, your event is coming up soon!</p>
      
      <div class="info-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">${data.eventName}</h3>
        <div class="info-row">
          <span class="info-label">📅 Date</span>
          <span class="info-value">${data.eventDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏰ Time</span>
          <span class="info-value">${data.eventTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📍 Location</span>
          <span class="info-value">${data.eventLocation}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🎟️ Your Tickets</span>
          <span class="info-value">${data.ticketCount} ticket${data.ticketCount > 1 ? 's' : ''}</span>
        </div>
      </div>
      
      <div class="text-center">
        <a href="https://stepperslife.com/my-tickets" class="button">View My Tickets</a>
      </div>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-top: 20px;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>✅ Don't forget:</strong> Have your tickets ready on your phone or printed out when you arrive!
        </p>
      </div>
    </div>
  `
  
  return {
    subject: `Reminder: ${data.eventName} is coming up!`,
    html: wrapTemplate(content, `Don't forget! ${data.eventName} is happening soon.`)
  }
}

export interface VendorApprovalEmailData {
  vendorName: string
  storeName: string
  approved: boolean
  reason?: string
}

export function vendorApprovalEmailTemplate(data: VendorApprovalEmailData): { subject: string; html: string } {
  const statusContent = data.approved ? `
    <div style="background: #fafafa; border: 2px solid #1a1a1a; border-radius: 4px; padding: 24px; text-align: center;">
      <h2 style="color: #1a1a1a; margin: 0;">APPLICATION APPROVED</h2>
      <p style="color: #4a4a4a; margin: 10px 0 0 0;">Your vendor application has been approved!</p>
    </div>

    <p class="mt-20">You can now:</p>
    <div class="info-box">
      <p>- Set up your store profile and branding</p>
      <p>- Add products to your store</p>
      <p>- Start accepting orders from customers</p>
      <p>- Access vendor analytics and reports</p>
    </div>

    <div class="text-center">
      <a href="https://stepperslife.com/vendor/dashboard" class="button">Go to Vendor Dashboard</a>
    </div>
  ` : `
    <div style="background: #fafafa; border: 2px dashed #666666; border-radius: 4px; padding: 24px; text-align: center;">
      <h2 style="color: #1a1a1a; margin: 0;">APPLICATION NOT APPROVED</h2>
    </div>

    ${data.reason ? `
      <div class="info-box mt-20">
        <h4 style="margin: 0 0 10px 0; color: #1a1a1a;">Reason:</h4>
        <p style="margin: 0; color: #666666;">${data.reason}</p>
      </div>
    ` : ''}

    <p class="mt-20" style="color: #666666;">
      Don't worry! You can update your application and resubmit. If you have questions, please contact our support team.
    </p>

    <div class="text-center">
      <a href="mailto:support@stepperslife.com" class="button">Contact Support</a>
    </div>
  `

  const content = `
    <div class="card">
      <div class="header">
        <div class="logo">SteppersLife</div>
      </div>
      <h1 class="title">Vendor Application Update</h1>
      <p class="subtitle">Hi ${data.vendorName}, here's an update on your vendor application for "${data.storeName}"</p>
      
      ${statusContent}
    </div>
  `
  
  return {
    subject: data.approved
      ? 'Your SteppersLife Vendor Application is Approved'
      : 'Update on Your SteppersLife Vendor Application',
    html: wrapTemplate(content, data.approved
      ? 'Great news! Your vendor application has been approved.'
      : 'We have an update on your vendor application.')
  }
}
