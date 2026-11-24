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
      const student = (mockStore.profiles || []).find((p) => p.id === targetStudentId);
      let allSessions = mockStore.sessions || [];

      // Filter sessions relevant to the student
      if (student) {
        const enrolledCourseIds = (mockStore.studentCourses || [])
          .filter((sc) => sc.student_id === student.id)
          .map((sc) => sc.course_id);

        allSessions = allSessions.filter((s) => {
          if (s.status === 'CANCELLED') return false;
          if (s.semester_id && student.semester_id && s.semester_id !== student.semester_id) return false;
          if (s.section_id && student.section_id && s.section_id !== student.section_id) return false;
          if (s.course_id && enrolledCourseIds.length > 0 && !enrolledCourseIds.includes(s.course_id)) return false;
          return true;
        });
      }

      const studentRecords = (mockStore.records || []).filter((r) => r.student_id === targetStudentId);

      // Course-wise Breakdown
      const enrolledCourses = (mockStore.studentCourses || [])
        .filter((sc) => sc.student_id === targetStudentId)
        .map((sc) => (mockStore.courses || []).find((c) => c.id === sc.course_id))
        .filter(Boolean);

      // Also include courses from sessions if no explicit enrollments
      const coursesMap = new Map<string, any>();
      enrolledCourses.forEach((c) => {
        if (c) coursesMap.set(c.id, c);
      });
      allSessions.forEach((s) => {
        if (s.course_id) {
          const c = (mockStore.courses || []).find((x) => x.id === s.course_id);
          if (c) coursesMap.set(c.id, c);
        }
      });

      const courseWiseStats = Array.from(coursesMap.values()).map((course) => {
        const courseSessions = allSessions.filter((s) => s.course_id === course.id);
        const totalClasses = courseSessions.length;
        let present = 0;
        let late = 0;

        courseSessions.forEach((cs) => {
          const rec = studentRecords.find((r) => r.session_id === cs.id);
          if (rec?.status === 'PRESENT') present++;
          else if (rec?.status === 'LATE') late++;
        });

        const absent = Math.max(0, totalClasses - (present + late));
        const percentage = totalClasses > 0 ? Math.round(((present + late) / totalClasses) * 100) : 0;

        return {
          courseId: course.id,
          courseCode: course.course_code,
          courseName: course.course_name,
          totalClasses,
          present,
          late,
          absent,
          percentage,
          statusBadge: percentage >= 85 ? 'GOOD' : percentage >= 75 ? 'AVERAGE' : 'SHORTAGE',
        };
      });

      // Detailed History Logs
      const history = allSessions.map((session) => {
        const record = studentRecords.find((r) => r.session_id === session.id);
        const location = (mockStore.locations || []).find((l) => l.id === session.location_id);
        const course = (mockStore.courses || []).find((c) => c.id === session.course_id);

        let status: 'PRESENT' | 'LATE' | 'ABSENT' | 'NOT_MARKED' = 'ABSENT';
        if (record) {
          status = record.status as any;
        } else if (session.status === 'ACTIVE' || session.status === 'SCHEDULED') {
          status = 'NOT_MARKED';
        }

        return {
          sessionId: session.id,
          subject: session.subject,
          courseCode: course?.course_code || '',
          courseName: course?.course_name || session.subject,
          className: session.class_name,
          date: session.attendance_date,
          day: session.attendance_day || '',
          startTime: session.start_time,
          endTime: session.end_time,
          locationName: location?.name || 'Classroom',
          status,
          markedAt: record?.marked_at || null,
          distanceMeters: record?.distance_from_location_meters !== null && record?.distance_from_location_meters !== undefined
            ? Math.round(record.distance_from_location_meters)
            : null,
          locationVerified: record?.location_verified ?? false,
          recordId: record?.id || null,
        };
      });

      // Overall stats
      const totalConducted = allSessions.length;
      const presentCount = studentRecords.filter((r) => r.status === 'PRESENT').length;
      const lateCount = studentRecords.filter((r) => r.status === 'LATE').length;
      const absentCount = Math.max(0, totalConducted - (presentCount + lateCount));
      const percentage = totalConducted > 0 ? Math.round(((presentCount + lateCount) / totalConducted) * 100) : 0;

      return NextResponse.json({
        success: true,
        stats: {
          totalConducted,
          presentCount,
          lateCount,
          absentCount,
          attendancePercentage: percentage,
        },
        courseWiseStats,
        history,
      });
    }

    // Supabase mode
    const supabase = getServiceRoleClient() || createClientServer();
    const { data: allSessions } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*), course:courses(*)')
      .neq('status', 'CANCELLED')
      .order('attendance_date', { ascending: false });

    const { data: studentRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', targetStudentId);

    const records = studentRecords || [];
    const sessions = allSessions || [];

    const history = sessions.map((session: any) => {
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
        courseCode: session.course?.course_code || '',
        courseName: session.course?.course_name || session.subject,
        className: session.class_name,
        date: session.attendance_date,
        day: session.attendance_day || '',
        startTime: session.start_time,
        endTime: session.end_time,
        locationName: session.location?.name || 'Classroom',
        status,
        markedAt: record?.marked_at || null,
        distanceMeters: record?.distance_from_location_meters ?? null,
        locationVerified: record?.location_verified ?? false,
        recordId: record?.id || null,
      };
    });

    const totalConducted = sessions.length;
    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const absentCount = Math.max(0, totalConducted - (presentCount + lateCount));
    const percentage = totalConducted > 0 ? Math.round(((presentCount + lateCount) / totalConducted) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalConducted,
        presentCount,
        lateCount,
        absentCount,
        attendancePercentage: percentage,
      },
      courseWiseStats: [],
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch attendance history' },
      { status: 500 }
    );
  }
}
