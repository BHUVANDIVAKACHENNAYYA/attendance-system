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
    const date = searchParams.get('date');
    const day = searchParams.get('day');
    const semesterId = searchParams.get('semesterId');
    const courseId = searchParams.get('courseId');
    const sectionId = searchParams.get('sectionId');
    const status = searchParams.get('status');
    const studentQuery = searchParams.get('student')?.toLowerCase();
    const sessionId = searchParams.get('sessionId');

    if (isUsingMockData()) {
      let sessions = mockStore.sessions || [];

      if (date) sessions = sessions.filter((s) => s.attendance_date === date);
      if (day) sessions = sessions.filter((s) => s.attendance_day?.toLowerCase() === day.toLowerCase());
      if (semesterId) sessions = sessions.filter((s) => s.semester_id === semesterId);
      if (courseId) sessions = sessions.filter((s) => s.course_id === courseId);
      if (sectionId) sessions = sessions.filter((s) => s.section_id === sectionId);
      if (status) sessions = sessions.filter((s) => s.status === status);

      // Selected or first matching session
      const targetSession = sessionId
        ? (mockStore.sessions || []).find((s) => s.id === sessionId)
        : sessions[0] || null;

      let allStudents = (mockStore.profiles || []).filter((p) => p.role === 'STUDENT' && p.active);

      // Filter students if session is associated with semester/section/course
      if (targetSession) {
        if (targetSession.semester_id) {
          allStudents = allStudents.filter((s) => s.semester_id === targetSession.semester_id);
        }
        if (targetSession.section_id) {
          allStudents = allStudents.filter((s) => s.section_id === targetSession.section_id);
        }
        if (targetSession.course_id) {
          const inCourse = (mockStore.studentCourses || [])
            .filter((sc) => sc.course_id === targetSession.course_id)
            .map((sc) => sc.student_id);
          if (inCourse.length > 0) {
            allStudents = allStudents.filter((s) => inCourse.includes(s.id));
          }
        }
      }

      if (studentQuery) {
        allStudents = allStudents.filter(
          (s) => s.name.toLowerCase().includes(studentQuery) || s.usn?.toLowerCase().includes(studentQuery)
        );
      }

      const recordsForSession = targetSession
        ? (mockStore.records || []).filter((r) => r.session_id === targetSession.id)
        : [];

      let presentCount = 0;
      let lateCount = 0;

      const rows = allStudents.map((student, idx) => {
        const record = recordsForSession.find((r) => r.student_id === student.id);
        let sStatus: 'PRESENT' | 'LATE' | 'NOT_MARKED' | 'ABSENT' = 'NOT_MARKED';
        let markedTime = '--';
        let distanceStr = '--';

        if (record) {
          sStatus = record.status as any;
          if (record.status === 'PRESENT') presentCount++;
          if (record.status === 'LATE') lateCount++;
          if (record.marked_at) {
            markedTime = new Date(record.marked_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
          if (record.distance_from_location_meters !== null && record.distance_from_location_meters !== undefined) {
            distanceStr = `${Math.round(record.distance_from_location_meters)} m`;
          }
        } else if (targetSession && (targetSession.status === 'CLOSED' || targetSession.status === 'EXPIRED')) {
          sStatus = 'ABSENT';
        }

        return {
          no: idx + 1,
          studentId: student.id,
          studentName: student.name,
          usn: student.usn || '--',
          email: student.email,
          markedTime,
          distance: distanceStr,
          rawDistance: record?.distance_from_location_meters ?? null,
          status: sStatus,
          locationVerified: record?.location_verified ?? false,
          recordId: record?.id || null,
          photoUrl: student.photo_url || null,
        };
      });

      const notMarkedCount = allStudents.length - (presentCount + lateCount);

      return NextResponse.json({
        success: true,
        session: targetSession
          ? {
              ...targetSession,
              location: (mockStore.locations || []).find((l) => l.id === targetSession.location_id),
              semester: (mockStore.semesters || []).find((m) => m.id === targetSession.semester_id),
              course: (mockStore.courses || []).find((c) => c.id === targetSession.course_id),
              section: (mockStore.sections || []).find((sec) => sec.id === targetSession.section_id),
            }
          : null,
        stats: {
          totalStudents: allStudents.length,
          present: presentCount,
          late: lateCount,
          notMarked: Math.max(0, notMarkedCount),
        },
        rows,
        allSessions: (mockStore.sessions || []).map((s) => ({
          ...s,
          course: (mockStore.courses || []).find((c) => c.id === s.course_id),
          section: (mockStore.sections || []).find((sec) => sec.id === s.section_id),
        })),
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*), semester:semesters(*), course:courses(*), section:sections(*)')
      .order('attendance_date', { ascending: false });

    if (date) query = query.eq('attendance_date', date);
    if (day) query = query.eq('attendance_day', day);
    if (semesterId) query = query.eq('semester_id', semesterId);
    if (courseId) query = query.eq('course_id', courseId);
    if (sectionId) query = query.eq('section_id', sectionId);
    if (status) query = query.eq('status', status);

    const { data: matchedSessions } = await query;
    const allSessions = matchedSessions || [];
    const targetSession = sessionId
      ? allSessions.find((s) => s.id === sessionId)
      : allSessions[0] || null;

    let studentsQuery = supabase.from('profiles').select('*').eq('role', 'STUDENT').eq('active', true);
    if (targetSession?.semester_id) studentsQuery = studentsQuery.eq('semester_id', targetSession.semester_id);
    if (targetSession?.section_id) studentsQuery = studentsQuery.eq('section_id', targetSession.section_id);

    const { data: studentsData } = await studentsQuery.order('usn', { ascending: true });
    let students = studentsData || [];

    if (studentQuery) {
      students = students.filter(
        (s) => s.name.toLowerCase().includes(studentQuery) || s.usn?.toLowerCase().includes(studentQuery)
      );
    }

    let recordsForSession: any[] = [];
    if (targetSession) {
      const { data: recData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', targetSession.id);
      recordsForSession = recData || [];
    }

    let presentCount = 0;
    let lateCount = 0;

    const rows = students.map((student, idx) => {
      const record = recordsForSession.find((r) => r.student_id === student.id);
      let sStatus: 'PRESENT' | 'LATE' | 'NOT_MARKED' | 'ABSENT' = 'NOT_MARKED';
      let markedTime = '--';
      let distanceStr = '--';

      if (record) {
        sStatus = record.status;
        if (record.status === 'PRESENT') presentCount++;
        if (record.status === 'LATE') lateCount++;
        if (record.marked_at) {
          markedTime = new Date(record.marked_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        if (record.distance_from_location_meters !== null && record.distance_from_location_meters !== undefined) {
          distanceStr = `${Math.round(record.distance_from_location_meters)} m`;
        }
      } else if (targetSession && (targetSession.status === 'CLOSED' || targetSession.status === 'EXPIRED')) {
        sStatus = 'ABSENT';
      }

      return {
        no: idx + 1,
        studentId: student.id,
        studentName: student.name,
        usn: student.usn || '--',
        email: student.email,
        markedTime,
        distance: distanceStr,
        rawDistance: record?.distance_from_location_meters ?? null,
        status: sStatus,
        locationVerified: record?.location_verified ?? false,
        recordId: record?.id || null,
        photoUrl: student.photo_url || null,
      };
    });

    const notMarkedCount = students.length - (presentCount + lateCount);

    return NextResponse.json({
      success: true,
      session: targetSession,
      stats: {
        totalStudents: students.length,
        present: presentCount,
        late: lateCount,
        notMarked: Math.max(0, notMarkedCount),
      },
      rows,
      allSessions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
