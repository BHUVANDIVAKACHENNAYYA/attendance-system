import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { semesterSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { Semester } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (isUsingMockData()) {
      let semesters = mockStore.semesters || [];
      if (activeOnly) {
        semesters = semesters.filter((s) => s.active);
      }
      semesters.sort((a, b) => a.semester_number - b.semester_number);

      // Enrich with student and course counts
      const enriched = semesters.map((sem) => {
        const studentCount = (mockStore.profiles || []).filter(
          (p) => p.role === 'STUDENT' && (p.semester_id === sem.id || p.semester === String(sem.semester_number))
        ).length;
        const courseCount = (mockStore.courses || []).filter((c) => c.semester_id === sem.id).length;
        return {
          ...sem,
          studentCount,
          courseCount,
        };
      });

      return NextResponse.json({ success: true, semesters: enriched });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase.from('semesters').select('*, courses(id), profiles(id)');
    if (activeOnly) {
      query = query.eq('active', true);
    }
    const { data, error } = await query.order('semester_number', { ascending: true });

    if (error) throw error;

    const enriched = (data || []).map((sem: any) => ({
      ...sem,
      studentCount: sem.profiles?.length || 0,
      courseCount: sem.courses?.length || 0,
    }));

    return NextResponse.json({ success: true, semesters: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list semesters' },
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

    // 1. Toggle active status
    if (body.action === 'TOGGLE_STATUS') {
      const { semesterId, active } = body;
      if (!semesterId || typeof active !== 'boolean') {
        return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
      }

      if (isUsingMockData()) {
        const semester = (mockStore.semesters || []).find((s) => s.id === semesterId);
        if (!semester) {
          return NextResponse.json({ success: false, message: 'Semester not found' }, { status: 404 });
        }
        semester.active = active;
        semester.updated_at = new Date().toISOString();
        saveStore();
        return NextResponse.json({
          success: true,
          message: `Semester ${active ? 'activated' : 'deactivated'} successfully`,
        });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      const { error } = await supabase
        .from('semesters')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', semesterId);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Semester ${active ? 'activated' : 'deactivated'} successfully`,
      });
    }

    // 2. Create or Edit Semester
    const validated = semesterSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid semester data',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, semester_number, academic_year, active } = validated.data;
    const now = new Date().toISOString();
    const semesterId = body.id;

    if (isUsingMockData()) {
      if (!mockStore.semesters) {
        mockStore.semesters = [];
      }

      if (semesterId) {
        const idx = mockStore.semesters.findIndex((s) => s.id === semesterId);
        if (idx === -1) {
          return NextResponse.json({ success: false, message: 'Semester not found' }, { status: 404 });
        }
        mockStore.semesters[idx] = {
          ...mockStore.semesters[idx],
          name,
          semester_number,
          academic_year,
          active,
          updated_at: now,
        };
        saveStore();
        return NextResponse.json({
          success: true,
          message: 'Semester updated successfully',
          semester: mockStore.semesters[idx],
        });
      }

      // Check duplicate number
      const existing = mockStore.semesters.find(
        (s) => s.semester_number === semester_number && s.academic_year === academic_year
      );
      if (existing) {
        return NextResponse.json(
          { success: false, message: `Semester ${semester_number} already exists for ${academic_year}` },
          { status: 409 }
        );
      }

      const newSem: Semester = {
        id: `sem-${Date.now()}`,
        name,
        semester_number,
        academic_year,
        active,
        created_at: now,
        updated_at: now,
      };

      mockStore.semesters.push(newSem);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'SEMESTER_CREATED',
        entity_type: 'semesters',
        entity_id: newSem.id,
        metadata: { name, semester_number, academic_year },
        created_at: now,
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: 'Semester created successfully',
        semester: newSem,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    if (semesterId) {
      const { data, error } = await supabase
        .from('semesters')
        .update({ name, semester_number, academic_year, active, updated_at: now })
        .eq('id', semesterId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: 'Semester updated successfully',
        semester: data,
      });
    }

    const { data, error } = await supabase
      .from('semesters')
      .insert({ name, semester_number, academic_year, active })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'Semester already exists for this academic year' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Semester created successfully',
      semester: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Semester operation failed' },
      { status: 500 }
    );
  }
}
