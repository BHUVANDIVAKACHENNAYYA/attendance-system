'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttendanceMarkCard } from '@/components/attendance/AttendanceMarkCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttendanceSession, AttendanceRecord, Profile } from '@/types';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  BarChart2,
  Calendar,
  Layers,
  BookOpen,
  User,
  Radio,
  Navigation,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [myRecord, setMyRecord] = useState<AttendanceRecord | null>(null);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({
    totalToday: 0,
    markedToday: 0,
    pendingToday: 0,
    overallPercentage: 0,
  });
  const [historyStats, setHistoryStats] = useState({
    totalConducted: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // 1. Session check
      const authRes = await fetch('/api/auth/session');
      const authData = await authRes.json();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setUser(authData.user);

      // 2. Fetch today's session & stats
      const sessionRes = await fetch('/api/attendance/today');
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSession(sessionData.session);
        setMyRecord(sessionData.myRecord);
        setTodaySessions(sessionData.todaySessions || []);
        if (sessionData.stats) {
          setTodayStats(sessionData.stats);
        }
      }

      // 3. Fetch history stats
      const historyRes = await fetch('/api/attendance/history');
      const historyData = await historyRes.json();
      if (historyData.success && historyData.stats) {
        setHistoryStats(historyData.stats);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Checking active attendance sessions...</p>
      </div>
    );
  }

  const attendanceRate = historyStats.totalConducted > 0
    ? historyStats.attendancePercentage
    : todayStats.overallPercentage;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        {/* Student Profile Greeting Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-4">
            {user?.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-xl shrink-0 border border-indigo-200">
                {user?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  KLE TECH • STUDENT
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {user?.usn || 'No USN'}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 truncate mt-0.5">
                {user?.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                {user?.semester_info?.name || `Semester ${user?.semester || '5'}`} &bull; Section {user?.section_info?.name || user?.section || 'A'}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Overview Stats Grid */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Today Total
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-0.5 block">
              {todayStats.totalToday}
            </span>
            <span className="text-[10px] text-slate-400">Classes</span>
          </div>

          <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-3 text-center shadow-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Marked
            </span>
            <span className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5 block">
              {todayStats.markedToday}
            </span>
            <span className="text-[10px] text-emerald-600">Recorded</span>
          </div>

          <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-3 text-center shadow-xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Pending
            </span>
            <span className="text-xl font-extrabold text-amber-800 font-mono mt-0.5 block">
              {todayStats.pendingToday}
            </span>
            <span className="text-[10px] text-amber-600">To mark</span>
          </div>

          <div className="bg-indigo-50/70 rounded-xl border border-indigo-200 p-3 text-center shadow-xs">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
              Overall %
            </span>
            <span className="text-xl font-extrabold text-indigo-900 font-mono mt-0.5 block">
              {attendanceRate}%
            </span>
            <span className="text-[10px] text-indigo-600">Attendance</span>
          </div>
        </div>

        {/* Core Attendance Verification & Action Card */}
        <AttendanceMarkCard
          session={session}
          existingRecord={myRecord}
          studentName={user?.name || 'Student'}
          studentPhoto={user?.photo_url}
          studentUsn={user?.usn}
          onAttendanceMarked={loadData}
        />

        {/* Quick Nav Card: View Other Classes / History */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Today&apos;s Class Schedule</h4>
                <p className="text-xs text-slate-500">
                  {todaySessions.length} session{todaySessions.length === 1 ? '' : 's'} scheduled for your courses
                </p>
              </div>
            </div>

            <Link href="/student/sessions">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                View Schedule
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
    </div>
  );
}
