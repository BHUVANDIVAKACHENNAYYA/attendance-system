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

    if (isUsingMockData()) {
      const student = (mockStore.profiles || []).find((p) => p.id === user.id) || user;
      const semester = (mockStore.semesters || []).find(
        (s) => s.id === student.semester_id || String(s.semester_number) === student.semester
      );
      const section = (mockStore.sections || []).find(
        (sec) => sec.id === student.section_id || sec.name === student.section
      );
      const enrolledCourseIds = (mockStore.studentCourses || [])
        .filter((sc) => sc.student_id === student.id)
        .map((sc) => sc.course_id);
      const enrolledCourses = (mockStore.courses || []).filter((c) =>
        enrolledCourseIds.includes(c.id)
      );

      const records = (mockStore.records || []).filter((r) => r.student_id === student.id);
      const presentCount = records.filter((r) => r.status === 'PRESENT').length;
      const lateCount = records.filter((r) => r.status === 'LATE').length;
      const totalSessions = (mockStore.sessions || []).filter((s) => s.status !== 'CANCELLED').length;
      const percentage = totalSessions > 0
        ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
        : 0;

      return NextResponse.json({
        success: true,
        student: {
          ...student,
          semester_info: semester || null,
          section_info: section || null,
          enrolled_courses: enrolledCourses,
        },
        stats: {
          totalClasses: totalSessions,
          attended: presentCount + lateCount,
          percentage,
        },
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data: student, error } = await supabase
      .from('profiles')
      .select('*, semester_info:semesters(*), section_info:sections(*), student_courses(*, course:courses(*))')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    const enrolledCourses = (student.student_courses || []).map((sc: any) => sc.course).filter(Boolean);

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        enrolled_courses: enrolledCourses,
      },
      stats: {
        totalClasses: 0,
        attended: 0,
        percentage: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch student profile' },
      { status: 500 }
    );
  }
}
