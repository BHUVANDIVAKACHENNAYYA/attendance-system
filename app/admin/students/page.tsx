'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Power,
  FileSpreadsheet,
  Camera,
  Trash2,
  User,
  Filter,
  BookOpen,
  Loader2,
  Check,
  KeyRound,
  Copy,
  Lock,
  Mail,
  RefreshCw,
  ExternalLink,
  Send,
  Inbox,
  Settings,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile, Semester, Section, Course } from '@/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Single student form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [usn, setUsn] = useState('');
  const [initialPassword, setInitialPassword] = useState('Pass@1234');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Outbox / Email Dispatch Log
  const [outgoingEmails, setOutgoingEmails] = useState<any[]>([]);
  const [outboxModalOpen, setOutboxModalOpen] = useState(false);

  // Credential Issued Modal
  const [issuedData, setIssuedData] = useState<{
    name: string;
    email: string;
    usn: string;
    temporaryPassword: string;
    mailtoUrl?: string;
    webmailGmailUrl?: string;
    sent?: boolean;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [directSending, setDirectSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Email / SMTP Settings Modal
  const [emailSettingsModalOpen, setEmailSettingsModalOpen] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('bhuvansondabhvi@gmail.com');
  const [smtpPass, setSmtpPass] = useState('');
  const [senderName, setSenderName] = useState('GPS Attendance System');
  const [senderEmail, setSenderEmail] = useState('bhuvansondabhvi@gmail.com');
  const [smtpPassConfigured, setSmtpPassConfigured] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Auto-close modal when credentials have already been delivered directly via background SMTP
  useEffect(() => {
    if (issuedData?.sent) {
      const timer = setTimeout(() => {
        setIssuedData(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [issuedData]);

  // Reset Password Modal
  const [resetModalStudent, setResetModalStudent] = useState<any | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('Pass@1234');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Delete Student Modal
  const [deleteModalStudent, setDeleteModalStudent] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV import
  const [csvText, setCsvText] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    loadEmailSettings();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [stuRes, semRes, secRes, crsRes] = await Promise.all([
        fetch('/api/admin/students'),
        fetch('/api/admin/semesters'),
        fetch('/api/admin/sections'),
        fetch('/api/admin/courses'),
      ]);

      const stuData = await stuRes.json();
      const semData = await semRes.json();
      const secData = await secRes.json();
      const crsData = await crsRes.json();

      if (stuData.success) {
        setStudents(stuData.students || []);
        setOutgoingEmails(stuData.outgoingEmails || []);
      }
      if (semData.success) setSemesters(semData.semesters || []);
      if (secData.success) setSections(secData.sections || []);
      if (crsData.success) setCourses(crsData.courses || []);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setUsn('');
    setInitialPassword('Pass@1234');
    const defaultSem = semesters[0]?.id || '';
    setSelectedSemesterId(defaultSem);

    // Auto set default section and all courses for that semester
    const availableSections = sections.filter((s) => s.semester_id === defaultSem);
    setSelectedSectionId(availableSections[0]?.id || '');

    const semCourses = courses.filter((c) => c.semester_id === defaultSem).map((c) => c.id);
    setSelectedCourseIds(semCourses);

    setPhotoUrl(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (st: any) => {
    setEditingId(st.id);
    setName(st.name);
    setEmail(st.email);
    setUsn(st.usn || '');

    const semId = st.semester_id || (semesters.find((s) => String(s.semester_number) === st.semester)?.id) || '';
    setSelectedSemesterId(semId);

    const secId = st.section_id || (sections.find((s) => s.name === st.section && s.semester_id === semId)?.id) || '';
    setSelectedSectionId(secId);

    const enrolledIds = (st.enrolled_courses || []).map((c: any) => c.id);
    setSelectedCourseIds(enrolledIds);

    setPhotoUrl(st.photo_url || null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSemesterChange = (newSemId: string) => {
    setSelectedSemesterId(newSemId);
    // Auto-filter sections for this semester
    const semSecs = sections.filter((s) => s.semester_id === newSemId);
    setSelectedSectionId(semSecs[0]?.id || '');
    // Auto-select courses for this semester
    const semCourses = courses.filter((c) => c.semester_id === newSemId).map((c) => c.id);
    setSelectedCourseIds(semCourses);
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
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

    const semObj = semesters.find((s) => s.id === selectedSemesterId);
    const secObj = sections.find((s) => s.id === selectedSectionId);

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name: name.trim(),
          email: email.trim(),
          usn: usn.trim(),
          semester_id: selectedSemesterId || null,
          section_id: selectedSectionId || null,
          semester: semObj ? String(semObj.semester_number) : '5',
          section: secObj ? secObj.name : 'A',
          photo_url: photoUrl,
          course_ids: selectedCourseIds,
          initial_password: initialPassword || 'Pass@1234',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setModalOpen(false);
        loadAllData();
        if (!editingId) {
          // Show credential issue slip modal for new students
          const isSent = Boolean(data.emailDispatch?.sent);
          setIssuedData({
            name: name.trim(),
            email: email.trim(),
            usn: usn.trim(),
            temporaryPassword: data.temporaryPassword || initialPassword || 'Pass@1234',
            mailtoUrl: data.emailDispatch?.mailtoUrl || `mailto:${email.trim()}?subject=${encodeURIComponent('Your GPS Student Attendance Portal Credentials')}&body=${encodeURIComponent(`Dear ${name.trim()},\n\nYour student account has been registered.\nLogin Email: ${email.trim()}\nUSN: ${usn.trim()}\nTemporary Password: ${data.temporaryPassword || initialPassword || 'Pass@1234'}\n\nPlease sign in at http://localhost:3000/login`)}`,
            webmailGmailUrl: data.emailDispatch?.webmailGmailUrl,
            sent: isSent,
            message: data.emailDispatch?.message || '',
          });

          if (isSent) {
            setToastMessage(`✓ Account created & email directly delivered to ${email.trim()}!`);
            setTimeout(() => setToastMessage(null), 4000);
          }
        }
      } else {
        setFormError(data.message || 'Failed to save student.');
      }
    } catch {
      setFormError('Network request failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!issuedData) return;
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://college-portal.edu/login';
    const text = `GPS Student Attendance Management Portal
------------------------------------------------
Student Name:       ${issuedData.name}
University Seat No: ${issuedData.usn}
Official Email:     ${issuedData.email}
Temporary Password: ${issuedData.temporaryPassword}
Login URL:          ${portalUrl}

* Instructions: Sign in at the link above using your email and temporary password. You can change your password anytime under your Student Profile.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;
    setResetLoading(true);
    setResetMessage(null);

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          studentId: resetModalStudent.id,
          newPassword: resetPasswordInput.trim() || 'Pass@1234',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResetMessage(data.message);
        setTimeout(() => {
          setResetModalStudent(null);
          setResetMessage(null);
          loadAllData();
        }, 1500);
      } else {
        setResetMessage(data.message || 'Failed to reset password');
      }
    } catch {
      setResetMessage('Network error resetting password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteStudentSubmit = async () => {
    if (!deleteModalStudent) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/students?studentId=${deleteModalStudent.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteModalStudent(null);
        loadAllData();
      } else {
        setDeleteError(data.message || 'Failed to remove student');
      }
    } catch {
      setDeleteError('Network error while removing student');
    } finally {
      setDeleteLoading(false);
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
      loadAllData();
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
        loadAllData();
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

  const loadEmailSettings = async () => {
    try {
      const res = await fetch('/api/admin/email-settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSmtpHost(data.settings.smtpHost || 'smtp.gmail.com');
        setSmtpPort(String(data.settings.smtpPort || 465));
        setSmtpUser(data.settings.smtpUser || 'bhuvansondabhvi@gmail.com');
        setSenderName(data.settings.senderName || 'GPS Attendance System');
        setSenderEmail(data.settings.senderEmail || 'bhuvansondabhvi@gmail.com');
        setSmtpPassConfigured(Boolean(data.settings.smtpPassConfigured));
      }
    } catch (err) {
      console.error('Failed to load email settings:', err);
    }
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPass,
          senderName,
          senderEmail,
          directSendEnabled: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage('Settings saved successfully!');
        setSmtpPassConfigured(true);
        setTimeout(() => {
          setEmailSettingsModalOpen(false);
          setSettingsMessage(null);
        }, 1500);
      } else {
        setSettingsMessage(data.error || 'Failed to save settings');
      }
    } catch {
      setSettingsMessage('Network error saving settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testRecipient) {
      setTestResultMsg('Please enter a recipient email to send the test.');
      return;
    }
    setTestingSmtp(true);
    setTestResultMsg(null);
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPass,
          senderName,
          senderEmail,
          testRecipient,
        }),
      });
      const data = await res.json();
      if (data.testResult?.success) {
        setTestResultMsg(`✓ Test email delivered directly to ${testRecipient}!`);
      } else {
        setTestResultMsg(`Failed: ${data.testResult?.error || data.error || 'Could not connect to SMTP'}`);
      }
    } catch {
      setTestResultMsg('Network error testing SMTP');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleDirectSendAndClose = async () => {
    if (!issuedData) return;
    setDirectSending(true);

    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: issuedData.email,
          studentName: issuedData.name,
          usn: issuedData.usn,
          temporaryPassword: issuedData.temporaryPassword,
        }),
      });
      const data = await res.json();

      if (data.result?.sent) {
        setToastMessage(`✓ Email directly sent to ${issuedData.email}!`);
      } else {
        // If direct SMTP is not yet configured, trigger Gmail web or default client so student gets it without delay
        const gmailUrl = issuedData.webmailGmailUrl || data.result?.webmailGmailUrl;
        if (gmailUrl) {
          window.open(gmailUrl, '_blank');
        } else if (issuedData.mailtoUrl) {
          window.location.href = issuedData.mailtoUrl;
        }
        setToastMessage(`Dispatched credentials for ${issuedData.email}`);
      }
    } catch {
      if (issuedData.mailtoUrl) {
        window.location.href = issuedData.mailtoUrl;
      }
      setToastMessage(`Dispatched credentials for ${issuedData.email}`);
    } finally {
      setDirectSending(false);
      // ALWAYS immediately close popup modal!
      setIssuedData(null);
      loadAllData();
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleResendFromOutbox = async (emailItem: any) => {
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailItem.to,
          studentName: emailItem.student_name,
          usn: emailItem.usn,
          temporaryPassword: emailItem.temporary_password,
        }),
      });
      const data = await res.json();
      if (data.result?.sent) {
        setToastMessage(`✓ Sent email directly to ${emailItem.to}`);
      } else {
        if (data.result?.webmailGmailUrl) {
          window.open(data.result.webmailGmailUrl, '_blank');
        } else {
          window.location.href = data.result?.mailtoUrl || `mailto:${emailItem.to}`;
        }
        setToastMessage(`Dispatched credentials for ${emailItem.to}`);
      }
      loadAllData();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = students.filter((st) => {
    if (filterSemester !== 'ALL') {
      const sSemId = st.semester_id || (semesters.find((s) => String(s.semester_number) === st.semester)?.id);
      if (sSemId !== filterSemester) return false;
    }
    if (filterSection !== 'ALL') {
      const sSecId = st.section_id || (sections.find((sec) => sec.name === st.section)?.id);
      if (sSecId !== filterSection) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        (st.usn && st.usn.toLowerCase().includes(q)) ||
        st.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableSectionsForForm = sections.filter((s) => s.semester_id === selectedSemesterId);
  const availableCoursesForForm = courses.filter((c) => c.semester_id === selectedSemesterId);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Student Management ({students.length})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Add individual students with credentials & photos, assign to semesters/sections, or bulk import via CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              loadEmailSettings();
              setEmailSettingsModalOpen(true);
            }}
            className="gap-1.5 text-xs bg-white"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" />
            SMTP Settings
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setOutboxModalOpen(true)}
            className="gap-1.5 text-xs bg-white"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600" />
            Email Outbox ({outgoingEmails.length})
          </Button>

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
            Add Student
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            Semester:
          </div>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Semesters</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 ml-2">
            Section:
          </div>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                Section {sec.name} ({sec.semester?.name || ''})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Name, USN, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Students Table */}
      <Card className="border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading enrolled students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Students Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {students.length === 0
                ? 'Zero dummy data. Add students individually with their profile photo or import via CSV.'
                : 'No students matched the selected filters.'}
            </p>
            {students.length === 0 && (
              <Button size="sm" variant="primary" onClick={handleOpenAdd} className="mt-4 text-xs">
                Add First Student
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">USN</th>
                  <th className="px-5 py-3.5">Semester & Section</th>
                  <th className="px-5 py-3.5">Enrolled Courses</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {st.photo_url ? (
                          <img
                            src={st.photo_url}
                            alt={st.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                            {st.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {st.name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{st.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700">
                      {st.usn || '--'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                        {st.semester_info?.name || `Sem ${st.semester || '5'}`} &bull; Sec {st.section_info?.name || st.section || 'A'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {st.enrolled_courses && st.enrolled_courses.length > 0 ? (
                          st.enrolled_courses.map((c: any) => (
                            <span
                              key={c.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold"
                            >
                              {c.course_code}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No courses</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(st.id, st.active)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                          st.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {st.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setResetModalStudent(st);
                            setResetPasswordInput('Pass@1234');
                            setResetMessage(null);
                          }}
                          className="inline-flex items-center gap-1 p-1.5 text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Reset Student Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="inline-flex items-center gap-1 p-1.5 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Student"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setDeleteModalStudent(st);
                            setDeleteError(null);
                          }}
                          className="inline-flex items-center gap-1 p-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Single Student Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingId ? 'Edit Student Details' : 'Add New Student'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Enter academic credentials, semester & section mapping, courses, initial password, and student photo.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center sm:flex-row gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="relative group">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Student preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                      <User className="w-8 h-8" />
                      <span className="text-[10px] mt-0.5">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xs font-semibold text-slate-700">Student Photo</div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Upload official headshot for real-time verification and dashboard display.
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs gap-1.5 h-8"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      {photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {photoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleRemovePhoto}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    USN / Roll Number
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. 01FS24BEC002"
                    value={usn}
                    onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Initial Password for Student */}
              {!editingId && (
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      Initial Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setInitialPassword(`Pass@${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Randomize
                    </button>
                  </div>
                  <Input
                    type="text"
                    required
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="Pass@1234"
                    className="font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-slate-500">
                    The student uses this temporary password for their initial sign in. They can change it in their profile.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={selectedSemesterId}
                    onChange={(e) => handleSemesterChange(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableSectionsForForm.length > 0 ? (
                      availableSectionsForForm.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No sections in semester</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Enrolled Courses */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  Enrolled Courses ({selectedCourseIds.length} selected)
                </label>
                {availableCoursesForForm.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                    No courses created for this semester yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                    {availableCoursesForForm.map((c) => {
                      const isChecked = selectedCourseIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition ${
                            isChecked ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCourseToggle(c.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono text-[11px] text-indigo-600">{c.course_code}</span>
                          <span className="truncate">{c.course_name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={formLoading}>
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  {editingId ? 'Save Changes' : 'Create Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Student Credentials Issued Slip */}
      {issuedData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4 relative">
            <button
              onClick={() => setIssuedData(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              title="Close Popup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Account Created</h3>
                <p className="text-xs text-slate-500">Official credentials issued for student login</p>
              </div>
            </div>

            {issuedData.sent ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Email Delivered to Student</strong>
                  <span>{issuedData.message || `Credentials successfully dispatched to ${issuedData.email}.`}</span>
                  <span className="block text-[10px] text-emerald-600 mt-1">Auto-closing popup in 2 seconds...</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-800">
                  <Send className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Direct Send & Auto-Close
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Click <strong>Direct Send & Close Popup</strong> to dispatch student credentials to <strong>{issuedData.email}</strong> and immediately dismiss this window.
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Student Name:</span>
                <span className="font-bold text-slate-800">{issuedData.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">USN:</span>
                <span className="font-bold text-slate-800">{issuedData.usn}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Login Email:</span>
                <span className="font-bold text-indigo-600">{issuedData.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-sans">Temporary Password:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  {issuedData.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* Primary Direct Send & Close Button */}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDirectSendAndClose}
                disabled={directSending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
              >
                {directSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending & Closing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Direct Send & Close Popup
                  </>
                )}
              </Button>

              {/* Webmail / Client Fallback Send Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const gmailUrl =
                      issuedData.webmailGmailUrl ||
                      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                        issuedData.email
                      )}&su=${encodeURIComponent(
                        `Your GPS Student Attendance Portal Credentials - ${issuedData.name}`
                      )}&body=${encodeURIComponent(
                        `Dear ${issuedData.name},\n\nYour attendance portal credentials:\nEmail: ${issuedData.email}\nUSN: ${issuedData.usn}\nPassword: ${issuedData.temporaryPassword}\nLogin: http://localhost:3000/login`
                      )}`;
                    window.open(gmailUrl, '_blank');
                    setIssuedData(null); // Instantly close popup!
                    setToastMessage(`Opened Gmail compose & closed popup for ${issuedData.name}`);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition"
                  title="Send via Web Gmail in browser & close popup"
                >
                  <Mail className="w-3 h-3 text-red-500" />
                  Gmail Web & Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (issuedData.mailtoUrl) {
                      window.location.href = issuedData.mailtoUrl;
                    }
                    setIssuedData(null); // Instantly close popup!
                    setToastMessage(`Triggered email client & closed popup for ${issuedData.name}`);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition"
                  title="Send via default desktop mail & close popup"
                >
                  <ExternalLink className="w-3 h-3 text-indigo-500" />
                  Email App & Close
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCredentials}
                  className="flex-1 text-xs gap-1.5"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIssuedData(null)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Email Dispatch Outbox / Logs */}
      {outboxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Email Dispatch Outbox</h3>
                  <p className="text-xs text-slate-500">
                    History of credentials generated and dispatched to students
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOutboxModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>

            {/* SMTP Guide Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-slate-800">Direct SMTP Dispatch Configuration:</strong>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOutboxModalOpen(false);
                    setEmailSettingsModalOpen(true);
                  }}
                  className="text-[11px] h-7 gap-1"
                >
                  <Settings className="w-3 h-3 text-indigo-600" />
                  Configure SMTP
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect your Gmail or SMTP host under <strong>SMTP Settings</strong> to deliver credentials automatically to students upon account registration. You can also click <strong>&quot;Direct Send&quot;</strong> on any entry below to deliver credentials with 1 click.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {outgoingEmails.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No dispatched emails yet. Emails will appear here when you register students or reset passwords.</p>
                </div>
              ) : (
                outgoingEmails.map((emailItem) => {
                  const mailtoUrl = `mailto:${encodeURIComponent(emailItem.to)}?subject=${encodeURIComponent(
                    emailItem.subject || 'Your GPS Attendance Portal Login Credentials'
                  )}&body=${encodeURIComponent(emailItem.body_text || '')}`;

                  return (
                    <div
                      key={emailItem.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/60 transition space-y-2 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emailItem.status === 'SENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {emailItem.status === 'SENT' ? 'DELIVERED' : 'LOGGED IN OUTBOX'}
                          </span>
                          <span className="font-semibold text-slate-800">{emailItem.student_name}</span>
                          <span className="font-mono text-slate-400">({emailItem.usn})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(emailItem.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-mono text-[11px]">
                        <span>To: <strong className="text-indigo-600">{emailItem.to}</strong></span>
                        <span>Password: <strong className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{emailItem.temporary_password}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleResendFromOutbox(emailItem)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition shadow-xs"
                          title="Deliver directly to student inbox"
                        >
                          <Send className="w-3 h-3" />
                          Direct Send
                        </button>
                        <a
                          href={mailtoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold transition"
                        >
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          Email App
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(emailItem.body_text || `Login: ${emailItem.to}\nPassword: ${emailItem.temporary_password}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded text-[11px] transition"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Message
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Email & SMTP Settings */}
      {emailSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Email & Direct SMTP Settings</h3>
                  <p className="text-xs text-slate-500">
                    Configure automated credential delivery via Gmail or custom SMTP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailSettingsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {settingsMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                {settingsMessage}
              </div>
            )}

            <form onSubmit={handleSaveEmailSettings} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-900 text-xs space-y-1">
                <strong className="block font-semibold">Gmail Direct SMTP Setup:</strong>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  To send credentials directly from your Gmail account without opening external apps, generate a 16-character <strong>App Password</strong> at:
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-indigo-600 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Google App Passwords <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SMTP Host</label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SMTP Port</label>
                  <Input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sender Email / Username</label>
                  <Input
                    value={smtpUser}
                    onChange={(e) => {
                      setSmtpUser(e.target.value);
                      setSenderEmail(e.target.value);
                    }}
                    placeholder="bhuvansondabhvi@gmail.com"
                    className="text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Google App Password (16 chars)
                  </label>
                  <Input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder={smtpPassConfigured ? '•••••••••••••••• (Configured)' : 'Enter 16-char app password'}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sender Display Name</label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="GPS Attendance Management"
                  className="text-xs"
                />
              </div>

              {/* Test Email Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Test SMTP Delivery</label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Enter email to test (e.g. 01fs24bec003@kletech.ac.in)"
                    className="text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                    className="text-xs shrink-0"
                  >
                    {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1 text-indigo-600" />}
                    Send Test
                  </Button>
                </div>
                {testResultMsg && (
                  <p className={`text-[11px] ${testResultMsg.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {testResultMsg}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailSettingsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={settingsLoading}>
                  {settingsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Save Email Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Reset Student Password
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Issue a new password for <strong className="text-slate-700">{resetModalStudent.name}</strong> ({resetModalStudent.usn}).
              </p>
            </div>

            {resetMessage && (
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Temporary Password
                </label>
                <Input
                  type="text"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Pass@1234"
                  className="font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetModalStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={resetLoading || !resetPasswordInput.trim()}
                >
                  {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Save & Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Student Confirmation */}
      {deleteModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Student</h3>
                <p className="text-xs text-slate-500">Permanently delete student account</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-800">{deleteModalStudent.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">USN:</span>
                <span className="font-mono font-bold text-slate-800">{deleteModalStudent.usn || '--'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-indigo-600">{deleteModalStudent.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Semester & Section:</span>
                <span className="font-semibold text-slate-700">
                  {deleteModalStudent.semester_info?.name || `Sem ${deleteModalStudent.semester || '5'}`} &bull; Sec {deleteModalStudent.section_info?.name || deleteModalStudent.section || 'A'}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200 leading-relaxed">
              <strong>Warning:</strong> This will permanently delete this student, revoke their login access, remove course enrollments, and erase associated attendance records. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleteLoading}
                onClick={() => setDeleteModalStudent(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={deleteLoading}
                onClick={handleDeleteStudentSubmit}
                className="gap-1.5"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                <Trash2 className="w-3.5 h-3.5" />
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk CSV Import */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Bulk CSV Student Import
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Paste CSV text with columns: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">name,email,usn,semester,section</code>. Imported students receive default login password (<code className="font-mono text-emerald-700">Pass@1234</code>).
            </p>

            {csvResult && (
              <div className="p-3 mb-4 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs">
                {csvResult}
              </div>
            )}

            <div className="space-y-4">
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`name,email,usn,semester,section
Arun Kumar,arun@college.edu,USN001,5,A
Student 2,st2@college.edu,USN002,5,A`}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCsvModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={csvLoading || !csvText.trim()}
                  onClick={handleImportCsv}
                >
                  {csvLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Process CSV Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
