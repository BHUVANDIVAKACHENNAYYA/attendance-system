'use client';

import React, { useState, useEffect } from 'react';
import { Course, Semester } from '@/types';
import {
  BookOpen,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  Users,
  AlertCircle,
  Check,
  Search,
} from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [coursesRes, semestersRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/semesters'),
      ]);

      const coursesData = await coursesRes.json();
      const semestersData = await semestersRes.json();

      if (coursesData.success) {
        setCourses(coursesData.courses || []);
      }
      if (semestersData.success) {
        setSemesters(semestersData.semesters || []);
        if (semestersData.semesters?.length > 0 && !semesterId) {
          setSemesterId(semestersData.semesters[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setCourseCode('');
    setCourseName('');
    if (semesters.length > 0) {
      setSemesterId(selectedSemester !== 'ALL' ? selectedSemester : semesters[0].id);
    }
    setDescription('');
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (course: any) => {
    setEditingCourse(course);
    setCourseCode(course.course_code);
    setCourseName(course.course_name);
    setSemesterId(course.semester_id);
    setDescription(course.description || '');
    setActive(course.active);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterId) {
      setError('Please select an academic semester.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload: any = {
        course_code: courseCode.trim().toUpperCase(),
        course_name: courseName.trim(),
        semester_id: semesterId,
        description: description.trim() || null,
        active,
      };
      if (editingCourse) {
        payload.id = editingCourse.id;
      }

      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(editingCourse ? 'Course updated successfully' : 'Course created successfully');
        setShowModal(false);
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to save course');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_STATUS',
          courseId,
          active: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, active: !currentStatus } : c))
        );
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (selectedSemester !== 'ALL' && c.semester_id !== selectedSemester) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.course_code.toLowerCase().includes(q) ||
        c.course_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Course Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create courses, assign course codes (e.g. EC501), map to semesters, and monitor student enrollments.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>

        {/* Notifications */}
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

        {/* Filters bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5" />
              Filter by Semester:
            </div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Semesters</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Courses Table / Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading course catalog...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Courses Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {courses.length === 0
                ? 'Create courses like EC501 Digital Electronics and assign them to semesters.'
                : 'No courses match the selected semester or search filters.'}
            </p>
            {courses.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                Add First Course
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Course Code</th>
                    <th className="px-6 py-3.5">Course Title</th>
                    <th className="px-6 py-3.5">Semester</th>
                    <th className="px-6 py-3.5">Enrolled</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {c.course_code}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {c.course_name}
                        {c.description && (
                          <p className="text-xs font-normal text-slate-400 mt-0.5 line-clamp-1">
                            {c.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {c.semester?.name || 'Semester'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {c.enrolledCount || 0} Students
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(c.id, c.active)}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 transition ${
                            c.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {c.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="text-xs text-slate-600 hover:text-indigo-600 font-medium inline-flex items-center gap-1 p-1 hover:bg-slate-100 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create / Edit Course */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingCourse ? 'Edit Course' : 'Create Course'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Define the course code, subject name, and target semester.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Academic Semester
                </label>
                <select
                  required
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Code (e.g. EC501, CS301)
                </label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. EC501"
                  className="w-full text-sm font-mono uppercase border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Digital Electronics"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Teacher Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Instructor: Dr. Sharma, Lab Hall 3"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="courseActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="courseActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Course is currently offered and active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
