export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { courseSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { Course } from '@/types';

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
      let courses = mockStore.courses || [];
      if (semesterId) {
        courses = courses.filter((c) => c.semester_id === semesterId);
      }
      if (activeOnly) {
        courses = courses.filter((c) => c.active);
      }

      const enriched = courses.map((c) => {
        const semester = (mockStore.semesters || []).find((s) => s.id === c.semester_id);
        const enrolledCount = (mockStore.studentCourses || []).filter((sc) => sc.course_id === c.id).length;
        return {
          ...c,
          semester,
          enrolledCount,
        };
      });

      return NextResponse.json({ success: true, courses: enriched });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase.from('courses').select('*, semester:semesters(*), student_courses(id)');
    if (semesterId) {
      query = query.eq('semester_id', semesterId);
    }
    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query.order('course_code', { ascending: true });
    if (error) throw error;

    const enriched = (data || []).map((c: any) => ({
      ...c,
      enrolledCount: c.student_courses?.length || 0,
    }));

    return NextResponse.json({ success: true, courses: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list courses' },
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
      const { courseId, active } = body;
      if (!courseId || typeof active !== 'boolean') {
        return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
      }

      if (isUsingMockData()) {
        const course = (mockStore.courses || []).find((c) => c.id === courseId);
        if (!course) {
          return NextResponse.json({ success: false, message: 'Course not found' }, { status: 404 });
        }
        course.active = active;
        course.updated_at = new Date().toISOString();
        saveStore();
        return NextResponse.json({
          success: true,
          message: `Course ${active ? 'activated' : 'deactivated'} successfully`,
        });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      const { error } = await supabase
        .from('courses')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', courseId);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Course ${active ? 'activated' : 'deactivated'} successfully`,
      });
    }

    // 2. Create or Edit Course
    const validated = courseSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid course data',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { course_code, course_name, semester_id, description, active } = validated.data;
    const now = new Date().toISOString();
    const courseId = body.id;

    if (isUsingMockData()) {
      if (!mockStore.courses) {
        mockStore.courses = [];
      }

      if (courseId) {
        const idx = mockStore.courses.findIndex((c) => c.id === courseId);
        if (idx === -1) {
          return NextResponse.json({ success: false, message: 'Course not found' }, { status: 404 });
        }
        mockStore.courses[idx] = {
          ...mockStore.courses[idx],
          course_code: course_code.toUpperCase(),
          course_name,
          semester_id,
          description: description || null,
          active,
          updated_at: now,
        };
        saveStore();
        return NextResponse.json({
          success: true,
          message: 'Course updated successfully',
          course: mockStore.courses[idx],
        });
      }

      // Check duplicate course code in semester
      const duplicate = mockStore.courses.find(
        (c) => c.course_code.toUpperCase() === course_code.toUpperCase() && c.semester_id === semester_id
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Course ${course_code.toUpperCase()} already exists in this semester` },
          { status: 409 }
        );
      }

      const newCourse: Course = {
        id: `c-${Date.now()}`,
        course_code: course_code.toUpperCase(),
        course_name,
        semester_id,
        description: description || null,
        active,
        created_at: now,
        updated_at: now,
      };

      mockStore.courses.push(newCourse);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'COURSE_CREATED',
        entity_type: 'courses',
        entity_id: newCourse.id,
        metadata: { course_code, course_name, semester_id },
        created_at: now,
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: 'Course created successfully',
        course: newCourse,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    if (courseId) {
      const { data, error } = await supabase
        .from('courses')
        .update({
          course_code: course_code.toUpperCase(),
          course_name,
          semester_id,
          description,
          active,
          updated_at: now,
        })
        .eq('id', courseId)
        .select('*, semester:semesters(*)')
        .single();

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: 'Course updated successfully',
        course: data,
      });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        course_code: course_code.toUpperCase(),
        course_name,
        semester_id,
        description,
        active,
      })
      .select('*, semester:semesters(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'Course code already exists in this semester' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Course created successfully',
      course: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Course operation failed' },
      { status: 500 }
    );
  }
}
