'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  CreditCard,
  Layers,
  FolderTree,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Percent,
  Calendar,
  Loader2,
  ArrowLeft,
  KeyRound,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState({ totalClasses: 0, attended: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/student/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.student);
          if (data.stats) setStats(data.stats);
        }
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirm password do not match.');
      return;
    }

    setPassLoading(true);

    try {
      const res = await fetch('/api/student/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPassSuccess(data.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(data.message || 'Failed to update password.');
      }
    } catch {
      setPassError('Network error while updating password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/student/dashboard">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs bg-white">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Button>
        </Link>
        <span className="text-xs font-semibold text-slate-500">Student Account</span>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading profile information...</p>
        </div>
      ) : !profile ? (
        <div className="p-8 bg-white rounded-xl text-center text-slate-500 border border-slate-200">
          Failed to load profile.
        </div>
      ) : (
        <>
          {/* Identity Card */}
          <Card className="border-slate-200 overflow-hidden shadow-xs">
            <div className="h-20 bg-gradient-to-r from-indigo-500 to-indigo-700" />
            <CardContent className="px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-4">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 border-4 border-white shadow-md flex items-center justify-center font-bold text-2xl shrink-0">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {profile.active ? 'Active Account' : 'Deactivated'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    STUDENT
                  </span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{profile.email}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    USN: <strong className="font-mono text-slate-900">{profile.usn || '--'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Semester:{' '}
                    <strong className="text-slate-900">
                      {profile.semester_info?.name || `Semester ${profile.semester || '5'}`}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Section:{' '}
                    <strong className="text-slate-900">
                      Section {profile.section_info?.name || profile.section || 'A'}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Academic Year:{' '}
                    <strong className="text-slate-900">
                      {profile.semester_info?.academic_year || '2026-2027'}
                    </strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Courses */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Enrolled Courses ({profile.enrolled_courses?.length || 0})
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Only attendance sessions for these enrolled courses are shown on your portal.
              </p>

              {profile.enrolled_courses && profile.enrolled_courses.length > 0 ? (
                <div className="space-y-2">
                  {profile.enrolled_courses.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-600 block">
                          {c.course_code}
                        </span>
                        <span className="font-semibold text-slate-800">{c.course_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Enrolled
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                  No individual course enrollments assigned yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  Security & Change Password
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Change the temporary password issued by administration to your own private password.
                </p>
              </div>

              {passSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current / Temporary Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password (min 6 chars)
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={passLoading || !newPassword || !confirmPassword}
                    className="text-xs gap-1.5"
                  >
                    {passLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    <Lock className="w-3.5 h-3.5" />
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
