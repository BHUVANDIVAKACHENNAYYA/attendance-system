'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Radio,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StudentSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch('/api/attendance/today');
      const data = await res.json();
      if (data.success) {
        setSessions(data.todaySessions || []);
      } else {
        setError(data.message || 'Failed to load sessions');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // Live synchronization with admin changes every 10 seconds
    const interval = setInterval(() => {
      loadSessions();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Today&apos;s Class Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Classes scheduled today for your enrolled semester and courses (auto-refreshes in real time).
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => loadSessions(true)}
          disabled={refreshing}
          className="text-xs gap-1.5 self-start sm:self-auto bg-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          {refreshing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading your daily classes...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Classes Scheduled Today</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no attendance sessions scheduled for your enrolled courses today.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const sTime = new Date(s.start_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const eTime = new Date(s.end_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const lTime = new Date(s.late_threshold).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={s.id}
                className={`border-slate-200 transition ${
                  s.status === 'ACTIVE'
                    ? 'ring-2 ring-emerald-500/30 border-emerald-500/50 shadow-sm'
                    : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {s.isMarked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{' '}
                            ATTENDANCE RECORDED ({s.recordStatus || 'PRESENT'})
                          </span>
                        ) : s.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                            <Radio className="w-3.5 h-3.5 text-emerald-600" /> LIVE NOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" /> {s.status}
                          </span>
                        )}

                        <span className="text-xs font-mono text-slate-400">
                          {s.course?.course_code || ''}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{s.subject}</h3>
                      <p className="text-xs text-slate-500 font-medium">{s.class_name}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {sTime} – {eTime} (Late after {lTime})
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {s.location?.name || 'Classroom'} (Radius: {s.gps_radius || 50}m)
                        </span>
                      </div>
                    </div>

                    <div className="sm:shrink-0 flex items-center">
                      {s.isMarked ? (
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" /> Verified
                          </span>
                        </div>
                      ) : s.status === 'ACTIVE' ? (
                        <Link href="/student/dashboard">
                          <Button size="sm" variant="primary" className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            Mark Attendance Now
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {s.status === 'SCHEDULED' ? 'Opens at start time' : 'Session ended'}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
