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
    const reportType = searchParams.get('type') || 'summary'; // 'summary', 'students', 'sessions', 'audit'

    if (isUsingMockData()) {
      const students = mockStore.profiles.filter((p) => p.role === 'STUDENT');
      const sessions = mockStore.sessions;
      const records = mockStore.records;

      const totalConducted = sessions.length || 1;

      // Student-wise performance table
      const studentReports = students.map((st) => {
        const studentRecords = records.filter((r) => r.student_id === st.id);
        const present = studentRecords.filter((r) => r.status === 'PRESENT').length;
        const late = studentRecords.filter((r) => r.status === 'LATE').length;
        const absent = Math.max(0, totalConducted - (present + late));
        const percentage = totalConducted > 0 ? Math.round(((present + late) / totalConducted) * 1000) / 10 : 0;

        return {
          studentId: st.id,
          name: st.name,
          usn: st.usn,
          email: st.email,
          semester: st.semester,
          section: st.section,
          totalClasses: totalConducted,
          present,
          late,
          absent,
          percentage,
          status: percentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE',
        };
      });

      // Daily session reports
      const sessionReports = sessions.map((sess) => {
        const sessRecords = records.filter((r) => r.session_id === sess.id);
        const present = sessRecords.filter((r) => r.status === 'PRESENT').length;
        const late = sessRecords.filter((r) => r.status === 'LATE').length;
        const total = students.length;
        const absent = Math.max(0, total - (present + late));
        const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

        const loc = mockStore.locations.find((l) => l.id === sess.location_id);

        return {
          sessionId: sess.id,
          date: sess.attendance_date,
          subject: sess.subject,
          className: sess.class_name,
          locationName: loc?.name || 'Classroom',
          status: sess.status,
          totalStudents: total,
          present,
          late,
          absent,
          attendanceRate,
        };
      });

      return NextResponse.json({
        success: true,
        summary: {
          totalStudents: students.length,
          totalSessions: sessions.length,
          averageAttendance:
            studentReports.length > 0
              ? Math.round(
                  (studentReports.reduce((acc, s) => acc + s.percentage, 0) / studentReports.length) * 10
                ) / 10
              : 0,
        },
        studentReports,
        sessionReports,
        auditLogs: mockStore.auditLogs.slice(0, 50),
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data: students } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'STUDENT')
      .order('usn', { ascending: true });

    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*)')
      .order('attendance_date', { ascending: false });

    const { data: records } = await supabase.from('attendance_records').select('*');
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const stList = students || [];
    const sessList = sessions || [];
    const recList = records || [];

    const totalConducted = sessList.length || 1;

    const studentReports = stList.map((st) => {
      const studentRecords = recList.filter((r) => r.student_id === st.id);
      const present = studentRecords.filter((r) => r.status === 'PRESENT').length;
      const late = studentRecords.filter((r) => r.status === 'LATE').length;
      const absent = Math.max(0, totalConducted - (present + late));
      const percentage = totalConducted > 0 ? Math.round(((present + late) / totalConducted) * 1000) / 10 : 0;

      return {
        studentId: st.id,
        name: st.name,
        usn: st.usn,
        email: st.email,
        semester: st.semester,
        section: st.section,
        totalClasses: totalConducted,
        present,
        late,
        absent,
        percentage,
        status: percentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE',
      };
    });

    const sessionReports = sessList.map((sess) => {
      const sessRecords = recList.filter((r) => r.session_id === sess.id);
      const present = sessRecords.filter((r) => r.status === 'PRESENT').length;
      const late = sessRecords.filter((r) => r.status === 'LATE').length;
      const total = stList.length;
      const absent = Math.max(0, total - (present + late));
      const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

      return {
        sessionId: sess.id,
        date: sess.attendance_date,
        subject: sess.subject,
        className: sess.class_name,
        locationName: sess.location?.name || 'Classroom',
        status: sess.status,
        totalStudents: total,
        present,
        late,
        absent,
        attendanceRate,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalStudents: stList.length,
        totalSessions: sessList.length,
        averageAttendance:
          studentReports.length > 0
            ? Math.round(
                (studentReports.reduce((acc, s) => acc + s.percentage, 0) / studentReports.length) * 10
              ) / 10
            : 0,
      },
      studentReports,
      sessionReports,
      auditLogs: auditLogs || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
