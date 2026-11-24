export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sessionSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { AttendanceSession } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get('semesterId');
    const courseId = searchParams.get('courseId');
    const sectionId = searchParams.get('sectionId');
    const date = searchParams.get('date');

    if (isUsingMockData()) {
      let sessions = mockStore.sessions || [];

      if (semesterId) {
        sessions = sessions.filter((s) => s.semester_id === semesterId);
      }
      if (courseId) {
        sessions = sessions.filter((s) => s.course_id === courseId);
      }
      if (sectionId) {
        sessions = sessions.filter((s) => s.section_id === sectionId);
      }
      if (date) {
        sessions = sessions.filter((s) => s.attendance_date === date);
      }

      const enriched = sessions.map((s) => ({
        ...s,
        location: (mockStore.locations || []).find((l) => l.id === s.location_id),
        semester: (mockStore.semesters || []).find((m) => m.id === s.semester_id),
        course: (mockStore.courses || []).find((c) => c.id === s.course_id),
        section: (mockStore.sections || []).find((sec) => sec.id === s.section_id),
      }));

      return NextResponse.json({ success: true, sessions: enriched });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*), semester:semesters(*), course:courses(*), section:sections(*)')
      .order('start_time', { ascending: false });

    if (semesterId) query = query.eq('semester_id', semesterId);
    if (courseId) query = query.eq('course_id', courseId);
    if (sectionId) query = query.eq('section_id', sectionId);
    if (date) query = query.eq('attendance_date', date);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, sessions: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Check for status update action (START, CLOSE, or CANCEL session)
    if (body.action) {
      const { sessionId, action } = body;
      if (!sessionId || !['START', 'CLOSE', 'CANCEL'].includes(action)) {
        return NextResponse.json({ success: false, message: 'Invalid action payload' }, { status: 400 });
      }

      let newStatus: 'ACTIVE' | 'CLOSED' | 'CANCELLED' = 'CLOSED';
      if (action === 'START') newStatus = 'ACTIVE';
      else if (action === 'CANCEL') newStatus = 'CANCELLED';

      const now = new Date().toISOString();

      if (isUsingMockData()) {
        const sessionIndex = mockStore.sessions.findIndex((s) => s.id === sessionId);
        if (sessionIndex === -1) {
          return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
        }

        // If starting this session, set other active sessions to closed
        if (newStatus === 'ACTIVE') {
          mockStore.sessions.forEach((s) => {
            if (s.id !== sessionId && s.status === 'ACTIVE') {
              s.status = 'CLOSED';
            }
          });
        }

        mockStore.sessions[sessionIndex].status = newStatus;
        mockStore.sessions[sessionIndex].updated_at = now;

        mockStore.auditLogs.unshift({
          id: `log-${Date.now()}`,
          user_id: user.id,
          action: action === 'START' ? 'SESSION_STARTED' : action === 'CANCEL' ? 'SESSION_CANCELLED' : 'SESSION_CLOSED',
          entity_type: 'attendance_session',
          entity_id: sessionId,
          metadata: { subject: mockStore.sessions[sessionIndex].subject },
          created_at: now,
        });

        saveStore();

        return NextResponse.json({
          success: true,
          message: `Session successfully ${action === 'START' ? 'started' : action === 'CANCEL' ? 'cancelled' : 'closed'}.`,
          session: mockStore.sessions[sessionIndex],
        });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      if (newStatus === 'ACTIVE') {
        // Close previously active sessions
        await supabase
          .from('attendance_sessions')
          .update({ status: 'CLOSED', updated_at: now })
          .eq('status', 'ACTIVE');
      }

      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ status: newStatus, updated_at: now })
        .eq('id', sessionId)
        .select('*, location:attendance_locations(*)')
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: action === 'START' ? 'SESSION_STARTED' : action === 'CANCEL' ? 'SESSION_CANCELLED' : 'SESSION_CLOSED',
        entity_type: 'attendance_session',
        entity_id: sessionId,
        metadata: { subject: data?.subject },
      });

      return NextResponse.json({
        success: true,
        message: `Session successfully ${action === 'START' ? 'started' : action === 'CANCEL' ? 'cancelled' : 'closed'}.`,
        session: data,
      });
    }

    // Otherwise, create a new session
    const validated = sessionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid session data',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      semester_id,
      course_id,
      section_id,
      attendance_date,
      location_id,
      start_time,
      end_time,
      late_threshold,
      gps_radius,
      session_description,
    } = validated.data;

    // Auto-derive day of week
    const dateObj = new Date(attendance_date + 'T00:00:00');
    const attendance_day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Derive course name / code and section name
    let subjectName = validated.data.subject || 'Class Session';
    let className = validated.data.class_name || 'Section';

    if (isUsingMockData()) {
      if (course_id) {
        const foundCourse = (mockStore.courses || []).find((c) => c.id === course_id);
        if (foundCourse) {
          subjectName = `${foundCourse.course_code} - ${foundCourse.course_name}`;
        }
      }
      if (section_id) {
        const foundSec = (mockStore.sections || []).find((s) => s.id === section_id);
        if (foundSec) {
          className = `Section ${foundSec.name}`;
        }
      }

      // Rule: Prevent accidental duplicate sessions for the same course, date, section, and time
      const duplicate = (mockStore.sessions || []).find((s) => {
        if (s.status === 'CANCELLED') return false;
        if (s.attendance_date !== attendance_date) return false;
        if (course_id && s.course_id && s.course_id !== course_id) return false;
        if (section_id && s.section_id && s.section_id !== section_id) return false;
        // Overlapping time check
        const sStart = new Date(s.start_time).getTime();
        const sEnd = new Date(s.end_time).getTime();
        const nStart = new Date(start_time).getTime();
        const nEnd = new Date(end_time).getTime();
        return Math.max(sStart, nStart) < Math.min(sEnd, nEnd);
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: 'A session for this course/section is already scheduled during this time slot.',
          },
          { status: 409 }
        );
      }

      const newSession: AttendanceSession = {
        id: `sess-${Date.now()}`,
        subject: subjectName,
        class_name: className,
        semester_id: semester_id || null,
        course_id: course_id || null,
        section_id: section_id || null,
        attendance_date,
        attendance_day,
        session_description: session_description || null,
        location_id,
        start_time,
        end_time,
        late_threshold,
        gps_radius: gps_radius || 50,
        status: 'SCHEDULED',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockStore.sessions.unshift(newSession);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'SESSION_CREATED',
        entity_type: 'attendance_session',
        entity_id: newSession.id,
        metadata: { subject: subjectName, class_name: className, attendance_date, attendance_day },
        created_at: new Date().toISOString(),
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: 'Attendance session created successfully',
        session: newSession,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();

    if (course_id) {
      const { data: cData } = await supabase.from('courses').select('*').eq('id', course_id).maybeSingle();
      if (cData) subjectName = `${cData.course_code} - ${cData.course_name}`;
    }
    if (section_id) {
      const { data: secData } = await supabase.from('sections').select('*').eq('id', section_id).maybeSingle();
      if (secData) className = `Section ${secData.name}`;
    }

    const newSessionData = {
      subject: subjectName,
      class_name: className,
      semester_id: semester_id || null,
      course_id: course_id || null,
      section_id: section_id || null,
      attendance_date,
      attendance_day,
      session_description: session_description || null,
      location_id,
      start_time,
      end_time,
      late_threshold,
      gps_radius: gps_radius || 50,
      status: 'SCHEDULED' as const,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert(newSessionData)
      .select('*, location:attendance_locations(*), semester:semesters(*), course:courses(*), section:sections(*)')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'SESSION_CREATED',
      entity_type: 'attendance_session',
      entity_id: data.id,
      metadata: { subject: subjectName, class_name: className, attendance_date },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance session created successfully',
      session: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Session operation failed' },
      { status: 500 }
    );
  }
}
