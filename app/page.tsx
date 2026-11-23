'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Navigation,
  ShieldCheck,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === 'ADMIN') {
            router.push('/admin/dashboard');
          } else {
            router.push('/student/dashboard');
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading GPS Attendance Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-10">
      {/* Hero Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Navigation className="w-3.5 h-3.5" />
          <span>Automated Proximity Verification</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          GPS-Based Student <br />
          <span className="text-indigo-600">Attendance Management System</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Eliminating manual roll calls and proxy attendance with server-verified geofencing.
          Students mark attendance in seconds when inside the classroom radius.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Sign In to System
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="hover:border-indigo-300 transition">
          <CardContent className="p-5 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Server-Side Geofencing</h3>
            <p className="text-xs text-slate-500">
              Coordinates validated via Haversine formula against configured classroom radius.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-indigo-300 transition">
          <CardContent className="p-5 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Strict Server Time</h3>
            <p className="text-xs text-slate-500">
              Device clocks cannot be manipulated. Automatic PRESENT or LATE classification.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-indigo-300 transition">
          <CardContent className="p-5 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Privacy & Anti-Spoof</h3>
            <p className="text-xs text-slate-500">
              No continuous background tracking. GPS accuracy validation and audit logging.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
