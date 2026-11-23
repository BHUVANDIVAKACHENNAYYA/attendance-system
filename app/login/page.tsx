'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Navigation,
  ShieldCheck,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Camera,
  Trash2,
  User,
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

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT');
  const [regUsn, setRegUsn] = useState('');
  const [regSemester, setRegSemester] = useState('5');
  const [regSection, setRegSection] = useState('A');
  const [regPhotoUrl, setRegPhotoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasAdmin === false) {
          setHasAdmin(false);
          setMode('register');
          setRegRole('ADMIN');
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setRegPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
          setError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSignIn = async (e: React.FormEvent) => {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER',
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole,
          usn: regRole === 'STUDENT' ? regUsn : undefined,
          semester: regRole === 'STUDENT' ? regSemester : undefined,
          section: regRole === 'STUDENT' ? regSection : undefined,
          photo_url: regPhotoUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl text-white flex items-center justify-center mx-auto shadow-md">
          <Navigation className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          GPS Attendance System
        </h1>
        <p className="text-xs text-slate-500">
          Real-time location verified academic portal
        </p>
      </div>

      {!hasAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Initial Setup Required</strong>
            <span>No Administrator account exists yet. Please create your Administrator account below.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
          }}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mode === 'signin' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mode === 'register' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Create Account
        </button>
      </div>

      <Card className="shadow-md border-slate-200">
        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label="College Email Address"
                type="email"
                required
                placeholder="e.g. teacher@college.edu or student@college.edu"
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
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              {/* Photo Upload for Student/User */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-200 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {regPhotoUrl ? (
                    <img src={regPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <span className="font-semibold text-slate-700 block text-xs">Profile Photo</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="reg-photo-file"
                    />
                    <label
                      htmlFor="reg-photo-file"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3 h-3 text-indigo-600" />
                      {regPhotoUrl ? 'Change' : 'Upload Photo'}
                    </label>

                    {regPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegPhotoUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-1">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('STUDENT')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      regRole === 'STUDENT'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('ADMIN')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      regRole === 'ADMIN'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Teacher / Admin
                  </button>
                </div>
              </div>

              <Input
                label="Full Name"
                required
                placeholder="e.g. John Doe"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />

              <Input
                label="Email Address"
                type="email"
                required
                placeholder="e.g. student@college.edu"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />

              <Input
                label="Password (min 6 characters)"
                type="password"
                required
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />

              {regRole === 'STUDENT' && (
                <>
                  <Input
                    label="University Seat Number (USN)"
                    required
                    placeholder="e.g. 1MS21CS001"
                    value={regUsn}
                    onChange={(e) => setRegUsn(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Semester"
                      placeholder="5"
                      value={regSemester}
                      onChange={(e) => setRegSemester(e.target.value)}
                    />
                    <Input
                      label="Section"
                      placeholder="A"
                      value={regSection}
                      onChange={(e) => setRegSection(e.target.value)}
                    />
                  </div>
                </>
              )}

              <Button type="submit" size="md" isLoading={loading} className="w-full mt-2">
                Create Account & Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
