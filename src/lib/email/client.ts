// Postal (self-hosted) - postal.toolboxhosting.com
// Migrated from Resend for self-hosted email delivery

const POSTAL_API_URL = process.env.POSTAL_API_URL || 'https://postal.toolboxhosting.com'
const POSTAL_API_KEY = process.env.POSTAL_API_KEY

if (!POSTAL_API_KEY) {
  console.warn('POSTAL_API_KEY is not set. Email functionality will be disabled.')
}

export interface PostalEmailOptions {
  to: string | string[]
  from: string
  subject: string
  html?: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  attachments?: Array<{
    name: string
    content_type: string
    data: string // base64 encoded
  }>
}

export interface PostalEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendPostalEmail(options: PostalEmailOptions): Promise<PostalEmailResult> {
  if (!POSTAL_API_KEY) {
    console.warn('Email not sent - Postal client not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch(`${POSTAL_API_URL}/api/v1/send/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-API-Key': POSTAL_API_KEY,
      },
      body: JSON.stringify({
        to: Array.isArray(options.to) ? options.to : [options.to],
        from: options.from,
        subject: options.subject,
        html_body: options.html,
        plain_body: options.text,
        cc: options.cc,
        bcc: options.bcc,
        reply_to: options.replyTo,
        attachments: options.attachments,
      }),
    })

    const data = await response.json()

    if (data.status === 'success') {
      return {
        success: true,
        messageId: data.data?.message_id || data.data?.messages?.[0]?.id
      }
    } else {
      console.error('Postal API error:', data)
      return { success: false, error: data.data?.message || 'Failed to send email' }
    }
  } catch (err) {
    console.error('Email sending error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

// Export postal client for direct use
export const postal = POSTAL_API_KEY ? { send: sendPostalEmail } : null

export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@stepperslife.com'
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@stepperslife.com'
