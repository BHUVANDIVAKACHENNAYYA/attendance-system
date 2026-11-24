export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { manualAttendanceCorrectionSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { AttendanceRecord } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = manualAttendanceCorrectionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid correction payload',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { recordId, sessionId, studentId, status, reason } = validated.data;
    const now = new Date().toISOString();

    if (isUsingMockData()) {
      let record = recordId
        ? mockStore.records.find((r) => r.id === recordId)
        : mockStore.records.find((r) => r.session_id === sessionId && r.student_id === studentId);

      const oldStatus = record ? record.status : 'NOT_MARKED';

      if (record) {
        record.status = status as any;
        record.verification_message = `Manual override by Admin (${user.name}): ${reason}`;
        record.updated_at = now;
      } else {
        record = {
          id: `rec-${Date.now()}`,
          session_id: sessionId,
          student_id: studentId,
          marked_at: now,
          student_latitude: null,
          student_longitude: null,
          gps_accuracy_meters: null,
          distance_from_location_meters: null,
          location_verified: true,
          status: status as any,
          verification_message: `Manual mark by Admin: ${reason}`,
          created_at: now,
          updated_at: now,
        };
        mockStore.records.push(record);
      }

      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'ATTENDANCE_MANUALLY_CHANGED',
        entity_type: 'attendance_record',
        entity_id: record.id,
        metadata: {
          sessionId,
          studentId,
          oldStatus,
          newStatus: status,
          reason,
          adminId: user.id,
        },
        created_at: now,
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: `Attendance updated to ${status}.`,
        record,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();

    // Check if record exists
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .maybeSingle();

    const oldStatus = existing ? existing.status : 'NOT_MARKED';

    const { data: updatedRecord, error } = await supabase
      .from('attendance_records')
      .upsert(
        {
          id: existing?.id,
          session_id: sessionId,
          student_id: studentId,
          marked_at: existing?.marked_at || now,
          location_verified: true,
          status,
          verification_message: `Manual override by Admin: ${reason}`,
          updated_at: now,
        },
        { onConflict: 'session_id,student_id' }
      )
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ATTENDANCE_MANUALLY_CHANGED',
      entity_type: 'attendance_record',
      entity_id: updatedRecord.id,
      metadata: {
        sessionId,
        studentId,
        oldStatus,
        newStatus: status,
        reason,
        adminId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Attendance updated to ${status}.`,
      record: updatedRecord,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Manual correction failed' },
      { status: 500 }
    );
  }
}
