'use client';

import React, { useState, useEffect } from 'react';
import { Semester } from '@/types';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Users,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/semesters');
      const data = await res.json();
      if (data.success) {
        setSemesters(data.semesters || []);
      } else {
        setError(data.message || 'Failed to load semesters');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSemester(null);
    setSemesterNumber(1);
    setName('1st Semester');
    setAcademicYear('2026-2027');
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (sem: any) => {
    setEditingSemester(sem);
    setSemesterNumber(sem.semester_number);
    setName(sem.name);
    setAcademicYear(sem.academic_year);
    setActive(sem.active);
    setShowModal(true);
  };

  const handleSemesterNumberChange = (num: number) => {
    setSemesterNumber(num);
    const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    if (!editingSemester) {
      setName(`${ordinals[num] || num + 'th'} Semester`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const payload: any = {
        semester_number: Number(semesterNumber),
        name: name.trim(),
        academic_year: academicYear.trim(),
        active,
      };
      if (editingSemester) {
        payload.id = editingSemester.id;
      }

      const res = await fetch('/api/admin/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(editingSemester ? 'Semester updated successfully' : 'Semester created successfully');
        setShowModal(false);
        loadSemesters();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to save semester');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (semesterId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_STATUS',
          semesterId,
          active: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSemesters((prev) =>
          prev.map((s) => (s.id === semesterId ? { ...s, active: !currentStatus } : s))
        );
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              Semester Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure academic semesters (1st to 8th), manage academic years, and view student allocations.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Semester
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

        {/* Semesters Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading academic semesters...</p>
          </div>
        ) : semesters.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Semesters Configured</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by adding academic semesters (1st to 8th) for your college classes.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              Add First Semester
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {semesters.map((sem) => (
              <div
                key={sem.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">
                      {sem.semester_number}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(sem.id, sem.active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 transition ${
                        sem.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {sem.active ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{sem.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Academic Year: {sem.academic_year}</p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sem.courseCount || 0} Courses</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{sem.studentCount || 0} Students</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(sem)}
                    className="text-xs text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1 p-1 hover:bg-slate-50 rounded transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create / Edit Semester */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingSemester ? 'Edit Semester' : 'Add New Semester'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Enter academic semester details and status.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Number (1 to 8)
                </label>
                <select
                  value={semesterNumber}
                  onChange={(e) => handleSemesterNumberChange(Number(e.target.value))}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      Semester {num}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 5th Semester"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="semesterActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="semesterActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Activate semester for current academic period
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
                  {editingSemester ? 'Save Changes' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
