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
      // Find today's active or recent session
      const activeSession =
        mockStore.sessions.find((s) => s.status === 'ACTIVE') ||
        mockStore.sessions.find((s) => s.attendance_date === todayStr) ||
        mockStore.sessions[0];

      if (!activeSession) {
        return NextResponse.json({ success: true, session: null, myRecord: null });
      }

      const location = mockStore.locations.find((l) => l.id === activeSession.location_id);
      const sessionWithLocation = { ...activeSession, location };

      let myRecord = null;
      if (user.role === 'STUDENT') {
        myRecord =
          mockStore.records.find(
            (r) => r.session_id === activeSession.id && r.student_id === user.id
          ) || null;
      }

      return NextResponse.json({
        success: true,
        session: sessionWithLocation,
        myRecord,
        serverTime: new Date().toISOString(),
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('*, location:attendance_locations(*)')
      .or(`status.eq.ACTIVE,attendance_date.eq.${todayStr}`)
      .order('start_time', { ascending: false });

    const activeSession = sessions?.[0] || null;

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

    return NextResponse.json({
      success: true,
      session: activeSession,
      myRecord,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
