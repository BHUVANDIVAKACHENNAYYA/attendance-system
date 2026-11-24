/**
 * Seed script for GPS-Based Student Attendance Management System
 * Run with: node scripts/seed-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-id')) {
  console.log('ℹ No production Supabase credentials detected in .env.');
  console.log('ℹ The application seamlessly runs out-of-the-box using the built-in mock store with:');
  console.log('  - 17 Demo Students (USN001 to USN017)');
  console.log('  - 1 Admin / Teacher Account (admin@college.edu)');
  console.log('  - 4 Authorized Classrooms & Laboratories');
  console.log('  - Active & Past Sessions');
  console.log('\nTo seed a real Supabase database:');
  console.log('1. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  console.log('2. Run the SQL migration at supabase/migrations/20261123_init.sql in the Supabase SQL editor');
  console.log('3. Run this script again.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log('Seeding Supabase database at:', supabaseUrl);

  // 1. Locations
  const locations = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Electronics Classroom 302',
      latitude: 15.3647,
      longitude: 75.124,
      radius_meters: 50,
      max_accuracy_meters: 100,
      active: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Digital Systems Laboratory',
      latitude: 15.365,
      longitude: 75.1245,
      radius_meters: 40,
      max_accuracy_meters: 100,
      active: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      name: 'Central Seminar Hall A',
      latitude: 15.364,
      longitude: 75.1235,
      radius_meters: 60,
      max_accuracy_meters: 100,
      active: true,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      name: 'Embedded IoT Project Lab',
      latitude: 15.3655,
      longitude: 75.125,
      radius_meters: 45,
      max_accuracy_meters: 100,
      active: true,
    },
  ];

  const { error: locErr } = await supabase.from('attendance_locations').upsert(locations);
  if (locErr) console.error('Error inserting locations:', locErr.message);
  else console.log('✓ Locations seeded successfully (4 classrooms/labs)');

  // 2. Semesters
  const semester = {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: '5th Semester',
    semester_number: 5,
    academic_year: '2026-2027',
    active: true,
  };
  const { error: semErr } = await supabase.from('semesters').upsert(semester);
  if (semErr) console.error('Error inserting semester:', semErr.message);
  else console.log('✓ Semester seeded (5th Semester)');

  // 3. Sections
  const sections = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'A',
      semester_id: semester.id,
      active: true,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      name: 'B',
      semester_id: semester.id,
      active: true,
    },
  ];
  const { error: secErr } = await supabase.from('sections').upsert(sections);
  if (secErr) console.error('Error inserting sections:', secErr.message);
  else console.log('✓ Sections seeded (A, B)');

  // 4. Courses
  const courses = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      course_code: 'EC501',
      course_name: 'Digital Communication Systems',
      semester_id: semester.id,
      description: 'Core electronics & communication theory and laboratory',
      active: true,
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      course_code: 'EC502',
      course_name: 'Microcontrollers & Embedded Systems',
      semester_id: semester.id,
      description: 'ARM Cortex architecture, peripheral interfacing, and RTOS',
      active: true,
    },
  ];
  const { error: crsErr } = await supabase.from('courses').upsert(courses);
  if (crsErr) console.error('Error inserting courses:', crsErr.message);
  else console.log('✓ Courses seeded (EC501, EC502)');

  console.log('\n✓ Database seeding complete! All academic structures ready.');
}

seed().catch(console.error);
