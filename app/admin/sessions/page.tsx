'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  Square,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Layers,
  BookOpen,
  FolderTree,
  Navigation,
  Loader2,
  Check,
  Radio,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttendanceSession, AttendanceLocation, Semester, Course, Section } from '@/types';

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [locationId, setLocationId] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:15');
  const [lateThreshold, setLateThreshold] = useState('08:05');
  const [gpsRadius, setGpsRadius] = useState<number>(50);
  const [sessionDescription, setSessionDescription] = useState('');

  // Automatically derive Day of Week
  const displayDay = attendanceDate
    ? new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    : '--';

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessRes, locRes, semRes, crsRes, secRes] = await Promise.all([
        fetch('/api/admin/sessions'),
        fetch('/api/admin/locations'),
        fetch('/api/admin/semesters'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/sections'),
      ]);

      const [sessData, locData, semData, crsData, secData] = await Promise.all([
        sessRes.json(),
        locRes.json(),
        semRes.json(),
        crsRes.json(),
        secRes.json(),
      ]);

      if (sessData.success) setSessions(sessData.sessions || []);
      if (locData.success && locData.locations) {
        setLocations(locData.locations);
        if (locData.locations.length > 0 && !locationId) {
          setLocationId(locData.locations[0].id);
        }
      }
      if (semData.success && semData.semesters) {
        setSemesters(semData.semesters);
        if (semData.semesters.length > 0 && !selectedSemesterId) {
          const firstSemId = semData.semesters[0].id;
          setSelectedSemesterId(firstSemId);
        }
      }
      if (crsData.success && crsData.courses) setCourses(crsData.courses);
      if (secData.success && secData.sections) setSections(secData.sections);
    } catch (err) {
      console.error('Failed to load session data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update courses & sections dropdown when semester changes
  useEffect(() => {
    if (selectedSemesterId) {
      const semCourses = courses.filter((c) => c.semester_id === selectedSemesterId);
      const semSecs = sections.filter((s) => s.semester_id === selectedSemesterId);

      if (semCourses.length > 0) {
        if (!selectedCourseId || !semCourses.some((c) => c.id === selectedCourseId)) {
          setSelectedCourseId(semCourses[0].id);
        }
      } else {
        setSelectedCourseId('');
      }

      if (semSecs.length > 0) {
        if (!selectedSectionId || !semSecs.some((s) => s.id === selectedSectionId)) {
          setSelectedSectionId(semSecs[0].id);
        }
      } else {
        setSelectedSectionId('');
      }
    }
  }, [selectedSemesterId, courses, sections]);

  const filteredCourses = courses.filter((c) => c.semester_id === selectedSemesterId);
  const filteredSections = sections.filter((s) => s.semester_id === selectedSemesterId);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedSemesterId) {
      setErrorMessage('Please select an academic semester.');
      return;
    }
    if (!selectedCourseId) {
      setErrorMessage('Please select a course for this session.');
      return;
    }
    if (!selectedSectionId) {
      setErrorMessage('Please select a class section.');
      return;
    }
    if (!locationId) {
      setErrorMessage('Please select an authorized attendance location.');
      return;
    }

    setSubmitting(true);

    try {
      const startIso = new Date(`${attendanceDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${attendanceDate}T${endTime}:00`).toISOString();
      const lateIso = new Date(`${attendanceDate}T${lateThreshold}:00`).toISOString();

      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester_id: selectedSemesterId,
          course_id: selectedCourseId,
          section_id: selectedSectionId,
          attendance_date: attendanceDate,
          location_id: locationId,
          start_time: startIso,
          end_time: endIso,
          late_threshold: lateIso,
          gps_radius: Number(gpsRadius),
          session_description: sessionDescription.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Attendance session scheduled successfully!');
        loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to create session.');
      }
    } catch {
      setErrorMessage('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (sessionId: string, action: 'START' | 'CLOSE' | 'CANCEL') => {
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
            <Radio className="w-3 h-3 text-emerald-600" /> ACTIVE
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> SCHEDULED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Square className="w-3 h-3 text-slate-500" /> CLOSED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Attendance Session Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create attendance sessions linked to Academic Semester, Course, Section, and GPS Location with automatic Day derivation and radius enforcement.
          </p>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Creation Form */}
          <div className="lg:col-span-5">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Create Attendance Session
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  Courses and sections automatically filter based on the chosen semester.
                </p>

                <form onSubmit={handleCreateSession} className="space-y-4">
                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Academic Semester
                    </label>
                    <select
                      required
                      value={selectedSemesterId}
                      onChange={(e) => setSelectedSemesterId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="" disabled>
                        Select Semester
                      </option>
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.academic_year})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course & Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Course
                      </label>
                      <select
                        required
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="" disabled>
                          Select Course
                        </option>
                        {filteredCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.course_code} - {c.course_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                        Section
                      </label>
                      <select
                        required
                        value={selectedSectionId}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="" disabled>
                          Select Section
                        </option>
                        {filteredSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date & Day */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Attendance Date
                      </label>
                      <input
                        type="date"
                        required
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Attendance Day
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={displayDay}
                        className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Location & Radius */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        Attendance Location
                      </label>
                      <select
                        required
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="" disabled>
                          Select Location
                        </option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} (±{loc.radius_meters}m)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                        GPS Radius (Metres)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={1000}
                        required
                        value={gpsRadius}
                        onChange={(e) => setGpsRadius(Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Late Threshold
                      </label>
                      <input
                        type="time"
                        required
                        value={lateThreshold}
                        onChange={(e) => setLateThreshold(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 text-center"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Session Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Regular Lecture, Room 302"
                      value={sessionDescription}
                      onChange={(e) => setSessionDescription(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting || locations.length === 0}
                    className="w-full text-xs font-semibold h-10 mt-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    CREATE SESSION
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sessions List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                All Sessions ({sessions.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 bg-white rounded-xl border border-slate-200 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Sessions Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Schedule your first attendance session using the form on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => {
                  const sTime = new Date(s.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const eTime = new Date(s.end_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const lTime = new Date(s.late_threshold).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <Card
                      key={s.id}
                      className={`border-slate-200 transition ${
                        s.status === 'ACTIVE'
                          ? 'ring-2 ring-emerald-500/20 border-emerald-500/50 shadow-sm'
                          : ''
                      }`}
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(s.status)}
                              <span className="text-xs font-semibold text-slate-400">
                                {s.attendance_date} &bull; {s.attendance_day || ''}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-slate-900">{s.subject}</h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {s.semester?.name ? `${s.semester.name} • ` : ''}
                              {s.class_name}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {sTime} – {eTime} (Late: {lTime})
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {s.location?.name || 'Classroom'} (±{s.gps_radius || 50}m)
                              </span>
                            </div>

                            {s.session_description && (
                              <p className="text-xs text-slate-400 italic pt-1">
                                &ldquo;{s.session_description}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Control Buttons */}
                          <div className="flex sm:flex-col gap-2 shrink-0">
                            {s.status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAction(s.id, 'START')}
                                className="text-xs gap-1 h-8 bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Start
                              </Button>
                            )}

                            {s.status === 'ACTIVE' && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleAction(s.id, 'CLOSE')}
                                className="text-xs gap-1 h-8"
                              >
                                <Square className="w-3 h-3 fill-current" />
                                Stop Session
                              </Button>
                            )}

                            {s.status !== 'CANCELLED' && s.status !== 'CLOSED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(s.id, 'CANCEL')}
                                className="text-xs gap-1 h-8 text-slate-500 hover:text-rose-600"
                              >
                                <XCircle className="w-3 h-3" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
