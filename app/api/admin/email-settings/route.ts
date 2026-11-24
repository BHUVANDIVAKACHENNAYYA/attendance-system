export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { mockStore, saveStore } from '@/lib/supabase/mock-store';
import { sendSmtpMail } from '@/lib/email/smtp-client';

export async function GET() {
  const settings = mockStore.emailSettings || {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpUser: 'bhuvansondabhvi@gmail.com',
    senderName: 'GPS Attendance System',
    senderEmail: 'bhuvansondabhvi@gmail.com',
    directSendEnabled: true,
  };

  // Mask password for display security
  return NextResponse.json({
    success: true,
    settings: {
      ...settings,
      smtpPassConfigured: Boolean(settings.smtpPass || process.env.SMTP_PASS),
      smtpPass: settings.smtpPass ? '••••••••••••••••' : '',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      smtpHost = 'smtp.gmail.com',
      smtpPort = 465,
      smtpUser = 'bhuvansondabhvi@gmail.com',
      smtpPass,
      senderName = 'GPS Attendance System',
      senderEmail = 'bhuvansondabhvi@gmail.com',
      directSendEnabled = true,
      testRecipient,
    } = body;

    const currentPass = mockStore.emailSettings?.smtpPass || process.env.SMTP_PASS || '';
    const finalPass = (smtpPass && smtpPass !== '••••••••••••••••') ? smtpPass.trim() : currentPass;

    mockStore.emailSettings = {
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser.trim(),
      smtpPass: finalPass,
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      directSendEnabled: Boolean(directSendEnabled),
    };

    saveStore();

    // If user requested a test send
    let testResult = null;
    if (testRecipient && finalPass) {
      testResult = await sendSmtpMail({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: finalPass },
        from: `"${senderName}" <${senderEmail}>`,
        to: testRecipient.trim(),
        subject: 'GPS Attendance Portal - SMTP Test Verification',
        text: 'This is a test email confirming that Direct SMTP delivery is working perfectly!',
        html: '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"><h2 style="color: #4338ca;">GPS Attendance System</h2><p>This test email confirms that Direct SMTP delivery is configured and working perfectly!</p></div>',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email settings saved successfully',
      testResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
