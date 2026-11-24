import { mockStore, saveStore, isUsingMockData } from '@/lib/supabase/mock-store';
import { OutgoingEmail } from '@/types';
import { sendSmtpMail } from './smtp-client';

export interface SendEmailPayload {
  to: string;
  studentName: string;
  usn: string;
  temporaryPassword: string;
  semester?: string;
  section?: string;
}

export interface SendEmailResult {
  sent: boolean;
  simulated: boolean;
  provider: string;
  message: string;
  subject: string;
  bodyText: string;
  mailtoUrl: string;
  webmailGmailUrl: string;
}

export function generateCredentialEmailContent(payload: SendEmailPayload) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl}/login`;
  const subject = `Your GPS Student Attendance Portal Credentials - ${payload.studentName} (${payload.usn})`;

  const bodyText = `Dear ${payload.studentName},

Welcome to the KLE Technological University GPS-Based Student Attendance Management Portal.

Your student account has been registered by college administration. You can now log in to the Student Portal to view scheduled class sessions, verify your GPS location, and mark your attendance.

Your Account Credentials:
----------------------------------------
Portal URL:         ${loginUrl}
Login Email:        ${payload.to}
University Seat No: ${payload.usn}
Semester / Section: Semester ${payload.semester || '5'}, Section ${payload.section || 'A'}
Temporary Password: ${payload.temporaryPassword}
----------------------------------------

How to Get Started:
1. Open the portal link: ${loginUrl}
2. Sign in with your registered college email and the temporary password above.
3. Allow location access when prompted by your browser during attendance sessions.
4. For security, please navigate to your Student Profile and change your password.

If you have any questions or did not expect this registration, please contact your department administrator immediately.

Best regards,
Academic Attendance Department`;

  const bodyHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRrP5JV4V9SgHgmjpyKm5OLrbQOSECUeX4hNohBqtehQ&s=10" alt="KLE Technological University" style="height: 48px; width: auto; max-width: 220px; display: block; margin: 0 auto 12px auto;" />
      <h1 style="color: #4338ca; font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">GPS Attendance Management System</h1>
      <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">KLE Technological University • Academic Portal</p>
    </div>

    <p style="color: #334155; font-size: 14px; line-height: 1.6;">Dear <strong>${payload.studentName}</strong>,</p>
    <p style="color: #334155; font-size: 14px; line-height: 1.6;">
      Your student account has been officially registered by the college administration. You can now log in to view active sessions, verify your classroom GPS location, and record attendance.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Student Name:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${payload.studentName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">USN / Roll No:</td>
          <td style="padding: 6px 0; color: #0f172a; font-mono; font-weight: 700;">${payload.usn}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Login Email:</td>
          <td style="padding: 6px 0; color: #4338ca; font-weight: 700;">${payload.to}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temporary Password:</td>
          <td style="padding: 6px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: 700;">${payload.temporaryPassword}</span></td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
        Sign In to Student Portal
      </a>
    </div>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 6px 0;"><strong>Security Reminder:</strong> Please change your password under your Student Profile immediately after your first sign in.</p>
      <p style="margin: 0;">If you have any questions, please contact your department administrator.</p>
    </div>
  </div>
  `;

  const mailtoUrl = `mailto:${encodeURIComponent(payload.to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(bodyText)}`;

  const webmailGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    payload.to
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return { subject, bodyText, bodyHtml, mailtoUrl, webmailGmailUrl, loginUrl };
}

