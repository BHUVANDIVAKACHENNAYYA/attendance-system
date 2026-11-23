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

    if (isUsingMockData()) {
      const sessionsWithLocations = mockStore.sessions.map((s) => ({
        ...s,
        location: mockStore.locations.find((l) => l.id === s.location_id),
      }));
      return NextResponse.json({ success: true, sessions: sessionsWithLocations });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*)')
      .order('start_time', { ascending: false });

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

    // Check for status update action (START or CLOSE session)
    if (body.action) {
      const { sessionId, action } = body;
      if (!sessionId || !['START', 'CLOSE'].includes(action)) {
        return NextResponse.json({ success: false, message: 'Invalid action payload' }, { status: 400 });
      }

      const newStatus = action === 'START' ? 'ACTIVE' : 'CLOSED';
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
          action: action === 'START' ? 'SESSION_STARTED' : 'SESSION_CLOSED',
          entity_type: 'attendance_session',
          entity_id: sessionId,
          metadata: { subject: mockStore.sessions[sessionIndex].subject },
          created_at: now,
        });

        saveStore();

        return NextResponse.json({
          success: true,
          message: `Session successfully ${action === 'START' ? 'started' : 'closed'}.`,
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
        action: action === 'START' ? 'SESSION_STARTED' : 'SESSION_CLOSED',
        entity_type: 'attendance_session',
        entity_id: sessionId,
        metadata: { subject: data?.subject },
      });

      return NextResponse.json({
        success: true,
        message: `Session successfully ${action === 'START' ? 'started' : 'closed'}.`,
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

    const { subject, class_name, attendance_date, location_id, start_time, end_time, late_threshold } =
      validated.data;

    const newSession: AttendanceSession = {
      id: isUsingMockData() ? `sess-${Date.now()}` : crypto.randomUUID(),
      subject,
      class_name,
      attendance_date,
      location_id,
      start_time,
      end_time,
      late_threshold,
      status: 'SCHEDULED',
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isUsingMockData()) {
      mockStore.sessions.unshift(newSession);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'SESSION_CREATED',
        entity_type: 'attendance_session',
        entity_id: newSession.id,
        metadata: { subject, class_name, attendance_date },
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
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert(newSession)
      .select('*, location:attendance_locations(*)')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'SESSION_CREATED',
      entity_type: 'attendance_session',
      entity_id: newSession.id,
      metadata: { subject, class_name, attendance_date },
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
