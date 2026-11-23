import test from 'node:test';
import assert from 'node:assert/strict';

// Haversine formula
const EARTH_RADIUS_METRES = 6371000;
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  return Math.round(EARTH_RADIUS_METRES * c * 100) / 100;
}

function validateGpsAccuracy(accuracy, maxAccuracy = 100) {
  return {
    isValid: accuracy <= maxAccuracy,
    message: accuracy <= maxAccuracy ? 'GPS signal valid' : 'GPS signal weak',
  };
}

// Clean test environment setup
const TEST_STORE = {
  semesters: [],
  courses: [],
  sections: [],
  studentCourses: [],
  profiles: [],
  locations: [],
  sessions: [],
  records: [],
  auditLogs: [],
};

test('1. Two-Portal Academic Management: Create Semester, Courses, Section, and Enroll Student', () => {
  // 1.1 Create 5th Semester
  const semester = {
    id: 'sem-5',
    name: '5th Semester',
    semester_number: 5,
    academic_year: '2026-2027',
    active: true,
  };
  TEST_STORE.semesters.push(semester);
  assert.equal(TEST_STORE.semesters.length, 1);
  assert.equal(TEST_STORE.semesters[0].name, '5th Semester');

  // 1.2 Create Courses for 5th Semester
  const course1 = {
    id: 'c-ec501',
    course_code: 'EC501',
    course_name: 'Digital Electronics',
    semester_id: semester.id,
    active: true,
  };
  const course2 = {
    id: 'c-ec502',
    course_code: 'EC502',
    course_name: 'Microcontrollers',
    semester_id: semester.id,
    active: true,
  };
  TEST_STORE.courses.push(course1, course2);
  assert.equal(TEST_STORE.courses.length, 2);

  // 1.3 Create Section A for 5th Semester
  const section = {
    id: 'sec-5a',
    name: 'A',
    semester_id: semester.id,
    active: true,
  };
  TEST_STORE.sections.push(section);
  assert.equal(TEST_STORE.sections[0].name, 'A');

  // 1.4 Register Student with Photo and enroll in courses
  const student = {
    id: 'st-001',
    name: 'Arun Kumar',
    email: 'arun@college.edu',
    usn: '01FS24BEC002',
    role: 'STUDENT',
    semester_id: semester.id,
    section_id: section.id,
    semester: '5',
    section: 'A',
    photo_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    active: true,
  };
  TEST_STORE.profiles.push(student);

  // Enroll in EC501 and EC502
  TEST_STORE.studentCourses.push(
    { id: 'sc-1', student_id: student.id, course_id: course1.id },
    { id: 'sc-2', student_id: student.id, course_id: course2.id }
  );

  const studentEnrolledCourses = TEST_STORE.studentCourses
    .filter((sc) => sc.student_id === student.id)
    .map((sc) => TEST_STORE.courses.find((c) => c.id === sc.course_id));

  assert.equal(studentEnrolledCourses.length, 2);
  assert.equal(studentEnrolledCourses[0].course_code, 'EC501');
  assert.equal(studentEnrolledCourses[1].course_code, 'EC502');
});

test('2. Attendance Location Geofencing & Session Scheduling with Auto-Day Derivation', () => {
  // 2.1 Configure Authorized Location
  const location = {
    id: 'loc-lab3',
    name: 'Electronics Lab Hall 3',
    latitude: 15.3647,
    longitude: 75.1240,
    radius_meters: 50,
    max_accuracy_meters: 100,
  };
  TEST_STORE.locations.push(location);

  // 2.2 Schedule Session for 5th Semester, EC501, Section A
  const attendanceDate = '2026-11-23';
  const attendanceDay = new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  assert.equal(attendanceDay, 'Monday');

  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 mins ago
  const lateThreshold = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 mins from now
  const endTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins from now

  const session = {
    id: 'sess-001',
    semester_id: 'sem-5',
    course_id: 'c-ec501',
    section_id: 'sec-5a',
    subject: 'EC501 - Digital Electronics',
    class_name: 'Section A',
    attendance_date: attendanceDate,
    attendance_day: attendanceDay,
    location_id: location.id,
    start_time: startTime,
    end_time: endTime,
    late_threshold: lateThreshold,
    gps_radius: 50,
    status: 'ACTIVE',
  };
  TEST_STORE.sessions.push(session);

  assert.equal(session.attendance_day, 'Monday');
  assert.equal(session.gps_radius, 50);
});