export async function dispatchStudentCredentialEmail(
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  const { subject, bodyText, bodyHtml, mailtoUrl, webmailGmailUrl } =
    generateCredentialEmailContent(payload);

  // 1. Check for Direct SMTP Configuration
  const settings = mockStore.emailSettings;
  const smtpUser = process.env.SMTP_USER || settings?.smtpUser;
  const smtpPass = process.env.SMTP_PASS || settings?.smtpPass;
  const smtpHost = process.env.SMTP_HOST || settings?.smtpHost || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || settings?.smtpPort || 465);
  const senderName =
    process.env.SMTP_FROM_NAME || settings?.senderName || 'GPS Attendance System';
  const senderEmail =
    process.env.SMTP_FROM_EMAIL || settings?.senderEmail || smtpUser || 'bhuvansondabhvi@gmail.com';
  const from = `"${senderName}" <${senderEmail}>`;

  if (smtpPass && smtpUser) {
    try {
      console.log(`[SMTP] Attempting direct delivery to ${payload.to} via ${smtpHost}:${smtpPort}...`);
      const smtpRes = await sendSmtpMail({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        from,
        to: payload.to,
        subject,
        text: bodyText,
        html: bodyHtml,
      });

      if (smtpRes.success) {
        recordEmailLog({
          to: payload.to,
          student_name: payload.studentName,
          usn: payload.usn,
          temporary_password: payload.temporaryPassword,
          subject,
          body_text: bodyText,
          status: 'SENT',
        });

        return {
          sent: true,
          simulated: false,
          provider: `Direct SMTP (${smtpHost})`,
          message: `Email successfully delivered to ${payload.to} via Direct SMTP.`,
          subject,
          bodyText,
          mailtoUrl,
          webmailGmailUrl,
        };
      } else {
        console.warn(`[SMTP] Direct delivery failed: ${smtpRes.error}`);
      }
    } catch (err: any) {
      console.error('[SMTP] Direct delivery exception:', err);
    }
  }

  // 2. Check for Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [payload.to],
          subject,
          text: bodyText,
          html: bodyHtml,
        }),
      });

      if (res.ok) {
        recordEmailLog({
          to: payload.to,
          student_name: payload.studentName,
          usn: payload.usn,
          temporary_password: payload.temporaryPassword,
          subject,
          body_text: bodyText,
          status: 'SENT',
        });

        return {
          sent: true,
          simulated: false,
          provider: 'Resend',
          message: `Email successfully delivered to ${payload.to} via Resend.`,
          subject,
          bodyText,
          mailtoUrl,
          webmailGmailUrl,
        };
      }
    } catch (err: any) {
      console.error('Resend delivery failed:', err);
    }
  }

  // 3. Check for SendGrid API
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const sendgridFrom = process.env.EMAIL_FROM || 'attendance@college.edu';

  if (sendgridApiKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: sendgridFrom },
          subject,
          content: [
            { type: 'text/plain', value: bodyText },
            { type: 'text/html', value: bodyHtml },
          ],
        }),
      });

      if (res.ok || res.status === 202) {
        recordEmailLog({
          to: payload.to,
          student_name: payload.studentName,
          usn: payload.usn,
          temporary_password: payload.temporaryPassword,
          subject,
          body_text: bodyText,
          status: 'SENT',
        });

        return {
          sent: true,
          simulated: false,
          provider: 'SendGrid',
          message: `Email successfully delivered to ${payload.to} via SendGrid.`,
          subject,
          bodyText,
          mailtoUrl,
          webmailGmailUrl,
        };
      }
    } catch (err: any) {
      console.error('SendGrid delivery failed:', err);
    }
  }

  // 4. Fallback: Log to Outbox with direct mailto / webmail support
  recordEmailLog({
    to: payload.to,
    student_name: payload.studentName,
    usn: payload.usn,
    temporary_password: payload.temporaryPassword,
    subject,
    body_text: bodyText,
    status: 'SIMULATED',
    error_message: 'Direct SMTP password not configured yet. Ready for 1-click dispatch.',
  });

  return {
    sent: false,
    simulated: true,
    provider: 'Local Outbox / Ready for 1-Click Send',
    message: `Email prepared for ${payload.to}. Click 'Direct Send & Close' to deliver credentials.`,
    subject,
    bodyText,
    mailtoUrl,
    webmailGmailUrl,
  };
}

function recordEmailLog(data: Omit<OutgoingEmail, 'id' | 'created_at'>) {
  if (isUsingMockData()) {
    if (!mockStore.outgoingEmails) {
      mockStore.outgoingEmails = [];
    }

    mockStore.outgoingEmails.unshift({
      id: `eml-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      created_at: new Date().toISOString(),
    });

    saveStore();
  }
}
