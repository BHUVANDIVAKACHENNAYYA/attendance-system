'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Navigation,
  ShieldCheck,
  LogIn,
  AlertCircle,
  GraduationCap,
  KeyRound,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Initial Admin Setup State (only shown when system has no Admin)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasAdmin === false) {
          setHasAdmin(false);
          setMode('register');
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER',
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: 'ADMIN',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.message || 'Administrator registration failed.');
      }
    } catch {
      setError('An error occurred during administrator setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl text-white flex items-center justify-center mx-auto shadow-md">
          <Navigation className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          GPS Attendance System
        </h1>
        <p className="text-xs text-slate-500">
          Centralized Real-Time Location Verified Academic Portal
        </p>
      </div>

      {!hasAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-semibold">Initial Setup: Create Administrator</strong>
            <span>
              No Administrator account exists yet. Create your master Administrator account below to manage the academic system.
            </span>
          </div>
        </div>
      )}

      <Card className="shadow-md border-slate-200">
        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasAdmin ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="text-xs font-semibold text-slate-700 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                Sign In to Your Account
              </div>

              <Input
                label="College Email Address"
                type="email"
                required
                placeholder="e.g. arun@gmail.com or admin@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" size="md" isLoading={loading} className="w-full">
                Sign In
              </Button>

              {/* Informational Notice for Students: Self-Registration Disabled */}
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Student Portal Access
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Student accounts are provisioned exclusively by college administration. Students receive their official login credentials (Email and Temporary Password) from their teacher/department.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium pt-1">
                  <KeyRound className="w-3 h-3" />
                  You can change your password anytime in your Student Profile after logging in.
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleInitialAdminSetup} className="space-y-3.5 text-xs">
              <div className="text-xs font-semibold text-slate-700 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Master Administrator Setup
              </div>

              <Input
                label="Administrator Full Name"
                required
                placeholder="e.g. Dr. Ramesh Kumar"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />

              <Input
                label="Official Admin Email"
                type="email"
                required
                placeholder="admin@college.edu"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />

              <Input
                label="Password (min 6 characters)"
                type="password"
                required
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />

              <Button type="submit" size="md" isLoading={loading} className="w-full mt-2">
                Create Administrator Account & Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
