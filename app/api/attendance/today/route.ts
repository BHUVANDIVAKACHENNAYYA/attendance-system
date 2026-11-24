export const runtime = 'edge';

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

    const todayStr = new Date().toISOString().split('T')[0];

    if (isUsingMockData()) {
      let sessions = mockStore.sessions || [];

      // If student, filter by semester, section, and enrolled courses
      if (user.role === 'STUDENT') {
        const student = (mockStore.profiles || []).find((p) => p.id === user.id) || user;
        const enrolledCourseIds = (mockStore.studentCourses || [])
          .filter((sc) => sc.student_id === student.id)
          .map((sc) => sc.course_id);

        sessions = sessions.filter((s) => {
          // Check semester
          if (s.semester_id && student.semester_id && s.semester_id !== student.semester_id) {
            return false;
          }
          // Check section
          if (s.section_id && student.section_id && s.section_id !== student.section_id) {
            return false;
          }
          // Check course enrollment
          if (s.course_id && enrolledCourseIds.length > 0 && !enrolledCourseIds.includes(s.course_id)) {
            return false;
          }
          return true;
        });
      }

      // Today's sessions
      const todaySessions = sessions.filter((s) => s.attendance_date === todayStr && s.status !== 'CANCELLED');
      const activeSession =
        todaySessions.find((s) => s.status === 'ACTIVE') ||
        sessions.find((s) => s.status === 'ACTIVE') ||
        todaySessions[0] ||
        sessions[0] ||
        null;

      const location = activeSession
        ? (mockStore.locations || []).find((l) => l.id === activeSession.location_id)
        : null;

      const course = activeSession
        ? (mockStore.courses || []).find((c) => c.id === activeSession.course_id)
        : null;

      const semester = activeSession
        ? (mockStore.semesters || []).find((m) => m.id === activeSession.semester_id)
        : null;

      const section = activeSession
        ? (mockStore.sections || []).find((sec) => sec.id === activeSession.section_id)
        : null;

      const sessionWithDetails = activeSession
        ? {
            ...activeSession,
            location,
            course,
            semester,
            section,
          }
        : null;

      let myRecord = null;
      if (activeSession && user.role === 'STUDENT') {
        myRecord =
          (mockStore.records || []).find(
            (r) => r.session_id === activeSession.id && r.student_id === user.id
          ) || null;
      }

      // Calculate student's today overview
      let totalToday = todaySessions.length;
      let markedToday = 0;
      todaySessions.forEach((ts) => {
        const hasRec = (mockStore.records || []).some(
          (r) => r.session_id === ts.id && r.student_id === user.id && (r.status === 'PRESENT' || r.status === 'LATE')
        );
        if (hasRec) markedToday++;
      });
      let pendingToday = Math.max(0, totalToday - markedToday);

      // Student overall percentage
      let totalAttended = 0;
      let totalStudentSessions = 0;
      if (user.role === 'STUDENT') {
        const myAllRecords = (mockStore.records || []).filter((r) => r.student_id === user.id);
        totalAttended = myAllRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
        totalStudentSessions = sessions.filter((s) => s.status === 'CLOSED' || s.status === 'ACTIVE').length;
      }

      const overallPercentage = totalStudentSessions > 0
        ? Math.min(100, Math.round((totalAttended / totalStudentSessions) * 100))
        : (totalToday > 0 && markedToday > 0 ? Math.round((markedToday / totalToday) * 100) : 0);

      // Map todaySessions with details
      const enrichedTodaySessions = todaySessions.map((s) => {
        const isMarked = (mockStore.records || []).some(
          (r) => r.session_id === s.id && r.student_id === user.id
        );
        const rec = (mockStore.records || []).find(
          (r) => r.session_id === s.id && r.student_id === user.id
        );
        return {
          ...s,
          location: (mockStore.locations || []).find((l) => l.id === s.location_id),
          course: (mockStore.courses || []).find((c) => c.id === s.course_id),
          isMarked,
          recordStatus: rec?.status || null,
        };
      });

      return NextResponse.json({
        success: true,
        session: sessionWithDetails,
        myRecord,
        todaySessions: enrichedTodaySessions,
        stats: {
          totalToday,
          markedToday,
          pendingToday,
          overallPercentage,
        },
        serverTime: new Date().toISOString(),
      });
    }

    // Supabase mode
    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*), course:courses(*), semester:semesters(*), section:sections(*)')
      .neq('status', 'CANCELLED')
      .order('start_time', { ascending: true });

    if (user.role === 'STUDENT') {
      const { data: student } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (student?.semester_id) query = query.eq('semester_id', student.semester_id);
      if (student?.section_id) query = query.eq('section_id', student.section_id);
    }

    const { data: sessions } = await query;
    const sessionList = sessions || [];
    const todaySessions = sessionList.filter((s) => s.attendance_date === todayStr);

    const activeSession =
      todaySessions.find((s) => s.status === 'ACTIVE') ||
      sessionList.find((s) => s.status === 'ACTIVE') ||
      todaySessions[0] ||
      sessionList[0] ||
      null;

    let myRecord = null;
    if (activeSession && user.role === 'STUDENT') {
      const { data: record } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('student_id', user.id)
        .maybeSingle();
      myRecord = record;
    }

    let markedToday = 0;
    if (user.role === 'STUDENT' && todaySessions.length > 0) {
      const sessionIds = todaySessions.map((s) => s.id);
      const { count } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
        .eq('student_id', user.id)
        .in('status', ['PRESENT', 'LATE']);
      markedToday = count || 0;
    }

    return NextResponse.json({
      success: true,
      session: activeSession,
      myRecord,
      todaySessions,
      stats: {
        totalToday: todaySessions.length,
        markedToday,
        pendingToday: Math.max(0, todaySessions.length - markedToday),
        overallPercentage: 0,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
