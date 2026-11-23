'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Power,
  Shield,
  FileSpreadsheet,
  Camera,
  Trash2,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile } from '@/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Single student form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [usn, setUsn] = useState('');
  const [semester, setSemester] = useState('5');
  const [section, setSection] = useState('A');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV import
  const [csvText, setCsvText] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      if (data.success && data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setUsn('');
    setSemester('5');
    setSection('A');
    setPhotoUrl(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (st: Profile) => {
    setEditingId(st.id);
    setName(st.name);
    setEmail(st.email);
    setUsn(st.usn || '');
    setSemester(st.semester || '5');
    setSection(st.section || 'A');
    setPhotoUrl(st.photo_url || null);
    setFormError(null);
    setModalOpen(true);
  };

  // Process image and convert to compact Base64 Data URL
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale to max 300x300 for optimal storage & speed
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoUrl(dataUrl);
          setFormError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name,
          email,
          usn,
          semester,
          section,
          photo_url: photoUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setModalOpen(false);
        fetchStudents();
      } else {
        setFormError(data.message || 'Failed to save student.');
      }
    } catch {
      setFormError('Network request failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_STATUS',
          studentId,
          active: !currentStatus,
        }),
      });
      fetchStudents();
    } catch (err) {
      console.error('Failed to toggle student:', err);
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setCsvLoading(true);
    setCsvResult(null);

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_CSV',
          csvText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCsvResult(data.message);
        fetchStudents();
        setTimeout(() => {
          setCsvModalOpen(false);
        }, 1500);
      } else {
        setCsvResult(data.message || 'Import failed.');
      }
    } catch {
      setCsvResult('CSV upload network error.');
    } finally {
      setCsvLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (st) =>
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      (st.usn && st.usn.toLowerCase().includes(search.toLowerCase())) ||
      st.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Roster ({students.length})
          </h1>
          <p className="text-xs text-slate-500">
            Manage real enrolled students, photos, USN mappings, and active statuses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCsvModalOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            Bulk CSV Import
          </Button>

          <Button size="sm" variant="primary" onClick={handleOpenAdd} className="gap-1.5 text-xs">
            <UserPlus className="w-3.5 h-3.5" />
            Add Single Student
          </Button>
        </div>
      </div>

      {/* Search & List Card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name, USN, or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <span className="text-xs text-slate-500 font-mono">
            Showing {filteredStudents.length} of {students.length} students
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">USN</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    {students.length === 0 ? (
                      <div>
                        <p className="font-semibold text-slate-700">No students registered yet.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Single Student" above to enroll your first student with their photo!
                        </p>
                      </div>
                    ) : (
                      'No matching students found.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {st.photo_url ? (
                          <img
                            src={st.photo_url}
                            alt={st.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {st.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span>{st.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Sem {st.semester || '5'} - Sec {st.section || 'A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{st.usn || '--'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{st.email}</td>
                    <td className="py-3 px-4 text-slate-600">
                      Sem {st.semester || '5'} - Sec {st.section || 'A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          st.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                          title="Edit Student & Photo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(st.id, st.active)}
                          className={`p-1.5 rounded transition ${
                            st.active
                              ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                              : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                          }`}
                          title={st.active ? 'Deactivate Student' : 'Activate Student'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Student Modal with Photo Upload */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base">
              {editingId ? 'Edit Student Details' : 'Add New Student'}
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              {/* Photo Upload Section */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full bg-slate-200 border-2 border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="font-semibold text-slate-800 text-xs">Student Photo</div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="student-photo-file"
                    />
                    <label
                      htmlFor="student-photo-file"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      {photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </label>

                    {photoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    JPG, PNG, or Camera capture
                  </span>
                </div>
              </div>

              <Input
                label="Full Name"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="College Email"
                type="email"
                required
                placeholder="e.g. student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="University Seat Number (USN)"
                required
                placeholder="e.g. 1MS21CS001"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Semester"
                  placeholder="5"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
                <Input
                  label="Section"
                  placeholder="A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button size="sm" variant="outline" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" isLoading={formLoading}>
                  {editingId ? 'Update Student' : 'Add Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Bulk CSV Student Import
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Paste standard CSV rows with columns: <code>name,usn,email,semester,section</code>
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="name,usn,email,semester,section&#10;Alice Smith,USN001,alice@college.edu,5,A&#10;Bob Jones,USN002,bob@college.edu,5,A"
              className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            {csvResult && (
              <div className="p-3 bg-indigo-50 text-indigo-800 rounded-lg text-xs font-semibold">
                {csvResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setCsvModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleImportCsv} isLoading={csvLoading}>
                Import All Students
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
