import { z } from 'zod';

export const attendanceVerificationSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format' }),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  accuracy: z.number().min(0, 'GPS accuracy must be a non-negative number'),
});

export const locationSchema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters').max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meters: z.number().int().min(5, 'Minimum radius is 5m').max(1000, 'Maximum radius is 1000m'),
  max_accuracy_meters: z.number().int().min(10, 'Minimum accuracy is 10m').max(500, 'Maximum accuracy is 500m'),
  active: z.boolean().default(true),
});

export const sessionSchema = z
  .object({
    subject: z.string().min(2, 'Subject must be at least 2 characters').max(100),
    class_name: z.string().min(1, 'Class name is required').max(50),
    attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    location_id: z.string().uuid('Invalid location ID'),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    late_threshold: z.string().datetime(),
  })
  .refine(
    (data) => new Date(data.start_time) < new Date(data.end_time),
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      const late = new Date(data.late_threshold);
      return late >= start && late <= end;
    },
    {
      message: 'Late threshold must be between start time and end time',
      path: ['late_threshold'],
    }
  );

export const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  usn: z.string().min(2, 'USN must be at least 2 characters').max(30),
  semester: z.string().optional().default(''),
  section: z.string().optional().default(''),
  photo_url: z.string().optional().nullable(),
});

export const manualAttendanceCorrectionSchema = z.object({
  recordId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'NOT_MARKED']),
  reason: z.string().min(3, 'Correction reason is required for audit trail'),
});
