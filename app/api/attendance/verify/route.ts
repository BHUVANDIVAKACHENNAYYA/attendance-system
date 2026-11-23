import { NextRequest, NextResponse } from 'next/server';
import { attendanceVerificationSchema } from '@/lib/validation';
import { calculateHaversineDistance } from '@/lib/gps/haversine';
import { validateGpsAccuracy } from '@/lib/gps/accuracy';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { createClientServer } from '@/lib/supabase/server';
import { AttendanceRecord, AttendanceStatus, AuditLog } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the student
    const student = await getAuthenticatedUser(request);
    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    if (student.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, message: 'Only registered students can mark attendance.' },
        { status: 403 }
      );
    }

    if (!student.active) {
      return NextResponse.json(
        { success: false, message: 'Student account is deactivated. Contact administrator.' },
        { status: 403 }
      );
    }

    // 2. Parse & Validate request payload
    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const validationResult = attendanceVerificationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Malformed attendance payload',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, latitude, longitude, accuracy } = validationResult.data;

    // 3. Fetch session and location details
    let session: any = null;
    let location: any = null;
    let existingRecord: any = null;

    if (isUsingMockData()) {
      session = mockStore.sessions.find((s) => s.id === sessionId);
      if (session) {
        location = mockStore.locations.find((l) => l.id === session.location_id);
        existingRecord = mockStore.records.find(
          (r) => r.session_id === sessionId && r.student_id === student.id
        );
      }
    } else {
      const supabase = getServiceRoleClient() || createClientServer();
      const { data: sessionData, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .select('*, location:attendance_locations(*)')
        .eq('id', sessionId)
        .single();

      if (sessionErr || !sessionData) {
        return NextResponse.json(
          { success: false, message: 'Attendance session not found.' },
          { status: 404 }
        );
      }
      session = sessionData;
      location = sessionData.location;

      const { data: recordData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId)
        .eq('student_id', student.id)
        .maybeSingle();

      existingRecord = recordData;
    }

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Attendance session not found.' },
        { status: 404 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Configured attendance location not found.' },
        { status: 500 }
      );
    }

    // 4. Verify Student Academic Eligibility
    if (session.semester_id && student.semester_id && session.semester_id !== student.semester_id) {
      return NextResponse.json(
        { success: false, message: 'You do not belong to the semester assigned to this session.' },
        { status: 403 }
      );
    }
    if (session.section_id && student.section_id && session.section_id !== student.section_id) {
      return NextResponse.json(
        { success: false, message: 'You do not belong to the section assigned to this session.' },
        { status: 403 }
      );
    }
    if (session.course_id && isUsingMockData()) {
      const enrolledCourseIds = (mockStore.studentCourses || [])
        .filter((sc) => sc.student_id === student.id)
        .map((sc) => sc.course_id);
      if (enrolledCourseIds.length > 0 && !enrolledCourseIds.includes(session.course_id)) {
        return NextResponse.json(
          { success: false, message: 'You are not enrolled in this course.' },
          { status: 403 }
        );
      }
    }

    // 5. Check duplicate attendance
    if (existingRecord) {
      return NextResponse.json(
        {
          success: false,
          status: existingRecord.status,
          message: `Your attendance has already been recorded for this session at ${new Date(
            existingRecord.marked_at
          ).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`,
          markedAt: existingRecord.marked_at,
          distanceMeters: existingRecord.distance_from_location_meters,
        },
        { status: 409 }
      );
    }

    // 5. Verify Session Status
    if (session.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        SCHEDULED: 'This attendance session has not been activated by the teacher yet.',
        CLOSED: 'This attendance session has been closed by the teacher.',
        EXPIRED: 'This attendance session has expired.',
      };
      return NextResponse.json(
        {
          success: false,
          status: 'REJECTED_TIME',
          message: statusMessages[session.status] || 'Session is not active for attendance.',
        },
        { status: 400 }
      );
    }

    // 6. Verify Server Time Window (CRITICAL: device clock cannot manipulate server time)
    const serverNow = new Date();
    const sessionStart = new Date(session.start_time);
    const sessionEnd = new Date(session.end_time);

    if (serverNow < sessionStart) {
      return NextResponse.json(
        {
          success: false,
          status: 'REJECTED_TIME',
          message: `Attendance window opens at ${sessionStart.toLocaleTimeString()}.`,
        },
        { status: 400 }
      );
    }

    if (serverNow > sessionEnd) {
      return NextResponse.json(
        {
          success: false,
          status: 'REJECTED_TIME',
          message: 'This attendance session has ended.',
        },
        { status: 400 }
      );
    }

    // 7. Validate GPS Accuracy
    const maxAccuracy = location.max_accuracy_meters || 100;
    const accuracyCheck = validateGpsAccuracy(accuracy, maxAccuracy);
    if (!accuracyCheck.isValid) {
      // Record rejected audit attempt
      const rejectedLog: AuditLog = {
        id: `log-${Date.now()}`,
        user_id: student.id,
        action: 'ATTENDANCE_REJECTED',
        entity_type: 'attendance_record',
        entity_id: null,
        metadata: {
          sessionId,
          reason: 'POOR_GPS_ACCURACY',
          accuracy,
          maxAccuracy,
        },
        created_at: serverNow.toISOString(),
      };
      if (isUsingMockData()) {
        mockStore.auditLogs.unshift(rejectedLog);
      }
      return NextResponse.json(
        {
          success: false,
          status: 'REJECTED_LOCATION',
          message: accuracyCheck.message,
          accuracy: Math.round(accuracy),
          maxAllowedAccuracy: maxAccuracy,
        },
        { status: 400 }
      );
    }

    // 8. Server-side Distance Calculation using Haversine formula
    const distanceMeters = calculateHaversineDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    );

    const allowedRadius = session.gps_radius || location.radius_meters || 50;

    // 9. Enforce Permitted Radius Rule
    if (distanceMeters > allowedRadius) {
      // Log rejected location event
      const auditPayload = {
        sessionId,
        reason: 'OUTSIDE_RADIUS',
        studentCoords: { latitude, longitude },
        targetCoords: { latitude: location.latitude, longitude: location.longitude },
        distanceMeters,
        allowedRadius,
      };

      if (isUsingMockData()) {
        mockStore.auditLogs.unshift({
          id: `log-${Date.now()}`,
          user_id: student.id,
          action: 'ATTENDANCE_REJECTED',
          entity_type: 'attendance_record',
          entity_id: null,
          metadata: auditPayload,
          created_at: serverNow.toISOString(),
        });
      }

      return NextResponse.json(
        {
          success: false,
          status: 'REJECTED_LOCATION',
          message: `Attendance cannot be marked. You are approximately ${Math.round(
            distanceMeters
          )} metres away from ${location.name}. Required distance is within ${allowedRadius} metres.`,
          distanceMeters: Math.round(distanceMeters),
          allowedRadiusMeters: allowedRadius,
          locationName: location.name,
        },
        { status: 400 }
      );
    }

    // 10. Determine PRESENT vs LATE based on late threshold
    const lateThreshold = new Date(session.late_threshold);
    const attendanceStatus: AttendanceStatus = serverNow > lateThreshold ? 'LATE' : 'PRESENT';

    const markedAtIso = serverNow.toISOString();
    const verificationMessage = `Location verified within ${allowedRadius}m of ${location.name} (${Math.round(
      distanceMeters
    )}m away, accuracy ±${Math.round(accuracy)}m)`;

    // 11. Save Attendance Record
    const newRecord: AttendanceRecord = {
      id: isUsingMockData() ? `rec-${Date.now()}` : crypto.randomUUID(),
      session_id: sessionId,
      student_id: student.id,
      marked_at: markedAtIso,
      student_latitude: latitude,
      student_longitude: longitude,
      gps_accuracy_meters: accuracy,
      distance_from_location_meters: distanceMeters,
      location_verified: true,
      status: attendanceStatus,
      verification_message: verificationMessage,
      created_at: markedAtIso,
      updated_at: markedAtIso,
    };

    if (isUsingMockData()) {
      mockStore.records.unshift(newRecord);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: student.id,
        action: 'ATTENDANCE_MARKED',
        entity_type: 'attendance_record',
        entity_id: newRecord.id,
        metadata: {
          sessionId,
          status: attendanceStatus,
          distanceMeters,
          accuracy,
        },
        created_at: markedAtIso,
      });
      saveStore();
    } else {
      const supabase = getServiceRoleClient() || createClientServer();
      const { error: insertErr } = await supabase.from('attendance_records').insert(newRecord);

      if (insertErr) {
        if (insertErr.code === '23505') {
          return NextResponse.json(
            { success: false, message: 'Your attendance has already been recorded.' },
            { status: 409 }
          );
        }
        throw insertErr;
      }

      await supabase.from('audit_logs').insert({
        user_id: student.id,
        action: 'ATTENDANCE_MARKED',
        entity_type: 'attendance_record',
        entity_id: newRecord.id,
        metadata: {
          sessionId,
          status: attendanceStatus,
          distanceMeters,
          accuracy,
        },
      });
    }

    // 12. Return Success Confirmation
    return NextResponse.json({
      success: true,
      status: attendanceStatus,
      markedAt: markedAtIso,
      distanceMeters: Math.round(distanceMeters),
      allowedRadiusMeters: allowedRadius,
      locationVerified: true,
      accuracy: Math.round(accuracy),
      locationName: location.name,
      message:
        attendanceStatus === 'LATE'
          ? 'Attendance marked as LATE (submitted after late threshold).'
          : 'Attendance Marked Successfully.',
    });
  } catch (error: any) {
    console.error('Attendance verification internal error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An internal server error occurred while verifying attendance.',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
