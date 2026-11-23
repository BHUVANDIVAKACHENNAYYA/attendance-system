import React from 'react';
import { Users, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

interface StatCardsProps {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  notMarkedCount: number;
}

export function StatCards({
  totalStudents,
  presentCount,
  lateCount,
  notMarkedCount,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* TOTAL STUDENTS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Students
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
          {totalStudents}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Classroom Enrollment</div>
      </div>

      {/* PRESENT */}
      <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Present
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-emerald-700 mt-2 font-mono">
          {presentCount}
        </div>
        <div className="text-[11px] text-emerald-600 font-medium mt-1">Within GPS Radius</div>
      </div>

      {/* LATE */}
      <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Late
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-amber-700 mt-2 font-mono">
          {lateCount}
        </div>
        <div className="text-[11px] text-amber-600 font-medium mt-1">After Late Threshold</div>
      </div>

      {/* NOT MARKED / ABSENT */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Not Marked
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-slate-700 mt-2 font-mono">
          {notMarkedCount}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Pending submission</div>
      </div>
    </div>
  );
}
