'use client';

import React, { useState, useEffect } from 'react';
import { Section, Semester } from '@/types';
import {
  FolderTree,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  Users,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function SectionsPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [name, setName] = useState('A');
  const [semesterId, setSemesterId] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [secRes, semRes] = await Promise.all([
        fetch('/api/admin/sections'),
        fetch('/api/admin/semesters'),
      ]);

      const secData = await secRes.json();
      const semData = await semRes.json();

      if (secData.success) {
        setSections(secData.sections || []);
      }
      if (semData.success) {
        setSemesters(semData.semesters || []);
        if (semData.semesters?.length > 0 && !semesterId) {
          setSemesterId(semData.semesters[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSection(null);
    setName('A');
    if (semesters.length > 0) {
      setSemesterId(selectedSemester !== 'ALL' ? selectedSemester : semesters[0].id);
    }
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (sec: any) => {
    setEditingSection(sec);
    setName(sec.name);
    setSemesterId(sec.semester_id);
    setActive(sec.active);
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
        name: name.trim().toUpperCase(),
        semester_id: semesterId,
        active,
      };
      if (editingSection) {
        payload.id = editingSection.id;
      }

      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(editingSection ? 'Section updated successfully' : 'Section created successfully');
        setShowModal(false);
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to save section');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (sectionId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_STATUS',
          sectionId,
          active: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSections((prev) =>
          prev.map((s) => (s.id === sectionId ? { ...s, active: !currentStatus } : s))
        );
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredSections = sections.filter((s) => {
    if (selectedSemester !== 'ALL' && s.semester_id !== selectedSemester) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FolderTree className="w-6 h-6 text-indigo-600" />
              Section Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Organize class sections (e.g. Section A, B) mapped to academic semesters.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Section
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

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex items-center gap-3">
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

        {/* Sections Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading sections...</p>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <FolderTree className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Sections Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Add class sections such as Section A or B for each semester.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              Add First Section
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredSections.map((sec) => (
              <div
                key={sec.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-xs">
                      {sec.name}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(sec.id, sec.active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 transition ${
                        sec.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {sec.active ? (
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

                  <h3 className="text-base font-bold text-slate-900">Section {sec.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sec.semester?.name || 'Assigned Semester'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{sec.studentCount || 0} Students Assigned</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(sec)}
                    className="text-xs text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1 p-1 hover:bg-slate-50 rounded transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create / Edit Section */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingSection ? 'Edit Section' : 'Create Section'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Specify the section identifier and academic semester.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Semester
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
                  Section Name / Letter (e.g. A, B, C)
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="e.g. A"
                  className="w-full text-sm uppercase font-bold border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sectionActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="sectionActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Section is active
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
                  {editingSection ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
