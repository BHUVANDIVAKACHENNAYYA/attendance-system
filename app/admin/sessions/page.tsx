'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  Square,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttendanceSession, AttendanceLocation } from '@/types';

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const [subject, setSubject] = useState('Digital Electronics');
  const [className, setClassName] = useState('5th Sem ECE - Sec A');
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [locationId, setLocationId] = useState('');

  // Default times (current hour to +15 mins)
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:15');
  const [lateThreshold, setLateThreshold] = useState('08:05');

  const loadData = async () => {
    try {
      const [sessRes, locRes] = await Promise.all([
        fetch('/api/admin/sessions'),
        fetch('/api/admin/locations'),
      ]);

      const [sessData, locData] = await Promise.all([sessRes.json(), locRes.json()]);

      if (sessData.success) setSessions(sessData.sessions || []);
      if (locData.success && locData.locations) {
        setLocations(locData.locations);
        if (locData.locations.length > 0 && !locationId) {
          setLocationId(locData.locations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load session manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!locationId) {
      setErrorMessage('Please select an authorized attendance location.');
      return;
    }

    setSubmitting(true);

    try {
      // Build ISO timestamps using selected date & time
      const startIso = new Date(`${attendanceDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${attendanceDate}T${endTime}:00`).toISOString();
      const lateIso = new Date(`${attendanceDate}T${lateThreshold}:00`).toISOString();

      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          class_name: className,
          attendance_date: attendanceDate,
          location_id: locationId,
          start_time: startIso,
          end_time: endIso,
          late_threshold: lateIso,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Attendance session created successfully!');
        loadData();
      } else {
        setErrorMessage(data.message || 'Failed to create session.');
      }
    } catch {
      setErrorMessage('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (sessionId: string, action: 'START' | 'CLOSE') => {
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to toggle session:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Attendance Sessions
        </h1>
        <p className="text-xs text-slate-500">
          Schedule classroom attendance windows, configure late thresholds, and activate sessions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session Creation Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Create New Session
              </h3>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
                <Input
                  label="Subject Name"
                  required
                  placeholder="e.g. Digital Electronics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />

                <Input
                  label="Class / Section"
                  required
                  placeholder="e.g. 5th Sem ECE - Sec A"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-1">
                    Attendance Location
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} (Radius: {loc.radius_meters}m)
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Session Date"
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Start Time"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <Input
                    label="Late After"
                    type="time"
                    required
                    value={lateThreshold}
                    onChange={(e) => setLateThreshold(e.target.value)}
                    helperText="Marked LATE"
                  />
                  <Input
                    label="End Time"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    helperText="Window closes"
                  />
                </div>

                <Button
                  type="submit"
                  size="md"
                  variant="primary"
                  isLoading={submitting}
                  className="w-full mt-2"
                >
                  Create Session
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Existing Sessions List */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Class Sessions ({sessions.length})
                </h3>
                <span className="text-xs text-slate-500">Sorted by newest</span>
              </div>

              <div className="divide-y divide-slate-100">
                {sessions.map((sess) => {
                  const isActive = sess.status === 'ACTIVE';

                  return (
                    <div
                      key={sess.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{sess.subject}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                                : sess.status === 'CLOSED'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">{sess.class_name}</p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5" />
                            {sess.attendance_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                            {new Date(sess.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {sess.location?.name || 'Classroom'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleAction(sess.id, 'CLOSE')}
                            className="gap-1.5 text-xs"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            Close
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleAction(sess.id, 'START')}
                            className="gap-1.5 text-xs"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Start Attendance
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
