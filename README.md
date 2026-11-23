# GPS-Based Student Attendance Management System

A production-ready, mobile-first Progressive Web Application (PWA) built for a college classroom (approx. 17 students) to eliminate manual roll calls and WhatsApp attendance messages. The system requires students to verify their presence within an authorized geofenced radius (e.g. 50 metres) of the classroom during an active attendance session.

---

## 1. Project Overview & Core Rule

The attendance engine enforces strict multi-factor verification:

```text
Authenticated Student
        +
Active Attendance Session
        +
Current Time Within Attendance Window (Server Time)
        +
Valid GPS Location (Accuracy Threshold Verified)
        ↓
Server Distance <= Configured Radius (Haversine Formula)
        ↓
Attendance Accepted (PRESENT or LATE)
```

- **Rejection if outside radius**: If student distance > configured radius (e.g. in cafeteria or hostel), attendance is immediately rejected with distance feedback.
- **Rejection if expired**: If server time > session end time, attendance is rejected.
- **No manual coordinate spoofing**: Coordinates are obtained strictly via the browser's `navigator.geolocation` API in high-accuracy mode. Distance calculation is computed **server-side**.
- **Data Minimization & Privacy**: Zero background tracking. Location is requested for only 1 second when the student presses the "MARK ATTENDANCE" button.

---

## 2. Key Features

### For Students
- **Mobile-First Experience**: 1-click attendance flow designed for smartphones.
- **Today's Active Session**: Displays subject, classroom name, start/end time, and permitted radius.
- **Instant GPS Feedback**: Displays server-calculated distance from classroom and verification badge.
- **Attendance Percentage & History**: Visualizes attendance percentage `(Present + Late) / Total Conducted × 100`, presence breakdown (Present, Late, Absent), and historical logs.
- **Installable PWA**: Installable on Android and iOS homescreens with offline fallback.

### For Admin / Teachers
- **Live Real-Time Dashboard**: Top KPI cards (Total Students: 17, Present, Late, Not Marked) and auto-refreshing live attendance roster.
- **Session Management**: Schedule or instantly start/stop attendance windows with configurable start time, end time, and late threshold.
- **Interactive Map Location Management**: Select locations on an interactive Leaflet map, use the device's current location, and configure circular geofence radiuses (e.g. 50m) and GPS accuracy thresholds.
- **Student Roster & CSV Import**: Manage the 17 students, toggle active status, and perform 1-click bulk CSV imports.
- **Manual Attendance Correction**: Safely correct a student's status with mandatory audit logging and reason recording.
- **Comprehensive Reports**: Daily session reports, student-wise percentage tables, eligibility status (<75% shortage alert), and CSV export.

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Map & Geofencing**: Leaflet + OpenStreetMap client components with dynamic geofence radius rendering.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) policies, Realtime, and UUID primary keys.
- **Validation**: Zod schema validation for all API inputs and coordinate ranges.
- **PWA**: Web App Manifest (`manifest.json`), custom service worker (`sw.js`), and offline fallback page.

---

## 4. Database Schema & RLS

The database consists of 5 core tables defined in `supabase/migrations/20261123_init.sql`:

1. `profiles`: `id`, `name`, `email`, `role` (`ADMIN` | `STUDENT`), `usn`, `semester`, `section`, `active`, timestamps.
2. `attendance_locations`: `id`, `name`, `latitude`, `longitude`, `radius_meters`, `max_accuracy_meters`, `active`, timestamps.
3. `attendance_sessions`: `id`, `subject`, `class_name`, `attendance_date`, `location_id`, `start_time`, `end_time`, `late_threshold`, `status` (`SCHEDULED` | `ACTIVE` | `CLOSED` | `EXPIRED`), `created_by`, timestamps.
4. `attendance_records`: `id`, `session_id`, `student_id`, `marked_at`, `student_latitude`, `student_longitude`, `gps_accuracy_meters`, `distance_from_location_meters`, `location_verified`, `status` (`PRESENT` | `LATE` | `ABSENT` | `NOT_MARKED` | `REJECTED_LOCATION` | `REJECTED_TIME`), `verification_message`, timestamps.
   - **Constraint**: `UNIQUE(session_id, student_id)` prevents double marking.
5. `audit_logs`: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`.

---

## 5. Getting Started & Local Development

### Prerequisites
- Node.js 18.18+ or 20+ (Node 22 supported)
- npm 9+

### Installation
1. Clone the repository and navigate to the project root:
   ```bash
   cd attendence-system
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *(Note: The system includes a built-in mock store that runs seamlessly out-of-the-box for evaluation with the 17 demo students and admin even before connecting Supabase).*

3. Run automated tests:
   ```bash
   npm test
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 6. Pre-Configured Demo Accounts

For rapid testing and evaluation, 1-click account switching is available on the `/login` screen:

| Role | Name | Email | USN |
|---|---|---|---|
| **Admin / Teacher** | Prof. Ramesh Sharma | `admin@college.edu` | Admin |
| **Student 1** | Arun Kumar | `arun.kumar@demo.college.edu` | USN001 |
| **Student 2** | Bhavya S. | `bhavya.s@demo.college.edu` | USN002 |
| **Student 3** | Chetan Rao | `chetan.rao@demo.college.edu` | USN003 |
| **Student 4** | Divya Murthy | `divya.murthy@demo.college.edu` | USN004 |
| ... | *(17 demo students total)* | ... | USN017 |

A sample CSV for bulk importing the 17 students is located at:
`public/sample-students-17.csv`

---

## 7. Connecting to Supabase (Production Setup)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard and run the migration script:
   - `supabase/migrations/20261123_init.sql`
3. Optional: Run `supabase/seed.sql` to populate default classroom locations.
4. Copy your project credentials from **Project Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Paste them into `.env.local`.

---

## 8. GPS Permissions & Mobile Troubleshooting

- **Android Chrome / iOS Safari**: When clicking "MARK ATTENDANCE", tap **"Allow"** when prompted for location access.
- **High-Accuracy Mode**: Ensure Location Services on the device are set to High Accuracy (GPS enabled).
- **Indoor Attenuation**: If inside a thick concrete laboratory, moving near a classroom window or door significantly improves GPS satellite lock.
- **Accuracy Rejection**: The server rejects signals with accuracy > 100 metres (e.g. coarse cell-tower triangulation) to guarantee presence verification.

---

## 9. Security Considerations

- **Server-Side Distance Calculation**: Distance is never calculated on the client; the client sends raw coordinates and the server calculates the Haversine distance against the classroom coordinates stored in the database.
- **Server-Side Time Verification**: The server timestamp is the single source of truth for checking if the window has expired and whether attendance is `PRESENT` or `LATE`. Manipulating device clocks has zero effect.
- **Protected Service Role**: The `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side route handlers and is never sent to the browser.
- **Row Level Security (RLS)**: Students are restricted by PostgreSQL policies to only view their own attendance records.
