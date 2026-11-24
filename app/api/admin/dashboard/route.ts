export const runtime = 'edge';

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
    const todayStr = new Date().toISOString().split('T')[0];

    if (isUsingMockData()) {
      const allStudents = (mockStore.profiles || []).filter((p) => p.role === 'STUDENT' && p.active);
      const totalStudents = allStudents.length;
      const totalSemesters = (mockStore.semesters || []).filter((s) => s.active).length;
      const totalCourses = (mockStore.courses || []).filter((c) => c.active).length;
      const activeSessionsToday = (mockStore.sessions || []).filter(
        (s) => s.status === 'ACTIVE' || (s.attendance_date === todayStr && s.status !== 'CANCELLED')
      ).length;

      // Active / Selected session
      const activeSession =
        (selectedSessionId
          ? (mockStore.sessions || []).find((s) => s.id === selectedSessionId)
          : (mockStore.sessions || []).find((s) => s.status === 'ACTIVE')) ||
        (mockStore.sessions || [])[0] || null;

      const sessionLocation = activeSession
        ? (mockStore.locations || []).find((l) => l.id === activeSession.location_id)
        : null;

      const sessionSemester = activeSession
        ? (mockStore.semesters || []).find((m) => m.id === activeSession.semester_id)
        : null;

      const sessionCourse = activeSession
        ? (mockStore.courses || []).find((c) => c.id === activeSession.course_id)
        : null;

      const sessionSection = activeSession
        ? (mockStore.sections || []).find((sec) => sec.id === activeSession.section_id)
        : null;

      const recordsForSession = activeSession
        ? (mockStore.records || []).filter((r) => r.session_id === activeSession.id)
        : [];

      // If active session belongs to a semester / section / course, filter students to eligible students
      let eligibleStudents = allStudents;
      if (activeSession) {
        if (activeSession.semester_id) {
          eligibleStudents = eligibleStudents.filter(
            (p) => p.semester_id === activeSession.semester_id || p.semester === String(sessionSemester?.semester_number)
          );
        }
        if (activeSession.section_id) {
          eligibleStudents = eligibleStudents.filter(
            (p) => p.section_id === activeSession.section_id || (sessionSection && p.section === sessionSection.name)
          );
        }
        if (activeSession.course_id) {
          const enrolled = (mockStore.studentCourses || [])
            .filter((sc) => sc.course_id === activeSession.course_id)
            .map((sc) => sc.student_id);
          if (enrolled.length > 0) {
            eligibleStudents = eligibleStudents.filter((p) => enrolled.includes(p.id));
          }
        }
      }

      // If no eligible students found (e.g. no restrictions set), fall back to all active students
      const displayStudents = eligibleStudents.length > 0 ? eligibleStudents : allStudents;

      let presentCount = 0;
      let lateCount = 0;

      const attendanceList = displayStudents.map((student, index) => {
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
        } else if (activeSession && (activeSession.status === 'CLOSED' || activeSession.status === 'EXPIRED')) {
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

      const notMarkedCount = displayStudents.length - (presentCount + lateCount);
      const absentCount = (activeSession && (activeSession.status === 'CLOSED' || activeSession.status === 'EXPIRED'))
        ? notMarkedCount
        : 0;

      // Overall attendance stats across all records
      const allRecords = mockStore.records || [];
      const totalPresentOverall = allRecords.filter((r) => r.status === 'PRESENT').length;
      const totalLateOverall = allRecords.filter((r) => r.status === 'LATE').length;
      const totalValidMarked = totalPresentOverall + totalLateOverall;
      const totalConducted = (mockStore.sessions || []).filter((s) => s.status !== 'CANCELLED').length * (totalStudents || 1);
      const overallAttendancePercentage = totalConducted > 0
        ? Math.min(100, Math.round((totalValidMarked / totalConducted) * 100))
        : (displayStudents.length > 0 && (presentCount + lateCount) > 0
            ? Math.round(((presentCount + lateCount) / displayStudents.length) * 100)
            : 0);

      return NextResponse.json({
        success: true,
        stats: {
          totalStudents,
          totalSemesters,
          totalCourses,
          activeSessionsToday,
          presentCount,
          lateCount,
          notMarkedCount: Math.max(0, notMarkedCount),
          absentCount,
          totalPresent: presentCount,
          totalLate: lateCount,
          totalAbsent: absentCount,
          overallAttendancePercentage,
        },
        session: activeSession
          ? {
              ...activeSession,
              location: sessionLocation,
              semester: sessionSemester,
              course: sessionCourse,
              section: sessionSection,
            }
          : null,
        allSessions: (mockStore.sessions || []).map((s) => ({
          ...s,
          course: (mockStore.courses || []).find((c) => c.id === s.course_id),
          section: (mockStore.sections || []).find((sec) => sec.id === s.section_id),
        })),
        attendanceList,
        locations: mockStore.locations || [],
        serverTime: new Date().toISOString(),
      });
    }

    // Supabase mode
    const supabase = getServiceRoleClient() || createClientServer();
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'STUDENT')
      .eq('active', true)
      .order('usn', { ascending: true });

    const allStudents = studentsData || [];
    const totalStudents = allStudents.length;

    const { count: semCount } = await supabase.from('semesters').select('*', { count: 'exact', head: true });
    const { count: courseCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });

    const { data: sessionsData } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*), semester:semesters(*), course:courses(*), section:sections(*)')
      .order('created_at', { ascending: false });

    const sessions = sessionsData || [];
    const activeSessionsToday = sessions.filter(
      (s) => s.status === 'ACTIVE' || (s.attendance_date === todayStr && s.status !== 'CANCELLED')
    ).length;

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
      } else if (activeSession && (activeSession.status === 'CLOSED' || activeSession.status === 'EXPIRED')) {
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
    const absentCount = (activeSession && (activeSession.status === 'CLOSED' || activeSession.status === 'EXPIRED'))
      ? notMarkedCount
      : 0;

    const overallAttendancePercentage = totalStudents > 0
      ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalSemesters: semCount || 0,
        totalCourses: courseCount || 0,
        activeSessionsToday,
        presentCount,
        lateCount,
        notMarkedCount: Math.max(0, notMarkedCount),
        absentCount,
        totalPresent: presentCount,
        totalLate: lateCount,
        totalAbsent: absentCount,
        overallAttendancePercentage,
      },
      session: activeSession,
      allSessions: sessions,
      attendanceList,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
