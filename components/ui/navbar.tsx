'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MapPin,
  Users,
  Calendar,
  BarChart3,
  LogOut,
  Navigation,
  ShieldCheck,
  History,
  CheckCircle2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Profile } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error('Failed to load session:', err))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <Link
              href={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                  GPS Attendance
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  College Class System
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {isAdmin ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/admin/dashboard'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </span>
                </Link>
                <Link
                  href="/admin/locations"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/admin/locations'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Locations
                  </span>
                </Link>
                <Link
                  href="/admin/sessions"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/admin/sessions'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Sessions
                  </span>
                </Link>
                <Link
                  href="/admin/students"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/admin/students'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Students
                  </span>
                </Link>
                <Link
                  href="/admin/reports"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/admin/reports'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Reports
                  </span>
                </Link>
              </>
            ) : user ? (
              <>
                <Link
                  href="/student/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/student/dashboard'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Attendance
                  </span>
                </Link>
                <Link
                  href="/student/history"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/student/history'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    My History
                  </span>
                </Link>
              </>
            ) : null}
          </nav>

          {/* User profile & actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {user.name.charAt(0)}
                  </div>
                )}

                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-none">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {user.role === 'ADMIN' ? 'Teacher / Admin' : user.usn || user.email}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {user.role}
                </span>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation row */}
      {user && (
        <div className="md:hidden border-t border-slate-200 bg-slate-50/80 px-4 py-2 flex justify-around text-xs font-medium text-slate-600">
          {isAdmin ? (
            <>
              <Link
                href="/admin/dashboard"
                className={pathname === '/admin/dashboard' ? 'text-indigo-600 font-bold' : ''}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/locations"
                className={pathname === '/admin/locations' ? 'text-indigo-600 font-bold' : ''}
              >
                Locations
              </Link>
              <Link
                href="/admin/sessions"
                className={pathname === '/admin/sessions' ? 'text-indigo-600 font-bold' : ''}
              >
                Sessions
              </Link>
              <Link
                href="/admin/students"
                className={pathname === '/admin/students' ? 'text-indigo-600 font-bold' : ''}
              >
                Students
              </Link>
              <Link
                href="/admin/reports"
                className={pathname === '/admin/reports' ? 'text-indigo-600 font-bold' : ''}
              >
                Reports
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/student/dashboard"
                className={pathname === '/student/dashboard' ? 'text-indigo-600 font-bold' : ''}
              >
                Mark Attendance
              </Link>
              <Link
                href="/student/history"
                className={pathname === '/student/history' ? 'text-indigo-600 font-bold' : ''}
              >
                History & %
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
