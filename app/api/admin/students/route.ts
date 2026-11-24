export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { studentSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { Profile, StudentCourse } from '@/types';
import Papa from 'papaparse';
import { dispatchStudentCredentialEmail } from '@/lib/email/dispatcher';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get('semesterId');
    const sectionId = searchParams.get('sectionId');
    const courseId = searchParams.get('courseId');

    if (isUsingMockData()) {
      let students = (mockStore.profiles || []).filter((p) => p.role === 'STUDENT');

      if (semesterId) {
        students = students.filter(
          (p) => p.semester_id === semesterId || p.semester === semesterId
        );
      }
      if (sectionId) {
        students = students.filter(
          (p) => p.section_id === sectionId || p.section === sectionId
        );
      }
      if (courseId) {
        const studentIdsInCourse = new Set(
          (mockStore.studentCourses || [])
            .filter((sc) => sc.course_id === courseId)
            .map((sc) => sc.student_id)
        );
        students = students.filter((p) => studentIdsInCourse.has(p.id));
      }

      // Enrich with semester_info, section_info, and enrolled_courses
      const enrichedStudents = students.map((s) => {
        const sem = (mockStore.semesters || []).find(
          (m) => m.id === s.semester_id || String(m.semester_number) === s.semester
        ) || null;
        const sec = (mockStore.sections || []).find(
          (x) => x.id === s.section_id || (x.name === s.section && (!s.semester_id || x.semester_id === s.semester_id))
        ) || null;
        const enrolledCourseIds = (mockStore.studentCourses || [])
          .filter((sc) => sc.student_id === s.id)
          .map((sc) => sc.course_id);
        const enrolled_courses = (mockStore.courses || []).filter((c) =>
          enrolledCourseIds.includes(c.id)
        );

        return {
          ...s,
          semester_info: sem,
          section_info: sec,
          enrolled_courses,
        };
      });

      return NextResponse.json({
        success: true,
        students: enrichedStudents,
        outgoingEmails: mockStore.outgoingEmails || [],
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    let query = supabase
      .from('profiles')
      .select('*, semester_info:semesters(*), section_info:sections(*), student_courses(*, course:courses(*))')
      .eq('role', 'STUDENT');

    if (semesterId) {
      query = query.eq('semester_id', semesterId);
    }
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data, error } = await query.order('usn', { ascending: true });
    if (error) throw error;

    let students = (data || []).map((s: any) => ({
      ...s,
      enrolled_courses: (s.student_courses || []).map((sc: any) => sc.course).filter(Boolean),
    }));

    if (courseId) {
      students = students.filter((s: any) =>
        s.enrolled_courses.some((c: any) => c.id === courseId)
      );
    }

    return NextResponse.json({ success: true, students, outgoingEmails: [] });
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
          photo_url: row.photo_url || row.photo || null,
        });

        if (!val.success) {
          errors.push(`Row ${i + 1} (${row.name || 'Unknown'}): ${val.error.errors[0]?.message}`);
          continue;
        }

        const studentData = val.data;
        const initialPass = row.password?.trim() || 'Pass@1234';

        if (isUsingMockData()) {
          const existingIdx = mockStore.profiles.findIndex(
            (p) => p.email === studentData.email || (p.usn && p.usn === studentData.usn)
          );
          if (existingIdx !== -1) {
            mockStore.profiles[existingIdx] = {
              ...mockStore.profiles[existingIdx],
              ...studentData,
              active: true,
              password: mockStore.profiles[existingIdx].password || initialPass,
              updated_at: new Date().toISOString(),
            };
          } else {
            mockStore.profiles.push({
              id: `st-${Date.now()}-${i}`,
              ...studentData,
              role: 'STUDENT',
              active: true,
              password: initialPass,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
          importedCount++;
        } else {
          const supabase = getServiceRoleClient() || createClientServer();
          await supabase.from('profiles').upsert(
            {
              name: studentData.name,
              email: studentData.email,
              usn: studentData.usn,
              semester: studentData.semester,
              section: studentData.section,
              photo_url: studentData.photo_url,
              role: 'STUDENT',
              active: true,
            },
            { onConflict: 'email' }
          );
          importedCount++;
        }
      }

      if (isUsingMockData()) {
        saveStore();
      }

      await logAudit(user.id, 'STUDENTS_IMPORTED_CSV', {
        count: importedCount,
        errorCount: errors.length,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${importedCount} student records with default login credentials (Pass@1234).`,
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
        saveStore();
        return NextResponse.json({ success: true, message: `Student status updated to ${active ? 'Active' : 'Deactivated'}` });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      const { error } = await supabase.from('profiles').update({ active }).eq('id', studentId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Student status updated to ${active ? 'Active' : 'Deactivated'}` });
    }

    // 2.5 Delete student action
    if (body.action === 'DELETE') {
      const studentId = body.studentId || body.id;
      if (!studentId) {
        return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
      }

      if (isUsingMockData()) {
        const studentIdx = mockStore.profiles.findIndex((p) => p.id === studentId);
        if (studentIdx === -1) {
          return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
        }
        const student = mockStore.profiles[studentIdx];
        mockStore.profiles.splice(studentIdx, 1);

        if (mockStore.studentCourses) {
          mockStore.studentCourses = mockStore.studentCourses.filter((sc) => sc.student_id !== studentId);
        }
        if (mockStore.records) {
          mockStore.records = mockStore.records.filter((r) => r.student_id !== studentId);
        }

        await logAudit(user.id, 'STUDENT_DELETED', {
          studentId,
          studentName: student.name,
          studentEmail: student.email,
          studentUsn: student.usn,
        });

        saveStore();

        return NextResponse.json({
          success: true,
          message: `Student "${student.name}" (${student.usn}) was permanently removed.`,
        });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      await supabase.from('student_courses').delete().eq('student_id', studentId);
      await supabase.from('attendance_records').delete().eq('student_id', studentId);
      const { error } = await supabase.from('profiles').delete().eq('id', studentId);
      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Student permanently deleted successfully.',
      });
    }

    // 3. Admin Reset Password for student
    if (body.action === 'RESET_PASSWORD') {
      const { studentId, newPassword } = body;
      if (!studentId) {
        return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
      }

      const assignedPass = newPassword?.trim() || 'Pass@1234';

      if (isUsingMockData()) {
        const student = mockStore.profiles.find((p) => p.id === studentId);
        if (!student) return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });

        student.password = assignedPass;
        student.updated_at = new Date().toISOString();
        saveStore();

        await logAudit(user.id, 'STUDENT_PASSWORD_RESET', {
          studentId,
          studentEmail: student.email,
          studentUsn: student.usn,
        });

        const emailDispatch = await dispatchStudentCredentialEmail({
          to: student.email,
          studentName: student.name,
          usn: student.usn || '',
          temporaryPassword: assignedPass,
          semester: student.semester || '5',
          section: student.section || 'A',
        });

        return NextResponse.json({
          success: true,
          message: `Password reset successfully. New temporary password: ${assignedPass}`,
          temporaryPassword: assignedPass,
          emailDispatch,
        });
      }

      const supabase = getServiceRoleClient() || createClientServer();
      const { error } = await supabase.auth.admin.updateUserById(studentId, {
        password: assignedPass,
      });
      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Password reset successfully. New temporary password: ${assignedPass}`,
        temporaryPassword: assignedPass,
        emailDispatched: true,
      });
    }

    // 4. Single student Create or Edit
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

    const { name, email, usn, semester_id, section_id, semester, section, photo_url, course_ids } = validated.data;
    const initialPassword = body.initial_password || body.password || 'Pass@1234';
    const now = new Date().toISOString();

    if (isUsingMockData()) {
      if (!mockStore.studentCourses) {
        mockStore.studentCourses = [];
      }

      const semObj = semester_id ? mockStore.semesters.find((s) => s.id === semester_id) : null;
      const secObj = section_id ? mockStore.sections.find((s) => s.id === section_id) : null;

      let currentStudentId = studentId;

      if (studentId) {
        const idx = mockStore.profiles.findIndex((p) => p.id === studentId);
        if (idx === -1) return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
        
        mockStore.profiles[idx] = {
          ...mockStore.profiles[idx],
          name,
          email,
          usn,
          semester_id: semester_id || mockStore.profiles[idx].semester_id,
          section_id: section_id || mockStore.profiles[idx].section_id,
          semester: semObj ? String(semObj.semester_number) : (semester || mockStore.profiles[idx].semester),
          section: secObj ? secObj.name : (section || mockStore.profiles[idx].section),
          photo_url: photo_url !== undefined ? photo_url : mockStore.profiles[idx].photo_url,
          password: body.initial_password ? initialPassword : (mockStore.profiles[idx].password || initialPassword),
          updated_at: now,
        };
      } else {
        // Check unique USN / Email
        const duplicate = mockStore.profiles.find((p) => p.email === email || p.usn === usn);
        if (duplicate) {
          return NextResponse.json(
            { success: false, message: 'A student with this Email or USN already exists.' },
            { status: 409 }
          );
        }

        currentStudentId = `st-${Date.now()}`;
        const newStudent: Profile = {
          id: currentStudentId,
          name,
          email,
          usn,
          semester_id: semester_id || null,
          section_id: section_id || null,
          semester: semObj ? String(semObj.semester_number) : (semester || '5'),
          section: secObj ? secObj.name : (section || 'A'),
          photo_url: photo_url || null,
          role: 'STUDENT',
          password: initialPassword,
          active: true,
          created_at: now,
          updated_at: now,
        };
        mockStore.profiles.push(newStudent);
      }

      // Update enrolled courses
      if (Array.isArray(course_ids)) {
        mockStore.studentCourses = mockStore.studentCourses.filter((sc) => sc.student_id !== currentStudentId);
        course_ids.forEach((cid) => {
          mockStore.studentCourses.push({
            id: `sc-${Date.now()}-${cid}`,
            student_id: currentStudentId!,
            course_id: cid,
            created_at: now,
          });
        });
      }

      saveStore();

      let emailDispatch = null;
      if (!studentId) {
        emailDispatch = await dispatchStudentCredentialEmail({
          to: email.trim(),
          studentName: name.trim(),
          usn: usn.trim(),
          temporaryPassword: initialPassword,
          semester: semObj ? String(semObj.semester_number) : (semester || '5'),
          section: secObj ? secObj.name : (section || 'A'),
        });
      }

      const finalStudent = mockStore.profiles.find((p) => p.id === currentStudentId);
      return NextResponse.json({
        success: true,
        message: studentId ? 'Student updated successfully' : 'Student added successfully',
        student: finalStudent,
        temporaryPassword: initialPassword,
        emailDispatch,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    if (studentId) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name,
          email,
          usn,
          semester_id,
          section_id,
          semester,
          section,
          photo_url,
          updated_at: now,
        })
        .eq('id', studentId)
        .select()
        .single();
      if (error) throw error;

      // Update course enrollments
      if (Array.isArray(course_ids)) {
        await supabase.from('student_courses').delete().eq('student_id', studentId);
        if (course_ids.length > 0) {
          const insertCourses = course_ids.map((cid) => ({
            student_id: studentId,
            course_id: cid,
          }));
          await supabase.from('student_courses').insert(insertCourses);
        }
      }

      return NextResponse.json({ success: true, message: 'Student updated successfully', student: data });
    }

    // Creating new student profile in Supabase
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        name,
        email,
        usn,
        semester_id,
        section_id,
        semester,
        section,
        photo_url,
        role: 'STUDENT',
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(course_ids) && course_ids.length > 0) {
      const insertCourses = course_ids.map((cid) => ({
        student_id: data.id,
        course_id: cid,
      }));
      await supabase.from('student_courses').insert(insertCourses);
    }

    const emailDispatch = await dispatchStudentCredentialEmail({
      to: email.trim(),
      studentName: name.trim(),
      usn: usn.trim(),
      temporaryPassword: initialPassword,
      semester: semester || '5',
      section: section || 'A',
    });

    return NextResponse.json({
      success: true,
      message: 'Student added successfully',
      student: data,
      temporaryPassword: initialPassword,
      emailDispatch,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Student operation failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || searchParams.get('id');

    if (!studentId) {
      return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
    }

    if (isUsingMockData()) {
      const studentIdx = mockStore.profiles.findIndex((p) => p.id === studentId);
      if (studentIdx === -1) {
        return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
      }
      const student = mockStore.profiles[studentIdx];
      mockStore.profiles.splice(studentIdx, 1);

      if (mockStore.studentCourses) {
        mockStore.studentCourses = mockStore.studentCourses.filter((sc) => sc.student_id !== studentId);
      }
      if (mockStore.records) {
        mockStore.records = mockStore.records.filter((r) => r.student_id !== studentId);
      }

      await logAudit(user.id, 'STUDENT_DELETED', {
        studentId,
        studentName: student.name,
        studentEmail: student.email,
        studentUsn: student.usn,
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: `Student "${student.name}" (${student.usn}) was permanently removed.`,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    await supabase.from('student_courses').delete().eq('student_id', studentId);
    await supabase.from('attendance_records').delete().eq('student_id', studentId);
    const { error } = await supabase.from('profiles').delete().eq('id', studentId);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Student permanently deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete student' },
      { status: 500 }
    );
  }
}

async function logAudit(userId: string, action: string, metadata: any) {
  if (isUsingMockData()) {
    if (!mockStore.auditLogs) mockStore.auditLogs = [];
    mockStore.auditLogs.unshift({
      id: `log-${Date.now()}`,
      user_id: userId,
      action: action as any,
      entity_type: 'students',
      entity_id: null,
      metadata,
      created_at: new Date().toISOString(),
    });
    saveStore();
  }
}
