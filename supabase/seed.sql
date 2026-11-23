-- Seed data for GPS-Based Attendance System

-- Insert Attendance Locations
INSERT INTO public.attendance_locations (id, name, latitude, longitude, radius_meters, max_accuracy_meters, active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Electronics Classroom 302', 15.364700, 75.124000, 50, 100, true),
    ('a0000000-0000-0000-0000-000000000002', 'Digital Systems Laboratory', 15.365000, 75.124500, 40, 100, true),
    ('a0000000-0000-0000-0000-000000000003', 'Central Seminar Hall A', 15.364000, 75.123500, 60, 100, true),
    ('a0000000-0000-0000-0000-000000000004', 'Embedded IoT Project Lab', 15.365500, 75.125000, 45, 100, true)
ON CONFLICT (id) DO NOTHING;

-- Note for Admin & Student Authentication:
-- In Supabase Auth, users must be registered in auth.users first, which triggers handle_new_user().
-- For local or automated seeding, you can run the provided node seed script:
-- node scripts/seed-auth-users.mjs
-- or sign up directly through the application's login/signup page.
