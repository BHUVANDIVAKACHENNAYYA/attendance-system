'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, ShieldCheck, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttendanceStatusBadge, Badge } from '@/components/ui/badge';

export default function StudentHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
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
          if (data.stats) setStats(data.stats);
        }
      })
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top back button and title */}
      <div className="flex items-center justify-between">
        <Link href="/student/dashboard">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Mark Attendance
          </Button>
        </Link>

        <span className="text-xs font-semibold text-slate-500">Academic Records</span>
      </div>

      {/* Percentage Highlights Card */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Attendance Statistics</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated as (Present + Late) / Total Conducted × 100
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
                {stats.attendancePercentage >= 75 ? 'Satisfactory Attendance' : 'Attendance Shortage'}
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

      {/* History Table Card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Classroom Attendance Log</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">{history.length} Sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading attendance history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No past sessions found.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.sessionId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(row.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {row.subject}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {row.className}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {row.locationName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {row.markedAt
                        ? new Date(row.markedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <AttendanceStatusBadge status={row.status} />
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
