'use client';

import React, { useState } from 'react';
import { Search, Filter, ShieldCheck, Edit3, X, Check } from 'lucide-react';
import { AttendanceStatusBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface AttendanceRow {
  no: number;
  studentId: string;
  name: string;
  usn: string;
  email: string;
  semester: string;
  section: string;
  photoUrl?: string | null;
  markedTime: string;
  distance: string;
  rawDistance: number | null;
  status: 'PRESENT' | 'LATE' | 'NOT_MARKED' | 'ABSENT';
  locationVerified: boolean;
  recordId: string | null;
}

interface LiveAttendanceTableProps {
  sessionId: string;
  attendanceList: AttendanceRow[];
  onRecordUpdated: () => void;
}

export function LiveAttendanceTable({
  sessionId,
  attendanceList,
  onRecordUpdated,
}: LiveAttendanceTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Manual correction dialog state
  const [selectedRow, setSelectedRow] = useState<AttendanceRow | null>(null);
  const [newStatus, setNewStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'NOT_MARKED'>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filter students based on search and status
  const filteredList = attendanceList.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.usn.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCorrection = (row: AttendanceRow) => {
    setSelectedRow(row);
    setNewStatus(row.status === 'NOT_MARKED' ? 'PRESENT' : row.status);
    setCorrectionReason('');
    setActionMessage(null);
  };

  const handleSaveCorrection = async () => {
    if (!selectedRow || !correctionReason.trim()) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/attendance/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: selectedRow.recordId || undefined,
          sessionId,
          studentId: selectedRow.studentId,
          status: newStatus,
          reason: correctionReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage('Attendance updated successfully.');
        setTimeout(() => {
          setSelectedRow(null);
          onRecordUpdated();
        }, 800);
      } else {
        setActionMessage(data.message || 'Failed to update attendance.');
      }
    } catch {
      setActionMessage('Network error occurred.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header & Search/Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>Live Attendance Roster</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
              {filteredList.length} Students
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Real-time GPS proximity validation & automatic time-window recording
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search by Name / USN */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name or USN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="NOT_MARKED">Not Marked</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">USN</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Distance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No matching student records found.
                </td>
              </tr>
            ) : (
              filteredList.map((row) => (
                <tr key={row.studentId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400">{row.no}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      {row.photoUrl ? (
                        <img
                          src={row.photoUrl}
                          alt={row.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {row.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span>{row.name}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Sem {row.semester} - Sec {row.section}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{row.usn}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{row.markedTime}</td>
                  <td className="py-3.5 px-4 font-mono">
                    {row.distance !== '--' ? (
                      <span className="text-indigo-600 font-semibold">{row.distance}</span>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <AttendanceStatusBadge status={row.status} />
                      {row.locationVerified && (
                        <Badge variant="verified" title="Location Verified by Server">
                          <ShieldCheck className="w-3 h-3" />
                          GPS
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenCorrection(row)}
                      className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Manually correct attendance"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Correction Modal Dialog */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                Manual Attendance Correction
              </h4>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Student:</span>
                <strong className="text-slate-800 text-sm">{selectedRow.name}</strong> ({selectedRow.usn})
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Updated Attendance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PRESENT', 'LATE', 'ABSENT', 'NOT_MARKED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition ${
                        newStatus === st
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Manual Override (Required for Audit Log)
                </label>
                <textarea
                  rows={2}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Device dead battery, student present at front row"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {actionMessage && (
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                  {actionMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setSelectedRow(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveCorrection}
                isLoading={updating}
                disabled={!correctionReason.trim()}
              >
                Save Correction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
