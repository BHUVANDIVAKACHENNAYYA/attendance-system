export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'New password and confirm password do not match.' },
        { status: 400 }
      );
    }

    if (isUsingMockData()) {
      const studentIdx = mockStore.profiles.findIndex((p) => p.id === user.id);
      if (studentIdx === -1) {
        return NextResponse.json(
          { success: false, message: 'Student profile not found.' },
          { status: 404 }
        );
      }

      const currentStoredPass = mockStore.profiles[studentIdx].password;
      // If user had an existing password, verify it matches
      if (currentStoredPass && currentStoredPass !== currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect.' },
          { status: 400 }
        );
      }

      mockStore.profiles[studentIdx].password = newPassword;
      mockStore.profiles[studentIdx].updated_at = new Date().toISOString();

      if (!mockStore.auditLogs) mockStore.auditLogs = [];
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'ATTENDANCE_MANUALLY_CHANGED' as any,
        entity_type: 'students',
        entity_id: user.id,
        metadata: {
          event: 'STUDENT_PASSWORD_CHANGED',
          studentEmail: user.email,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully! Please use your new password for future logins.',
      });
    }

    // Supabase Auth Password Update
    const supabase = createClientServer();
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      return NextResponse.json(
        { success: false, message: updateErr.message || 'Failed to update password' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully! Please use your new password for future logins.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error changing password' },
      { status: 500 }
    );
  }
}
