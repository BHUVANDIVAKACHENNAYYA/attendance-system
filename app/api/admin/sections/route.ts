export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sectionSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { Section } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get('semesterId');
    const activeOnly = searchParams.get('active') === 'true';

    if (isUsingMockData()) {
      let sections = mockStore.sections || [];
      if (semesterId) {
        sections = sections.filter((s) => s.semester_id === semesterId);
      }
      if (activeOnly) {
        sections = sections.filter((s) => s.active);
      }

      const enriched = sections.map((sec) => {
        const semester = (mockStore.semesters || []).find((s) => s.id === sec.semester_id);
        const studentCount = (mockStore.profiles || []).filter(
          (p) => p.role === 'STUDENT' && (p.section_id === sec.id || (p.section === sec.name && p.semester_id === sec.semester_id))
        ).length;
        return {
          ...sec,
          semester,
          studentCount,
        };
      });

      return NextResponse.json({ success: true, sections: enriched });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase.from('sections').select('*, semester:semesters(*), profiles(id)');
    if (semesterId) {
      query = query.eq('semester_id', semesterId);
    }
    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;

    const enriched = (data || []).map((sec: any) => ({
      ...sec,
      studentCount: sec.profiles?.length || 0,
    }));

    return NextResponse.json({ success: true, sections: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list sections' },
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
      const { sectionId, active } = body;
      if (!sectionId || typeof active !== 'boolean') {
        return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
      }

      if (isUsingMockData()) {
        const section = (mockStore.sections || []).find((s) => s.id === sectionId);
        if (!section) {
          return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 });
        }
        section.active = active;
        saveStore();
        return NextResponse.json({
          success: true,
          message: `Section ${active ? 'activated' : 'deactivated'} successfully`,
        });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      const { error } = await supabase.from('sections').update({ active }).eq('id', sectionId);
      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Section ${active ? 'activated' : 'deactivated'} successfully`,
      });
    }

    // 2. Create or Edit Section
    const validated = sectionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid section data',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, semester_id, active } = validated.data;
    const sectionId = body.id;

    if (isUsingMockData()) {
      if (!mockStore.sections) {
        mockStore.sections = [];
      }

      if (sectionId) {
        const idx = mockStore.sections.findIndex((s) => s.id === sectionId);
        if (idx === -1) {
          return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 });
        }
        mockStore.sections[idx] = {
          ...mockStore.sections[idx],
          name: name.toUpperCase(),
          semester_id,
          active,
        };
        saveStore();
        return NextResponse.json({
          success: true,
          message: 'Section updated successfully',
          section: mockStore.sections[idx],
        });
      }

      // Check duplicate section name in semester
      const duplicate = mockStore.sections.find(
        (s) => s.name.toUpperCase() === name.toUpperCase() && s.semester_id === semester_id
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Section ${name.toUpperCase()} already exists in this semester` },
          { status: 409 }
        );
      }

      const newSection: Section = {
        id: `sec-${Date.now()}`,
        name: name.toUpperCase(),
        semester_id,
        active,
        created_at: new Date().toISOString(),
      };

      mockStore.sections.push(newSection);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'SECTION_CREATED',
        entity_type: 'sections',
        entity_id: newSection.id,
        metadata: { name, semester_id },
        created_at: new Date().toISOString(),
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: 'Section created successfully',
        section: newSection,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    if (sectionId) {
      const { data, error } = await supabase
        .from('sections')
        .update({ name: name.toUpperCase(), semester_id, active })
        .eq('id', sectionId)
        .select('*, semester:semesters(*)')
        .single();

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: 'Section updated successfully',
        section: data,
      });
    }

    const { data, error } = await supabase
      .from('sections')
      .insert({ name: name.toUpperCase(), semester_id, active })
      .select('*, semester:semesters(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'Section already exists in this semester' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Section created successfully',
      section: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Section operation failed' },
      { status: 500 }
    );
  }
}
