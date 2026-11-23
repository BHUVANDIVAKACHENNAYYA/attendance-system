import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isUsingMockData, mockStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get('studentId');

    // Security check: Students can only view their own history!
    let targetStudentId = user.id;
    if (user.role === 'ADMIN' && requestedStudentId) {
      targetStudentId = requestedStudentId;
    } else if (user.role === 'STUDENT' && requestedStudentId && requestedStudentId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied. You can only view your own records.' },
        { status: 403 }
      );
    }

    if (isUsingMockData()) {
      // Find all conducted sessions (CLOSED or ACTIVE)
      const allSessions = mockStore.sessions;
      const studentRecords = mockStore.records.filter((r) => r.student_id === targetStudentId);

      // Build consolidated history
      const history = allSessions.map((session) => {
        const record = studentRecords.find((r) => r.session_id === session.id);
        const location = mockStore.locations.find((l) => l.id === session.location_id);

        let status: 'PRESENT' | 'LATE' | 'ABSENT' | 'NOT_MARKED' = 'ABSENT';
        if (record) {
          status = record.status as any;
        } else if (session.status === 'ACTIVE' || session.status === 'SCHEDULED') {
          status = 'NOT_MARKED';
        }

        return {
          sessionId: session.id,
          subject: session.subject,
          className: session.class_name,
          date: session.attendance_date,
          startTime: session.start_time,
          endTime: session.end_time,
          locationName: location?.name || 'Unknown Location',
          status,
          markedAt: record?.marked_at || null,
          distanceMeters: record?.distance_from_location_meters ?? null,
          recordId: record?.id || null,
        };
      });

      // Stats calculation
      const totalConducted = allSessions.filter((s) => s.status === 'CLOSED').length || (allSessions.length > 0 ? allSessions.length : 1);
      const presentCount = studentRecords.filter((r) => r.status === 'PRESENT').length;
      const lateCount = studentRecords.filter((r) => r.status === 'LATE').length;
      const absentCount = Math.max(0, totalConducted - (presentCount + lateCount));
      const percentage = totalConducted > 0 ? Math.round(((presentCount + lateCount) / totalConducted) * 1000) / 10 : 0;

      return NextResponse.json({
        success: true,
        stats: {
          totalConducted,
          presentCount,
          lateCount,
          absentCount,
          attendancePercentage: percentage,
        },
        history,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data: allSessions } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*)')
      .order('attendance_date', { ascending: false });

    const { data: studentRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', targetStudentId);

    const records = studentRecords || [];
    const sessions = allSessions || [];

    const history = sessions.map((session) => {
      const record = records.find((r) => r.session_id === session.id);
      let status: 'PRESENT' | 'LATE' | 'ABSENT' | 'NOT_MARKED' = 'ABSENT';
      if (record) {
        status = record.status as any;
      } else if (session.status === 'ACTIVE' || session.status === 'SCHEDULED') {
        status = 'NOT_MARKED';
      }

      return {
        sessionId: session.id,
        subject: session.subject,
        className: session.class_name,
        date: session.attendance_date,
        startTime: session.start_time,
        endTime: session.end_time,
        locationName: session.location?.name || 'Unknown Location',
        status,
        markedAt: record?.marked_at || null,
        distanceMeters: record?.distance_from_location_meters ?? null,
        recordId: record?.id || null,
      };
    });

    const closedSessionsCount = sessions.filter((s) => s.status === 'CLOSED').length || (sessions.length > 0 ? sessions.length : 1);
    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const absentCount = Math.max(0, closedSessionsCount - (presentCount + lateCount));
    const percentage = closedSessionsCount > 0 ? Math.round(((presentCount + lateCount) / closedSessionsCount) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalConducted: closedSessionsCount,
        presentCount,
        lateCount,
        absentCount,
        attendancePercentage: percentage,
      },
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
