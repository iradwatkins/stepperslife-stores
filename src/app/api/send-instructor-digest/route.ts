/**
 * Send Instructor Digest Email API
 *
 * Called by Convex scheduled job to send daily/weekly instructor digests
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPostalEmail } from '@/lib/email/client';
import {
  generateInstructorDailyDigest,
  generateInstructorWeeklyDigest,
  generateNoActivityDigest,
  InstructorDailyDigestData,
  InstructorWeeklyDigestData,
  NoActivityDigestData,
} from '@/lib/email/templates/digest-templates';

type DigestRequest =
  | ({ type: 'daily' } & InstructorDailyDigestData)
  | ({ type: 'weekly' } & InstructorWeeklyDigestData)
  | ({ type: 'no-activity' } & NoActivityDigestData);

export async function POST(request: NextRequest) {
  try {
    const data: DigestRequest = await request.json();

    if (!data.instructorEmail || !data.instructorName) {
      return NextResponse.json(
        { error: 'Missing required fields: instructorEmail, instructorName' },
        { status: 400 }
      );
    }

    if (!process.env.POSTAL_API_KEY) {
      console.error('[InstructorDigest] POSTAL_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    let emailResult: { html: string; subject: string };

    switch (data.type) {
      case 'weekly':
        emailResult = generateInstructorWeeklyDigest(data);
        break;

      case 'no-activity':
        emailResult = generateNoActivityDigest(data);
        break;

      case 'daily':
      default:
        emailResult = generateInstructorDailyDigest(data as InstructorDailyDigestData);
        break;
    }

    const emailResponse = await sendPostalEmail({
      from: 'SteppersLife <noreply@stepperslife.com>',
      to: data.instructorEmail,
      subject: emailResult.subject,
      html: emailResult.html,
    });

    if (!emailResponse.success) {
      console.error('[InstructorDigest] Postal error:', emailResponse.error);
      return NextResponse.json({ error: emailResponse.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: emailResponse.messageId,
      type: data.type,
      sentTo: data.instructorEmail,
      subject: emailResult.subject,
    });
  } catch (error) {
    console.error('[InstructorDigest] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
