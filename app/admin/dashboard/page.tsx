'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Navigation,
  Play,
  Square,
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
  Plus,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { StatCards } from '@/components/dashboard/StatCards';
import { LiveAttendanceTable, AttendanceRow } from '@/components/dashboard/LiveAttendanceTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceSession } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 17,
    presentCount: 0,
    lateCount: 0,
    notMarkedCount: 17,
  });

  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
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
    // Real-time polling every 5 seconds
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
      {/* Top Section Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                Classroom Monitoring
              </span>
              <span className="text-xs font-mono text-slate-400">
                Live Attendance Engine
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
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              Sync Live
            </button>

            {activeSession?.status === 'ACTIVE' ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => handleToggleSessionStatus('CLOSE')}
                isLoading={actionLoading}
                className="gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                Close Active Session
              </Button>
            ) : activeSession ? (
              <Button
                variant="success"
                size="md"
                onClick={() => handleToggleSessionStatus('START')}
                isLoading={actionLoading}
                className="gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Attendance Now
              </Button>
            ) : null}

            <Link href="/admin/sessions">
              <Button variant="primary" size="md" className="gap-2">
                <Plus className="w-4 h-4" />
                New Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Session Highlight Bar */}
        {activeSession && (
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
                  {activeSession.location?.name || 'Classroom'} (Radius: {activeSession.location?.radius_meters || 50}m)
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(activeSession.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                activeSession.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Status: {activeSession.status}
            </span>
          </div>
        )}
      </div>

      {/* 4 Stat Cards */}
      <StatCards
        totalStudents={stats.totalStudents}
        presentCount={stats.presentCount}
        lateCount={stats.lateCount}
        notMarkedCount={stats.notMarkedCount}
      />

      {/* Live Attendance Table */}
      <LiveAttendanceTable
        sessionId={activeSession?.id || ''}
        attendanceList={attendanceList}
        onRecordUpdated={() => fetchDashboardData(true)}
      />
    </div>
  );
}
