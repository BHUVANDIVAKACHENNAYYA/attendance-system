'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  History,
  ShieldCheck,
  MapPin,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StudentHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [courseWiseStats, setCourseWiseStats] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalConducted: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/attendance/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHistory(data.history || []);
          setCourseWiseStats(data.courseWiseStats || []);
          if (data.stats) setStats(data.stats);
        }
      })
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Late
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
            {status}
          </span>
        );
    }
  };

  const getCourseBadge = (badge: string) => {
    switch (badge) {
      case 'GOOD':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Good (≥85%)
          </span>
        );
      case 'AVERAGE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            Satisfactory (≥75%)
          </span>
        );
      case 'SHORTAGE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            Shortage (&lt;75%)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
          <Link href="/student/dashboard">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs bg-white">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Button>
          </Link>
          <span className="text-xs font-semibold text-slate-500">Personal Attendance Record</span>
        </div>

        {/* Overall Percentage Card */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Attendance Summary</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formula: (Present + Late) &divide; Total Conducted Classes &times; 100
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-extrabold text-indigo-600 font-mono">
                  {stats.attendancePercentage}%
                </span>
                <span
                  className={`block text-[10px] font-bold uppercase mt-0.5 ${
                    stats.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {stats.attendancePercentage >= 75 ? 'Eligible for Examinations (≥75%)' : 'Attendance Shortage Warning'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-5 border-t border-slate-100 mt-5 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Conducted</span>
                <span className="font-bold text-slate-900 font-mono text-lg">{stats.totalConducted}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Present</span>
                <span className="font-bold text-emerald-700 font-mono text-lg">{stats.presentCount}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <span className="text-amber-700 block text-[10px] uppercase font-bold">Late</span>
                <span className="font-bold text-amber-700 font-mono text-lg">{stats.lateCount}</span>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                <span className="text-rose-700 block text-[10px] uppercase font-bold">Absent</span>
                <span className="font-bold text-rose-700 font-mono text-lg">{stats.absentCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1. Course-wise Attendance Breakdown */}
        {courseWiseStats.length > 0 && (
          <Card className="border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Course-Wise Attendance</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {courseWiseStats.length} Course{courseWiseStats.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Course Name</th>
                    <th className="py-3 px-4 text-center">Total</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Late</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseWiseStats.map((c) => (
                    <tr key={c.courseId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {c.courseCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.courseName}</td>
                      <td className="py-3 px-4 text-center font-mono">{c.totalClasses}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-semibold">
                        {c.present}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-700 font-semibold">
                        {c.late}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-rose-700 font-semibold">
                        {c.absent}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {c.percentage}%
                      </td>
                      <td className="py-3 px-4 text-right">{getCourseBadge(c.statusBadge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* 2. Detailed Past Sessions Log */}
        <Card className="border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Attendance History Logs</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{history.length} Entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-4">Subject / Course</th>
                  <th className="py-3 px-4">Marked Time</th>
                  <th className="py-3 px-4">GPS Distance</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
                      Loading attendance logs...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No attendance records found yet.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.sessionId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>
                          {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <span className="text-[10px] text-slate-400">{row.day}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.subject}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {row.locationName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {row.markedAt
                          ? new Date(row.markedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {row.distanceMeters !== null && row.distanceMeters !== undefined ? (
                          <span className="text-emerald-700 font-semibold">
                            {row.distanceMeters}m
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {getStatusBadge(row.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}
