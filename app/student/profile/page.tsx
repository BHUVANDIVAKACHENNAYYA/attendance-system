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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState({ totalClasses: 0, attended: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

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
          </>
        )}
    </div>
  );
}
