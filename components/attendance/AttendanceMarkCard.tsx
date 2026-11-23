'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Navigation,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceSession, AttendanceVerificationResponse, AttendanceRecord } from '@/types';

interface AttendanceMarkCardProps {
  session: AttendanceSession | null;
  existingRecord: AttendanceRecord | null;
  studentName: string;
  onAttendanceMarked: () => void;
}

export function AttendanceMarkCard({
  session,
  existingRecord,
  studentName,
  onAttendanceMarked,
}: AttendanceMarkCardProps) {
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AttendanceVerificationResponse | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [gpsStep, setGpsStep] = useState<string | null>(null);

  // Time greeting helper
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const handleMarkAttendance = () => {
    if (!session) return;
    setErrorDetails(null);
    setVerificationResult(null);

    if (!navigator.geolocation) {
      setErrorDetails('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setGpsStep('Requesting GPS satellite fix...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsStep('Verifying location with college attendance server...');

        const payload = {
          sessionId: session.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        try {
          const res = await fetch('/api/attendance/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            setVerificationResult(data);
            // Trigger celebration confetti
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.7 },
            });
            onAttendanceMarked();
          } else {
            setVerificationResult(data);
            setErrorDetails(data.message || 'Failed to verify attendance location.');
          }
        } catch (err: any) {
          setErrorDetails('Network failure during submission. Please check connectivity and try again.');
        } finally {
          setLoading(false);
          setGpsStep(null);
        }
      },
      (err) => {
        setLoading(false);
        setGpsStep(null);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErrorDetails(
              'Location permission is disabled. Please enable location permission in your browser settings and try again.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setErrorDetails(
              'Unable to obtain your current location. Please turn on GPS/location services and try again.'
            );
            break;
          case err.TIMEOUT:
            setErrorDetails('GPS signal request timed out. Please stand near an open window and retry.');
            break;
          default:
            setErrorDetails('An error occurred while accessing device GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // If already recorded today
  const activeRecord = existingRecord || (verificationResult?.success ? (verificationResult as any) : null);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-indigo-50/40 relative overflow-hidden">
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Student Greeting */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Student Attendance Portal
            </span>
            <span className="text-xs font-mono text-slate-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {greeting}, <span className="text-indigo-600">{studentName}</span>
          </h2>
        </div>

        {/* Active Session Card Info */}
        {session ? (
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{session.subject}</h3>
                <p className="text-xs text-slate-500 font-medium">{session.class_name}</p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  session.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {session.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Window:{' '}
                  <strong className="text-slate-800">
                    {new Date(session.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(session.end_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Location:{' '}
                  <strong className="text-slate-800">
                    {session.location?.name || 'Authorized Classroom'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Privacy notice banner */}
            <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Zero background tracking. GPS is only checked for 1 second upon pressing the button.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/80 rounded-xl p-6 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-400" />
            <h4 className="font-semibold text-slate-800">No Active Attendance Session</h4>
            <p className="text-xs max-w-sm mx-auto">
              Your teacher has not activated an attendance session right now. Please wait for the class to begin.
            </p>
          </div>
        )}

        {/* Existing Confirmation State */}
        {activeRecord ? (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">
                  ✓ Attendance Recorded Successfully
                </h4>
                <p className="text-xs text-emerald-700">
                  Your location has been verified by the college server.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 rounded-lg p-3 text-xs border border-emerald-100">
              <div>
                <span className="block text-slate-500">Status</span>
                <span
                  className={`font-bold ${
                    activeRecord.status === 'LATE' ? 'text-amber-600' : 'text-emerald-700'
                  }`}
                >
                  {activeRecord.status}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Time</span>
                <span className="font-bold text-slate-800 font-mono">
                  {new Date(activeRecord.marked_at || activeRecord.markedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Distance</span>
                <span className="font-bold text-slate-800 font-mono">
                  {Math.round(
                    activeRecord.distance_from_location_meters ??
                      activeRecord.distanceMeters ??
                      0
                  )}{' '}
                  metres
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Verification</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
            </div>
          </div>
        ) : session?.status === 'ACTIVE' ? (
          <div className="space-y-4">
            {/* Error rejection notification */}
            {errorDetails && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>✗ Attendance Not Marked</span>
                </div>
                <p>{errorDetails}</p>
                {verificationResult?.distanceMeters !== undefined && (
                  <div className="font-mono text-[11px] bg-white/70 p-2 rounded border border-rose-100">
                    Your Distance: <strong>{verificationResult.distanceMeters}m</strong> | Required: within{' '}
                    <strong>{verificationResult.allowedRadiusMeters || 50}m</strong>
                  </div>
                )}
              </div>
            )}

            {/* GPS progress step */}
            {gpsStep && (
              <div className="text-center p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 animate-pulse flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>{gpsStep}</span>
              </div>
            )}

            {/* LARGE MARK ATTENDANCE BUTTON */}
            <Button
              type="button"
              size="xl"
              variant="primary"
              onClick={handleMarkAttendance}
              isLoading={loading}
              className="w-full py-4 text-lg font-bold shadow-indigo-200 hover:shadow-indigo-300 gap-3"
            >
              <Navigation className="w-6 h-6 animate-bounce" />
              MARK ATTENDANCE
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
