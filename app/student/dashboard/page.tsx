'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttendanceMarkCard } from '@/components/attendance/AttendanceMarkCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttendanceSession, AttendanceRecord, Profile } from '@/types';
import { CheckCircle2, Clock, XCircle, ArrowRight, BarChart2 } from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [myRecord, setMyRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick stats state
  const [stats, setStats] = useState({
    totalConducted: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  });

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

      // 2. Fetch today's session
      const sessionRes = await fetch('/api/attendance/today');
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSession(sessionData.session);
        setMyRecord(sessionData.myRecord);
      }

      // 3. Fetch history stats
      const historyRes = await fetch('/api/attendance/history');
      const historyData = await historyRes.json();
      if (historyData.success && historyData.stats) {
        setStats(historyData.stats);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Checking active attendance session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* 1. Core Attendance Action Card */}
      <AttendanceMarkCard
        session={session}
        existingRecord={myRecord}
        studentName={user?.name || 'Student'}
        onAttendanceMarked={loadData}
      />

      {/* 2. Quick Attendance Overview */}
      <Card className="border-slate-200">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              Attendance Summary
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                stats.attendancePercentage >= 75
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {stats.attendancePercentage >= 75 ? 'Eligible (>75%)' : 'Shortage Alert'}
            </span>
          </div>

          {/* Large Percentage Readout */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Overall Attendance</span>
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {stats.attendancePercentage}%
              </span>
            </div>

            <Link href="/student/history">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs bg-white">
                Detailed History
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Breakdown Counters */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total</span>
              <span className="font-bold text-slate-800 font-mono text-base">
                {stats.totalConducted}
              </span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              <span className="text-emerald-700 block text-[10px] uppercase font-bold">Present</span>
              <span className="font-bold text-emerald-700 font-mono text-base">
                {stats.presentCount}
              </span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
              <span className="text-amber-700 block text-[10px] uppercase font-bold">Late</span>
              <span className="font-bold text-amber-700 font-mono text-base">{stats.lateCount}</span>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100">
              <span className="text-rose-700 block text-[10px] uppercase font-bold">Absent</span>
              <span className="font-bold text-rose-700 font-mono text-base">{stats.absentCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
