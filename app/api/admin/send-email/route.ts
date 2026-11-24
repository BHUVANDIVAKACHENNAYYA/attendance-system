export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { dispatchStudentCredentialEmail } from '@/lib/email/dispatcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, studentName, usn, temporaryPassword, semester, section } = body;

    if (!to || !studentName) {
      return NextResponse.json({ success: false, error: 'Recipient and student name are required' }, { status: 400 });
    }

    const result = await dispatchStudentCredentialEmail({
      to,
      studentName,
      usn: usn || '',
      temporaryPassword: temporaryPassword || 'Student@1234',
      semester: semester ? String(semester) : undefined,
      section: section || undefined,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
