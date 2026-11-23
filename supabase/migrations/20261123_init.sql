-- Migration: 20261123_init.sql
-- Two-Portal Architecture: Academic Management & GPS Attendance System Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Semesters Table (1st to 8th semester)
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    semester_number INTEGER UNIQUE NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_sem_section UNIQUE(semester_id, name)
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT NOT NULL,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Profiles Table (Admin & Student)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STUDENT')),
    usn TEXT UNIQUE,
    semester TEXT,
    section TEXT,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    photo_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Student Courses Enrollment Table
CREATE TABLE IF NOT EXISTS public.student_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_course UNIQUE(student_id, course_id)
);

-- 6. Attendance Locations Table
CREATE TABLE IF NOT EXISTS public.attendance_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 50,
    max_accuracy_meters INTEGER NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    attendance_day TEXT NOT NULL DEFAULT 'Monday',
    session_description TEXT,
    location_id UUID NOT NULL REFERENCES public.attendance_locations(id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    late_threshold TIMESTAMP WITH TIME ZONE NOT NULL,
    gps_radius INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'CLOSED', 'EXPIRED', 'CANCELLED')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_slot UNIQUE(course_id, attendance_date, section_id, start_time)
);

-- 8. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    student_latitude DOUBLE PRECISION,
    student_longitude DOUBLE PRECISION,
    gps_accuracy_meters DOUBLE PRECISION,
    distance_from_location_meters DOUBLE PRECISION,
    location_verified BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'ABSENT', 'NOT_MARKED', 'REJECTED_LOCATION', 'REJECTED_TIME')),
    verification_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_student UNIQUE(session_id, student_id)
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_semesters_active ON public.semesters(active);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON public.courses(semester_id);
CREATE INDEX IF NOT EXISTS idx_sections_semester ON public.sections(semester_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_student ON public.student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course ON public.student_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_usn ON public.profiles(usn);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON public.attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: semesters
CREATE POLICY "Anyone can view active semesters"
    ON public.semesters FOR SELECT
    USING (active = true OR public.is_admin());
CREATE POLICY "Admins can manage semesters"
    ON public.semesters FOR ALL
    USING (public.is_admin());

-- RLS: courses
CREATE POLICY "Anyone can view active courses"
    ON public.courses FOR SELECT
    USING (active = true OR public.is_admin());
CREATE POLICY "Admins can manage courses"
    ON public.courses FOR ALL
    USING (public.is_admin());

-- RLS: sections
CREATE POLICY "Anyone can view sections"
    ON public.sections FOR SELECT
    USING (active = true OR public.is_admin());
CREATE POLICY "Admins can manage sections"
    ON public.sections FOR ALL
    USING (public.is_admin());

-- RLS: student_courses
CREATE POLICY "Students can view their own course enrollments"
    ON public.student_courses FOR SELECT
    USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can manage course enrollments"
    ON public.student_courses FOR ALL
    USING (public.is_admin());

-- RLS: profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (public.is_admin() OR auth.uid() = id);

-- RLS: attendance_locations
CREATE POLICY "Users can view active locations"
    ON public.attendance_locations FOR SELECT
    USING (active = true OR public.is_admin());
CREATE POLICY "Admins can manage locations"
    ON public.attendance_locations FOR ALL
    USING (public.is_admin());

-- RLS: attendance_sessions
CREATE POLICY "Users can view sessions"
    ON public.attendance_sessions FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage sessions"
    ON public.attendance_sessions FOR ALL
    USING (public.is_admin());

-- RLS: attendance_records
CREATE POLICY "Students can view own attendance"
    ON public.attendance_records FOR SELECT
    USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can manage attendance records"
    ON public.attendance_records FOR ALL
    USING (public.is_admin());

-- RLS: audit_logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Function to handle user signup profile synchronization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, usn, semester, section, semester_id, section_id, photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    NEW.raw_user_meta_data->>'usn',
    NEW.raw_user_meta_data->>'semester',
    NEW.raw_user_meta_data->>'section',
    (NEW.raw_user_meta_data->>'semester_id')::uuid,
    (NEW.raw_user_meta_data->>'section_id')::uuid,
    NEW.raw_user_meta_data->>'photo_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    photo_url = EXCLUDED.photo_url,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
