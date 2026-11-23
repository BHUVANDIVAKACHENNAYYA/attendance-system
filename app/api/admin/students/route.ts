import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { studentSchema } from '@/lib/validation';
import { isUsingMockData, mockStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { Profile } from '@/types';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    if (isUsingMockData()) {
      const students = mockStore.profiles.filter((p) => p.role === 'STUDENT');
      return NextResponse.json({ success: true, students });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'STUDENT')
      .order('usn', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, students: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list students' },
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

    // 1. Bulk CSV Import action
    if (body.action === 'IMPORT_CSV') {
      const csvContent = body.csvText;
      if (!csvContent) {
        return NextResponse.json({ success: false, message: 'CSV content is missing' }, { status: 400 });
      }

      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: false, message: 'No rows parsed from CSV' }, { status: 400 });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const val = studentSchema.safeParse({
          name: row.name?.trim(),
          email: row.email?.trim(),
          usn: row.usn?.trim(),
          semester: row.semester ? String(row.semester).trim() : '5',
          section: row.section ? String(row.section).trim() : 'A',
        });

        if (!val.success) {
          errors.push(`Row ${i + 1} (${row.name || 'Unknown'}): ${val.error.errors[0]?.message}`);
          continue;
        }

        const studentData = val.data;

        if (isUsingMockData()) {
          const existingIdx = mockStore.profiles.findIndex(
            (p) => p.email === studentData.email || (p.usn && p.usn === studentData.usn)
          );
          if (existingIdx !== -1) {
            mockStore.profiles[existingIdx] = {
              ...mockStore.profiles[existingIdx],
              ...studentData,
              active: true,
            };
          } else {
            mockStore.profiles.push({
              id: `st-${Date.now()}-${i}`,
              ...studentData,
              role: 'STUDENT',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
          importedCount++;
        } else {
          const supabase = getServiceRoleClient() || createClientServer();
          // Insert or update profile
          await supabase.from('profiles').upsert(
            {
              name: studentData.name,
              email: studentData.email,
              usn: studentData.usn,
              semester: studentData.semester,
              section: studentData.section,
              role: 'STUDENT',
              active: true,
            },
            { onConflict: 'email' }
          );
          importedCount++;
        }
      }

      await logAudit(user.id, 'STUDENTS_IMPORTED_CSV', {
        count: importedCount,
        errorCount: errors.length,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${importedCount} student records.`,
        importedCount,
        errors,
      });
    }

    // 2. Toggle active status
    if (body.action === 'TOGGLE_STATUS') {
      const { studentId, active } = body;
      if (!studentId || typeof active !== 'boolean') {
        return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
      }

      if (isUsingMockData()) {
        const student = mockStore.profiles.find((p) => p.id === studentId);
        if (!student) return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
        student.active = active;
        student.updated_at = new Date().toISOString();
        return NextResponse.json({ success: true, message: `Student status updated to ${active ? 'Active' : 'Deactivated'}` });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      const { error } = await supabase.from('profiles').update({ active }).eq('id', studentId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Student status updated to ${active ? 'Active' : 'Deactivated'}` });
    }

    // 3. Single student Create or Edit
    const studentId = body.id;
    const validated = studentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid student input',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, usn, semester, section } = validated.data;
    const now = new Date().toISOString();

    if (isUsingMockData()) {
      if (studentId) {
        const idx = mockStore.profiles.findIndex((p) => p.id === studentId);
        if (idx === -1) return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
        mockStore.profiles[idx] = {
          ...mockStore.profiles[idx],
          name,
          email,
          usn,
          semester,
          section,
          updated_at: now,
        };
        return NextResponse.json({ success: true, message: 'Student updated successfully', student: mockStore.profiles[idx] });
      }

      const newStudent: Profile = {
        id: `st-${Date.now()}`,
        name,
        email,
        usn,
        semester,
        section,
        role: 'STUDENT',
        active: true,
        created_at: now,
        updated_at: now,
      };
      mockStore.profiles.push(newStudent);
      return NextResponse.json({ success: true, message: 'Student added successfully', student: newStudent });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    if (studentId) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ name, email, usn, semester, section, updated_at: now })
        .eq('id', studentId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Student updated successfully', student: data });
    }

    // Creating new student profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        name,
        email,
        usn,
        semester,
        section,
        role: 'STUDENT',
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Student added successfully', student: data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Student operation failed' },
      { status: 500 }
    );
  }
}

async function logAudit(userId: string, action: string, metadata: any) {
  if (isUsingMockData()) {
    mockStore.auditLogs.unshift({
      id: `log-${Date.now()}`,
      user_id: userId,
      action,
      entity_type: 'students',
      entity_id: null,
      metadata,
      created_at: new Date().toISOString(),
    });
  }
}