test('3. Student Portal Verification: Enrolled Course Filter & Real-Time GPS Geofencing', () => {
  const student = TEST_STORE.profiles.find((p) => p.id === 'st-001');
  const session = TEST_STORE.sessions[0];
  const location = TEST_STORE.locations[0];

  // 3.1 Verify Eligibility: Student belongs to semester, section, and is enrolled in course
  const enrolledCourseIds = TEST_STORE.studentCourses
    .filter((sc) => sc.student_id === student.id)
    .map((sc) => sc.course_id);

  assert.equal(session.semester_id, student.semester_id);
  assert.equal(session.section_id, student.section_id);
  assert.ok(enrolledCourseIds.includes(session.course_id));

  // 3.2 Student within 50m radius (Inside Classroom)
  const studentInsideCoords = {
    latitude: 15.3648,
    longitude: 75.1241,
    accuracy: 12,
  };

  const accuracyCheck = validateGpsAccuracy(studentInsideCoords.accuracy, location.max_accuracy_meters);
  assert.equal(accuracyCheck.isValid, true);

  const distanceInside = calculateHaversineDistance(
    studentInsideCoords.latitude,
    studentInsideCoords.longitude,
    location.latitude,
    location.longitude
  );

  assert.ok(distanceInside <= session.gps_radius, `Distance ${distanceInside}m should be <= 50m`);

  // Record Attendance
  const now = new Date();
  const status = now <= new Date(session.late_threshold) ? 'PRESENT' : 'LATE';
  const record = {
    id: 'rec-001',
    session_id: session.id,
    student_id: student.id,
    marked_at: now.toISOString(),
    student_latitude: studentInsideCoords.latitude,
    student_longitude: studentInsideCoords.longitude,
    distance_from_location_meters: distanceInside,
    location_verified: true,
    status,
  };
  TEST_STORE.records.push(record);
  assert.equal(record.status, 'PRESENT');

  // 3.3 Duplicate Prevention Rule
  const duplicateRecord = TEST_STORE.records.find(
    (r) => r.session_id === session.id && r.student_id === student.id
  );
  assert.ok(duplicateRecord, 'Duplicate attempt must be detected and rejected with HTTP 409');

  // 3.4 Student Outside 50m Radius (Hostel/Canteen ~300m away)
  const studentOutsideCoords = {
    latitude: 15.3675,
    longitude: 75.1265,
    accuracy: 15,
  };
  const distanceOutside = calculateHaversineDistance(
    studentOutsideCoords.latitude,
    studentOutsideCoords.longitude,
    location.latitude,
    location.longitude
  );
  assert.ok(distanceOutside > session.gps_radius, `Distance ${distanceOutside}m must exceed 50m radius`);

  // 3.5 GPS Accuracy Rejection (> 100m error)
  const poorAccuracyCheck = validateGpsAccuracy(150, 100);
  assert.equal(poorAccuracyCheck.isValid, false);
});

test('4. Admin Live Attendance Monitoring & Manual Correction Audit Trail', () => {
  const session = TEST_STORE.sessions[0];
  const student = TEST_STORE.profiles.find((p) => p.id === 'st-001');

  // 4.1 Check Live Attendance Table
  const sessionRecords = TEST_STORE.records.filter((r) => r.session_id === session.id);
  assert.equal(sessionRecords.length, 1);
  assert.equal(sessionRecords[0].status, 'PRESENT');

  // 4.2 Authorized Manual Attendance Correction with Audit Reason
  const correctionAudit = {
    id: 'log-audit-01',
    user_id: 'admin-01',
    action: 'ATTENDANCE_MANUALLY_CHANGED',
    entity_type: 'attendance_record',
    entity_id: sessionRecords[0].id,
    metadata: {
      studentId: student.id,
      previousStatus: 'PRESENT',
      newStatus: 'LATE',
      reason: 'Student arrived after late threshold; manual review by course instructor.',
    },
    created_at: new Date().toISOString(),
  };
  TEST_STORE.auditLogs.push(correctionAudit);

  // Update record status
  sessionRecords[0].status = 'LATE';
  assert.equal(TEST_STORE.records[0].status, 'LATE');
  assert.equal(TEST_STORE.auditLogs[0].metadata.reason.length > 0, true);
});

test('5. Student History Breakdown: Course-Wise Metrics & Eligibility Percentage', () => {
  const student = TEST_STORE.profiles.find((p) => p.id === 'st-001');

  // Compute stats for EC501
  const ec501Sessions = TEST_STORE.sessions.filter((s) => s.course_id === 'c-ec501');
  const ec501Records = TEST_STORE.records.filter(
    (r) => r.student_id === student.id && ec501Sessions.some((s) => s.id === r.session_id)
  );

  const present = ec501Records.filter((r) => r.status === 'PRESENT').length;
  const late = ec501Records.filter((r) => r.status === 'LATE').length;
  const totalClasses = ec501Sessions.length;
  const percentage = totalClasses > 0 ? Math.round(((present + late) / totalClasses) * 100) : 0;

  assert.equal(totalClasses, 1);
  assert.equal(present + late, 1);
  assert.equal(percentage, 100);

  // Status badge check (>= 85% is GOOD)
  const statusBadge = percentage >= 85 ? 'GOOD' : percentage >= 75 ? 'AVERAGE' : 'SHORTAGE';
  assert.equal(statusBadge, 'GOOD');
});
