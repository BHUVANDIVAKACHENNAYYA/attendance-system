'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Filter,
  Search,
  Calendar,
  Layers,
  BookOpen,
  FolderTree,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Edit3,
  Loader2,
  RefreshCw,
  Check,
  Shield,
  User,
} from 'lucide-react';
import { Semester, Course, Section, AttendanceSession } from '@/types';

export default function AdminAttendanceMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Metadata
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Data states
  const [session, setSession] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    late: 0,
    notMarked: 0,
  });
  const [rows, setRows] = useState<any[]>([]);

  // Manual correction modal state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT'>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [semRes, crsRes, secRes] = await Promise.all([
        fetch('/api/admin/semesters'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/sections'),
      ]);
      const semData = await semRes.json();
      const crsData = await crsRes.json();
      const secData = await secRes.json();

      if (semData.success) setSemesters(semData.semesters || []);
      if (crsData.success) setCourses(crsData.courses || []);
      if (secData.success) setSections(secData.sections || []);
    } catch (err) {
      console.error('Failed to load filter metadata:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (selectedSemesterId !== 'ALL') params.set('semesterId', selectedSemesterId);
      if (selectedCourseId !== 'ALL') params.set('courseId', selectedCourseId);
      if (selectedSectionId !== 'ALL') params.set('sectionId', selectedSectionId);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedSessionId) params.set('sessionId', selectedSessionId);
      if (searchStudent) params.set('student', searchStudent);

      const res = await fetch(`/api/admin/attendance?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSession(data.session);
        setStats(data.stats || { totalStudents: 0, present: 0, late: 0, notMarked: 0 });
        setRows(data.rows || []);
        if (data.allSessions) {
          setAllSessions(data.allSessions);
        }
      } else {
        setError(data.message || 'Failed to load monitoring data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [
    selectedDate,
    selectedSemesterId,
    selectedCourseId,
    selectedSectionId,
    selectedStatus,
    selectedSessionId,
    searchStudent,
  ]);

  const handleOpenCorrection = (row: any) => {
    if (!session) return;
    setTargetStudent(row);
    setNewStatus(row.status === 'NOT_MARKED' ? 'PRESENT' : row.status);
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !targetStudent) return;
    if (!correctionReason.trim()) {
      setError('A valid audit reason is required for manual attendance correction.');
      return;
    }

    try {
      setCorrecting(true);
      setError(null);
      const res = await fetch('/api/admin/attendance/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          studentId: targetStudent.studentId,
          status: newStatus,
          reason: correctionReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Attendance record updated and logged to audit trail.');
        setCorrectionModalOpen(false);
        fetchAttendance();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Correction failed.');
      }
    } catch {
      setError('Network error occurred during correction.');
    } finally {
      setCorrecting(false);
    }
  };

  const getStatusBadge = (status: string, locationVerified: boolean) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Late
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Not Marked
          </span>
        );
    }
  };

  const filteredCourses =
    selectedSemesterId === 'ALL'
      ? courses
      : courses.filter((c) => c.semester_id === selectedSemesterId);

  const filteredSections =
    selectedSemesterId === 'ALL'
      ? sections
      : sections.filter((s) => s.semester_id === selectedSemesterId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Radio className="w-6 h-6 text-indigo-600 animate-pulse" />
              Live Attendance Monitoring
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time attendance tracking with Haversine GPS verification distance, timestamp logs, and authorized manual correction.
            </p>
          </div>
          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Attendance Filters
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Semester</label>
              <select
                value={selectedSemesterId}
                onChange={(e) => {
                  setSelectedSemesterId(e.target.value);
                  setSelectedCourseId('ALL');
                  setSelectedSectionId('ALL');
                }}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Semesters</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Courses</option>
                {filteredCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Sections</option>
                {filteredSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Sec {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Session</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Default / Active</option>
                {allSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Student Search */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Student</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Name / USN"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current Active / Selected Session Overview Banner */}
        {session ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {session.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {session.attendance_date} &bull; {session.attendance_day || 'Weekday'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{session.subject}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {session.semester?.name ? `${session.semester.name} • ` : ''}
                  {session.class_name}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>
                    {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>
                    {session.location?.name || 'Classroom'} (Allowed Radius: {session.gps_radius || 50}m)
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Summary Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-slate-500">TOTAL STUDENTS</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalStudents}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-emerald-700">PRESENT</div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">{stats.present}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-amber-700">LATE</div>
                <div className="text-2xl font-black text-amber-700 mt-0.5">{stats.late}</div>
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-slate-600">NOT MARKED</div>
                <div className="text-2xl font-black text-slate-700 mt-0.5">{stats.notMarked}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 mb-6 text-center text-slate-400">
            <Radio className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No session selected or active</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a session from the dropdown above to view live monitoring.
            </p>
          </div>
        )}

        {/* Live Attendance Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Live Attendance Roster ({rows.length})
            </h3>
            <span className="text-xs text-slate-400">
              Showing students matching current session & filters
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Fetching live attendance...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">No student records found for the selected session.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">No.</th>
                    <th className="px-5 py-3.5">Student Name</th>
                    <th className="px-5 py-3.5">USN</th>
                    <th className="px-5 py-3.5">Marked Time</th>
                    <th className="px-5 py-3.5">GPS Distance</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{row.no}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {row.photoUrl ? (
                            <img
                              src={row.photoUrl}
                              alt={row.studentName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">
                              {row.studentName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{row.studentName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700">
                        {row.usn}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {row.markedTime}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {row.distance !== '--' ? (
                          <span
                            className={`font-mono font-semibold ${
                              row.rawDistance !== null && row.rawDistance <= (session?.gps_radius || 50)
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {row.distance}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(row.status, row.locationVerified)}
                          {row.locationVerified && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              GPS Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCorrection(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition shadow-xs"
                          title="Authorized Manual Correction"
                        >
                          <Edit3 className="w-3 h-3" />
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Manual Attendance Correction with Audit Reason */}
      {correctionModalOpen && targetStudent && session && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Manual Attendance Correction
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              All manual changes are permanently timestamped and logged in the system audit trail.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4 text-xs space-y-1">
              <div>
                <span className="text-slate-500">Student:</span>{' '}
                <span className="font-bold text-slate-800">{targetStudent.studentName}</span> (
                {targetStudent.usn})
              </div>
              <div>
                <span className="text-slate-500">Session:</span>{' '}
                <span className="font-semibold text-slate-800">{session.subject}</span>
              </div>
              <div>
                <span className="text-slate-500">Current Status:</span>{' '}
                <span className="font-bold">{targetStudent.status}</span>
              </div>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Attendance Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRESENT', 'LATE', 'ABSENT'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                        newStatus === st
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Student was present in class; device had GPS sensor glitch, verified by teacher."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correcting || !correctionReason.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {correcting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
