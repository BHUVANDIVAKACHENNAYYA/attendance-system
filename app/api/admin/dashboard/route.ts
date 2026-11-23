import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isUsingMockData, mockStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const selectedSessionId = searchParams.get('sessionId');

    if (isUsingMockData()) {
      const activeSession =
        (selectedSessionId
          ? mockStore.sessions.find((s) => s.id === selectedSessionId)
          : mockStore.sessions.find((s) => s.status === 'ACTIVE')) ||
        mockStore.sessions[0];

      const allStudents = mockStore.profiles.filter((p) => p.role === 'STUDENT' && p.active);
      const totalStudents = allStudents.length;

      const sessionLocation = activeSession
        ? mockStore.locations.find((l) => l.id === activeSession.location_id)
        : null;

      const recordsForSession = activeSession
        ? mockStore.records.filter((r) => r.session_id === activeSession.id)
        : [];

      let presentCount = 0;
      let lateCount = 0;

      const attendanceList = allStudents.map((student, index) => {
        const record = recordsForSession.find((r) => r.student_id === student.id);
        let status: 'PRESENT' | 'LATE' | 'NOT_MARKED' | 'ABSENT' = 'NOT_MARKED';
        let markedTime = '--';
        let distanceStr = '--';
        let locationVerified = false;

        if (record) {
          status = record.status as any;
          if (record.status === 'PRESENT') presentCount++;
          if (record.status === 'LATE') lateCount++;
          locationVerified = record.location_verified;

          if (record.marked_at) {
            markedTime = new Date(record.marked_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
          }

          if (record.distance_from_location_meters !== null && record.distance_from_location_meters !== undefined) {
            distanceStr = `${Math.round(record.distance_from_location_meters)} m`;
          }
        } else if (activeSession && activeSession.status === 'CLOSED') {
          status = 'ABSENT';
        }

        return {
          no: index + 1,
          studentId: student.id,
          name: student.name,
          usn: student.usn || `USN${String(index + 1).padStart(3, '0')}`,
          email: student.email,
          semester: student.semester || '5',
          section: student.section || 'A',
          photoUrl: student.photo_url || null,
          markedTime,
          distance: distanceStr,
          rawDistance: record?.distance_from_location_meters ?? null,
          status,
          locationVerified,
          recordId: record?.id || null,
        };
      });

      const notMarkedCount = totalStudents - (presentCount + lateCount);

      return NextResponse.json({
        success: true,
        stats: {
          totalStudents,
          presentCount,
          lateCount,
          notMarkedCount: Math.max(0, notMarkedCount),
        },
        session: activeSession ? { ...activeSession, location: sessionLocation } : null,
        allSessions: mockStore.sessions,
        attendanceList,
        locations: mockStore.locations,
        serverTime: new Date().toISOString(),
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'STUDENT')
      .eq('active', true)
      .order('usn', { ascending: true });

    const allStudents = studentsData || [];
    const totalStudents = allStudents.length;

    const { data: sessionsData } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*)')
      .order('created_at', { ascending: false });

    const sessions = sessionsData || [];
    const activeSession = selectedSessionId
      ? sessions.find((s) => s.id === selectedSessionId)
      : sessions.find((s) => s.status === 'ACTIVE') || sessions[0] || null;

    let recordsForSession: any[] = [];
    if (activeSession) {
      const { data: recordsData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', activeSession.id);
      recordsForSession = recordsData || [];
    }

    let presentCount = 0;
    let lateCount = 0;

    const attendanceList = allStudents.map((student, index) => {
      const record = recordsForSession.find((r) => r.student_id === student.id);
      let status: 'PRESENT' | 'LATE' | 'NOT_MARKED' | 'ABSENT' = 'NOT_MARKED';
      let markedTime = '--';
      let distanceStr = '--';
      let locationVerified = false;

      if (record) {
        status = record.status;
        if (record.status === 'PRESENT') presentCount++;
        if (record.status === 'LATE') lateCount++;
        locationVerified = record.location_verified;

        if (record.marked_at) {
          markedTime = new Date(record.marked_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        }

        if (record.distance_from_location_meters !== null && record.distance_from_location_meters !== undefined) {
          distanceStr = `${Math.round(record.distance_from_location_meters)} m`;
        }
      } else if (activeSession && activeSession.status === 'CLOSED') {
        status = 'ABSENT';
      }

      return {
        no: index + 1,
        studentId: student.id,
        name: student.name,
        usn: student.usn || `USN${String(index + 1).padStart(3, '0')}`,
        email: student.email,
        semester: student.semester || '5',
        section: student.section || 'A',
        photoUrl: student.photo_url || null,
        markedTime,
        distance: distanceStr,
        rawDistance: record?.distance_from_location_meters ?? null,
        status,
        locationVerified,
        recordId: record?.id || null,
      };
    });

    const notMarkedCount = totalStudents - (presentCount + lateCount);

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        presentCount,
        lateCount,
        notMarkedCount: Math.max(0, notMarkedCount),
      },
      session: activeSession,
      allSessions: sessions,
      attendanceList,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
