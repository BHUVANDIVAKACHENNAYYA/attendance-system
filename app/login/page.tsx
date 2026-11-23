'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, ShieldCheck, UserCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const demoAccounts = [
  { id: 'admin-001', name: 'Prof. Ramesh Sharma (Admin/Teacher)', role: 'ADMIN', email: 'admin@college.edu' },
  { id: 'st-001', name: 'Arun Kumar (USN001)', role: 'STUDENT', email: 'arun.kumar@demo.college.edu' },
  { id: 'st-002', name: 'Bhavya S. (USN002)', role: 'STUDENT', email: 'bhavya.s@demo.college.edu' },
  { id: 'st-003', name: 'Chetan Rao (USN003)', role: 'STUDENT', email: 'chetan.rao@demo.college.edu' },
  { id: 'st-004', name: 'Divya Murthy (USN004)', role: 'STUDENT', email: 'divya.murthy@demo.college.edu' },
  { id: 'st-005', name: 'Eshwar Patel (USN005)', role: 'STUDENT', email: 'eshwar.patel@demo.college.edu' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(data.message || 'Login failed. Please check credentials.');
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoUserId: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoUserId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(data.message || 'Quick login failed.');
      }
    } catch {
      setError('Failed to switch user account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl text-white flex items-center justify-center mx-auto shadow-md">
          <Navigation className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to System
        </h1>
        <p className="text-xs text-slate-500">
          Enter credentials or choose an account below for instant evaluation
        </p>
      </div>

      {/* Main Login Card */}
      <Card className="shadow-md border-slate-200">
        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="College Email Address"
              type="email"
              required
              placeholder="e.g. admin@college.edu or arun@demo.college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" size="md" isLoading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                1-Click Demo Evaluation Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickDemoLogin(acc.id)}
                  disabled={loading}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition group"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{acc.email}</div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      acc.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
