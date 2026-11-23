'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Layers,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  Play,
  Square,
  MapPin,
  RefreshCw,
  Plus,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { LiveAttendanceTable, AttendanceRow } from '@/components/dashboard/LiveAttendanceTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceSession } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSemesters: 0,
    totalCourses: 0,
    activeSessionsToday: 0,
    presentCount: 0,
    lateCount: 0,
    notMarkedCount: 0,
    absentCount: 0,
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
    overallAttendancePercentage: 0,
  });

  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();

      if (data.success) {
        setStats(data.stats);
        setActiveSession(data.session);
        setAllSessions(data.allSessions || []);
        setAttendanceList(data.attendanceList || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleSessionStatus = async (action: 'START' | 'CLOSE') => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to toggle session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Admin Portal &bull; Central Academic Management
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Real-Time Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                GPS ATTENDANCE SYSTEM
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => fetchDashboardData()}
                disabled={refreshing}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                Sync Live
              </button>

              {activeSession?.status === 'ACTIVE' ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => handleToggleSessionStatus('CLOSE')}
                  disabled={actionLoading}
                  className="gap-2 text-xs"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Active Session
                </Button>
              ) : activeSession ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleToggleSessionStatus('START')}
                  disabled={actionLoading}
                  className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Attendance Now
                </Button>
              ) : null}

              <Link href="/admin/sessions">
                <Button variant="primary" size="md" className="gap-2 text-xs">
                  <Plus className="w-4 h-4" />
                  New Session
                </Button>
              </Link>
            </div>
          </div>

          {/* Active Session Highlight Bar */}
          {activeSession ? (
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Class:</span>
                  <span className="text-indigo-600">{activeSession.subject}</span>
                  <span className="text-slate-400 font-normal">({activeSession.class_name})</span>
                </div>

                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {activeSession.location?.name || 'Classroom'} (Radius: {activeSession.gps_radius || activeSession.location?.radius_meters || 50}m)
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-600 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(activeSession.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                    activeSession.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Status: {activeSession.status}
                </span>

                <Link
                  href="/admin/attendance"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  Monitoring View <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>No attendance session currently active.</span>
              </div>
              <Link
                href="/admin/sessions"
                className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
              >
                Schedule or Start a Session →
              </Link>
            </div>
          )}
        </div>

        {/* 8 Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total Students */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Students</span>
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.totalStudents}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Enrolled</div>
          </div>

          {/* Total Semesters */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Semesters</span>
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.totalSemesters}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Active</div>
          </div>

          {/* Total Courses */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Courses</span>
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.totalCourses}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Offered</div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Today</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.activeSessionsToday}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sessions</div>
          </div>

          {/* Present */}
          <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
              <span>Present</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-800 mt-1">{stats.presentCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">On time</div>
          </div>

          {/* Late */}
          <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
              <span>Late</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-800 mt-1">{stats.lateCount}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Past threshold</div>
          </div>

          {/* Absent / Not Marked */}
          <div className="bg-rose-50/60 rounded-xl border border-rose-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
              <span>Not Marked</span>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-extrabold text-rose-800 mt-1">{stats.notMarkedCount}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Pending</div>
          </div>

          {/* Attendance % */}
          <div className="bg-indigo-50/60 rounded-xl border border-indigo-200 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-between">
              <span>Rate %</span>
              <Percent className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-extrabold text-indigo-900 mt-1">
              {stats.overallAttendancePercentage}%
            </div>
            <div className="text-[10px] text-indigo-600 mt-0.5">Attendance</div>
          </div>
        </div>

        {/* Live Attendance Table */}
        <LiveAttendanceTable
          sessionId={activeSession?.id || ''}
          attendanceList={attendanceList}
          onRecordUpdated={() => fetchDashboardData(true)}
        />
    </div>
  );
}
