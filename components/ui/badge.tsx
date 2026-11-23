import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'present' | 'late' | 'absent' | 'not_marked' | 'verified' | 'neutral' | 'outline';
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const variantStyles = {
    present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    late: 'bg-amber-100 text-amber-800 border-amber-200',
    absent: 'bg-rose-100 text-rose-800 border-rose-200',
    not_marked: 'bg-slate-100 text-slate-700 border-slate-200',
    verified: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    outline: 'border-slate-300 text-slate-700 bg-white',
  };

  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function AttendanceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PRESENT':
      return (
        <Badge variant="present">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Present
        </Badge>
      );
    case 'LATE':
      return (
        <Badge variant="late">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Late
        </Badge>
      );
    case 'ABSENT':
      return (
        <Badge variant="absent">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Absent
        </Badge>
      );
    case 'REJECTED_LOCATION':
      return (
        <Badge variant="absent">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Outside Radius
        </Badge>
      );
    case 'REJECTED_TIME':
      return (
        <Badge variant="late">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Expired Window
        </Badge>
      );
    case 'NOT_MARKED':
    default:
      return (
        <Badge variant="not_marked">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Not Marked
        </Badge>
      );
  }
}
