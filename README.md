# GPS-Based Student Attendance Management System

A production-ready, mobile-first Progressive Web Application (PWA) built for college classroom attendance management, completely replacing manual roll calls and WhatsApp attendance messages with real-time geofenced location verification.

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
Real-Time GPS Location (Accuracy Threshold Verified)
        ↓
Server Distance <= Configured Radius (Haversine Formula)
        ↓
Attendance Accepted (PRESENT or LATE)
```

- **Zero Dummy Data**: Starts clean with no fake students, fake locations, or fake attendance logs. All data added is 100% real and persisted.
- **Real-Time Device GPS**: Geolocation is obtained directly from the browser's `navigator.geolocation` in high-accuracy mode (`enableHighAccuracy: true`, `maximumAge: 0`). Distance is computed **strictly server-side** using the Haversine formula against the classroom coordinates.
- **Student Photo Support**: When adding or editing students, photos can be uploaded from files or captured directly via device camera, with automatic client-side optimization and rendering across rosters and attendance screens.
- **Data Minimization & Privacy**: Zero background tracking. Location is requested for only 1 second when the student presses the "MARK ATTENDANCE" button.

---

## 2. Key Features

### For Students
- **Mobile-First Experience**: 1-click attendance flow designed for smartphones.
- **Student Profile & Photo**: Student name, USN, and profile photo displayed in portal.
- **Today's Active Session**: Displays subject, classroom name, start/end time, and permitted radius.
- **Instant GPS Feedback**: Displays real live coordinates, accuracy, and server-calculated distance from classroom.
- **Attendance Percentage & History**: Visualizes attendance percentage `(Present + Late) / Total Conducted × 100`, presence breakdown (Present, Late, Absent), and historical logs.
- **Installable PWA**: Installable on Android and iOS homescreens with offline fallback.

### For Admin / Teachers
- **Live Real-Time Dashboard**: Real-time KPI cards (`Total Students`, `Present`, `Late`, `Not Marked`) and auto-refreshing live attendance roster with student photo avatars.
- **Student Management with Photos**: Enroll students with name, email, USN, semester, section, and photo. Edit details, toggle active/inactive status, or bulk import via CSV.
- **Interactive Map Location Management**: Define authorized locations on an interactive OpenStreetMap component or click **"Use Current GPS Location"** to geofence your current physical classroom.
- **Session Management**: Schedule or instantly start/close attendance windows with configurable start time, end time, and late threshold.
- **Manual Attendance Correction**: Safely correct a student's status with mandatory audit logging and reason recording.
- **Comprehensive Reports**: Daily session reports, student-wise percentage tables, eligibility status (<75% shortage alert), and CSV export.

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Map & Geofencing**: Leaflet + OpenStreetMap client components with dynamic geofence radius rendering.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) policies, Realtime, and UUID primary keys. Also supports standalone persistent local file storage (`data/attendance-db.json`) when Supabase credentials are not yet configured.
- **Validation**: Zod schema validation for all API inputs, student photos, and coordinate ranges.
- **PWA**: Web App Manifest (`manifest.json`), custom service worker (`sw.js`), and offline fallback page.

---

## 4. Getting Started & Local Development

### Prerequisites
- Node.js 18.18+ or 20+ (Node 22 supported)
- npm 9+

### Running the Application

1. Open your terminal and navigate to the project directory:
   ```bash
   cd ~/attendence-system
   ```

2. Run the application in development mode:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Or build and run in production mode:
   ```bash
   npm run build
   npm run start
   ```

---

## 5. Initial Setup (Clean Slate - No Dummy Data)

When launching the application for the first time:
1. Open [http://localhost:3000/login](http://localhost:3000/login).
2. The system will detect that no administrator exists and prompt you to create your real **Administrator account** (Name, Email, Password).
3. Once logged in as Admin:
   - Go to **Locations** and click **"Use Current GPS Location"** (or click on the map) to set your actual classroom location and geofence radius (e.g. 50 metres).
   - Go to **Students** to add your real students with their **photo**, USN, and email.
   - Go to **Sessions** to create a session and click **"Start Attendance"**.
4. Students can log in to [http://localhost:3000/student/dashboard](http://localhost:3000/student/dashboard) on their mobile devices and click **"MARK ATTENDANCE"** when physically inside the classroom radius.

---

## 6. Real-Time GPS & Troubleshooting

- **GPS Permission**: When prompted by your browser, tap **"Allow"** to grant location access.
- **High-Accuracy Mode**: Ensure Location Services on your device are set to High Accuracy.
- **Indoor Environments**: If inside a heavily shielded concrete laboratory, moving near a window or door helps the device establish a fast satellite lock.
- **Accuracy Threshold**: The system rejects GPS signals with accuracy worse than 100 metres (e.g. coarse cell-tower estimates) to ensure physical presence.
