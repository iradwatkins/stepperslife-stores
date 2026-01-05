/**
 * Send Class Reminder Email API
 *
 * Called by Convex scheduled job to send class reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPostalEmail } from '@/lib/email/client';
import {
  generateClassReminderEmail,
  generateEventReminderEmail,
  generateMultiClassReminderEmail,
} from '@/lib/email/templates/reminder-templates';

interface ClassReminderRequest {
  type: 'class' | 'event' | 'multi-class';
  studentName: string;
  studentEmail: string;
  // For single class/event
  className?: string;
  eventName?: string;
  instructorName?: string;
  organizerName?: string;
  classDate?: string;
  eventDate?: string;
  classTime?: string;
  eventTime?: string;
  classEndTime?: string;
  eventEndTime?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  venueState?: string;
  venueZip?: string;
  ticketCode?: string;
  ticketTier?: string;
  seatInfo?: string;
  whatToBring?: string;
  dressCode?: string;
  specialInstructions?: string;
  // For multi-class
  classes?: Array<{
    className: string;
    instructorName: string;
    classDate: string;
    classTime: string;
    venueName: string;
    venueAddress: string;
    ticketCode: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const data: ClassReminderRequest = await request.json();

    if (!data.studentEmail || !data.studentName) {
      return NextResponse.json(
        { error: 'Missing required fields: studentEmail, studentName' },
        { status: 400 }
      );
    }

    if (!process.env.POSTAL_API_KEY) {
      console.error('[ClassReminder] POSTAL_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    let emailResult: { html: string; subject: string };
    let fromAddress: string;

    switch (data.type) {
      case 'event':
        if (!data.eventName || !data.ticketCode) {
          return NextResponse.json(
            { error: 'Missing event fields' },
            { status: 400 }
          );
        }
        emailResult = generateEventReminderEmail({
          attendeeName: data.studentName,
          attendeeEmail: data.studentEmail,
          eventName: data.eventName,
          organizerName: data.organizerName,
          eventDate: data.eventDate || '',
          eventTime: data.eventTime || '',
          eventEndTime: data.eventEndTime,
          venueName: data.venueName || '',
          venueAddress: data.venueAddress || '',
          venueCity: data.venueCity || '',
          venueState: data.venueState || '',
          venueZip: data.venueZip || '',
          ticketCode: data.ticketCode,
          ticketTier: data.ticketTier,
          seatInfo: data.seatInfo,
          specialInstructions: data.specialInstructions,
          dressCode: data.dressCode,
        });
        fromAddress = 'SteppersLife Events <events@stepperslife.com>';
        break;

      case 'multi-class':
        if (!data.classes || data.classes.length === 0) {
          return NextResponse.json(
            { error: 'Missing classes array' },
            { status: 400 }
          );
        }
        emailResult = generateMultiClassReminderEmail({
          studentName: data.studentName,
          studentEmail: data.studentEmail,
          classes: data.classes,
        });
        fromAddress = 'SteppersLife Classes <classes@stepperslife.com>';
        break;

      case 'class':
      default:
        if (!data.className || !data.ticketCode) {
          return NextResponse.json(
            { error: 'Missing class fields' },
            { status: 400 }
          );
        }
        emailResult = generateClassReminderEmail({
          studentName: data.studentName,
          studentEmail: data.studentEmail,
          className: data.className,
          instructorName: data.instructorName || '',
          classDate: data.classDate || '',
          classTime: data.classTime || '',
          classEndTime: data.classEndTime,
          venueName: data.venueName || '',
          venueAddress: data.venueAddress || '',
          venueCity: data.venueCity || '',
          venueState: data.venueState || '',
          venueZip: data.venueZip || '',
          ticketCode: data.ticketCode,
          whatToBring: data.whatToBring,
          specialInstructions: data.specialInstructions,
        });
        fromAddress = 'SteppersLife Classes <classes@stepperslife.com>';
        break;
    }

    const emailResponse = await sendPostalEmail({
      from: fromAddress,
      to: data.studentEmail,
      subject: emailResult.subject,
      html: emailResult.html,
    });

    if (!emailResponse.success) {
      console.error('[ClassReminder] Postal error:', emailResponse.error);
      return NextResponse.json({ error: emailResponse.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: emailResponse.messageId,
      type: data.type,
      sentTo: data.studentEmail,
      subject: emailResult.subject,
    });
  } catch (error) {
    console.error('[ClassReminder] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
