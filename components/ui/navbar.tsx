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
  History,
  CheckCircle2,
  FileText,
  Layers,
  BookOpen,
  FolderTree,
  User,
  Radio,
  Menu,
  X,
} from 'lucide-react';
import { Profile } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const adminNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/semesters', label: 'Semesters', icon: Layers },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/sections', label: 'Sections', icon: FolderTree },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/locations', label: 'Locations', icon: MapPin },
    { href: '/admin/sessions', label: 'Sessions', icon: Calendar },
    { href: '/admin/attendance', label: 'Live Attendance', icon: Radio },
    { href: '/admin/reports', label: 'Reports', icon: FileText },
  ];

  const studentNavItems = [
    { href: '/student/dashboard', label: 'Dashboard', icon: CheckCircle2 },
    { href: '/student/sessions', label: 'My Sessions', icon: Calendar },
    { href: '/student/history', label: 'Attendance History', icon: History },
    { href: '/student/profile', label: 'My Profile', icon: User },
  ];

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
                  {isAdmin ? 'Admin Portal' : 'Student Portal'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto py-1">
            {isAdmin ? (
              adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </span>
                  </Link>
                );
              })
            ) : user ? (
              studentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                  </Link>
                );
              })
            ) : null}
          </nav>

          {/* User profile & actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {user.name.charAt(0).toUpperCase()}
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
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline-block ${
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

                {/* Mobile hamburger button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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

      {/* Mobile navigation dropdown */}
      {user && mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 shadow-lg space-y-1">
          {(isAdmin ? adminNavItems : studentNavItems).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
