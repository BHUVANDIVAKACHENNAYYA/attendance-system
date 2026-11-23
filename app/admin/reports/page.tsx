'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/ui/navbar';
import Papa from 'papaparse';

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'sessions' | 'audit'>('students');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReportData(data);
        }
      })
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    if (!reportData) return;

    let csvContent = '';
    let fileName = '';

    if (activeTab === 'students') {
      const dataToExport = reportData.studentReports.map((s: any) => ({
        Name: s.name,
        USN: s.usn,
        Email: s.email,
        Semester: s.semester,
        Section: s.section,
        TotalClasses: s.totalClasses,
        Present: s.present,
        Late: s.late,
        Absent: s.absent,
        Percentage: `${s.percentage}%`,
        EligibilityStatus: s.status,
      }));
      csvContent = Papa.unparse(dataToExport);
      fileName = `Student_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      const dataToExport = reportData.sessionReports.map((sess: any) => ({
        Date: sess.date,
        Subject: sess.subject,
        Class: sess.className,
        Location: sess.locationName,
        TotalStudents: sess.totalStudents,
        Present: sess.present,
        Late: sess.late,
        Absent: sess.absent,
        AttendanceRate: `${sess.attendanceRate}%`,
        SessionStatus: sess.status,
      }));
      csvContent = Papa.unparse(dataToExport);
      fileName = `Daily_Session_Report_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Generating analytics & attendance reports...</p>
        </div>
      </div>
    );
  }

  const { summary, studentReports, sessionReports, auditLogs } = reportData || {
    summary: { totalStudents: 0, totalSessions: 0, averageAttendance: 0 },
    studentReports: [],
    sessionReports: [],
    auditLogs: [],
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6 print:m-0 print:p-0">
        {/* Header & Export Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Official monthly & daily attendance records, percentage calculations, and compliance audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </Button>

          <Button size="sm" variant="primary" onClick={handleExportCsv} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Enrolled Class
          </span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
            {summary.totalStudents} Students
          </div>
          <span className="text-[11px] text-slate-400">Section 5A Class Roster</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Conducted Classes
          </span>
          <div className="text-3xl font-extrabold text-indigo-600 font-mono mt-1">
            {summary.totalSessions} Sessions
          </div>
          <span className="text-[11px] text-slate-400">GPS Verified Windows</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Average Class Attendance
          </span>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono mt-1">
            {summary.averageAttendance}%
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Classroom Aggregate</span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center space-x-2 border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
            activeTab === 'students'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Student-Wise Percentage Report ({studentReports.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
            activeTab === 'sessions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Daily Session Logs ({sessionReports.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Audit Trail Log ({auditLogs.length})
        </button>
      </div>

      {/* Report Table View */}
      <Card className="border-slate-200 overflow-hidden">
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">USN</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Conducted</th>
                  <th className="py-3 px-4 text-center">Present</th>
                  <th className="py-3 px-4 text-center">Late</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-right">Attendance %</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentReports.map((st: any) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{st.usn}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                    <td className="py-3 px-4 text-center font-mono">{st.totalClasses}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700">{st.present}</td>
                    <td className="py-3 px-4 text-center font-mono text-amber-700">{st.late}</td>
                    <td className="py-3 px-4 text-center font-mono text-rose-700">{st.absent}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-indigo-600">
                      {st.percentage}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          st.percentage >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.percentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE (<75%)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Classroom Location</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-center">Present</th>
                  <th className="py-3 px-4 text-center">Late</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sessionReports.map((sess: any) => (
                  <tr key={sess.sessionId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{sess.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{sess.subject}</td>
                    <td className="py-3 px-4 text-slate-600">{sess.locationName}</td>
                    <td className="py-3 px-4 text-center font-mono">{sess.totalStudents}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700 font-bold">
                      {sess.present}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-700">{sess.late}</td>
                    <td className="py-3 px-4 text-center font-mono text-rose-700">{sess.absent}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                      {sess.attendanceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.metadata ? JSON.stringify(log.metadata) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  </div>
);
}
