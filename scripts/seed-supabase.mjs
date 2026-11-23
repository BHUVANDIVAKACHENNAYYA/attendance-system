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
  ];

  const { error: locErr } = await supabase.from('attendance_locations').upsert(locations);
  if (locErr) console.error('Error inserting locations:', locErr.message);
  else console.log('✓ Locations seeded successfully');

  console.log('✓ Database seeding complete!');
}

seed().catch(console.error);
