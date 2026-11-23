'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Check,
  ShieldCheck,
  Navigation,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { LocationPickerMap } from '@/components/maps/LocationPickerMap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttendanceLocation } from '@/types';
import { Navbar } from '@/components/ui/navbar';

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState<number>(15.3647);
  const [longitude, setLongitude] = useState<number>(75.1240);
  const [radiusMeters, setRadiusMeters] = useState<number>(50);
  const [maxAccuracyMeters, setMaxAccuracyMeters] = useState<number>(100);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success && data.locations) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // Try to obtain real device GPS coordinates on mount
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const handleSelectToEdit = (loc: AttendanceLocation) => {
    setEditingId(loc.id);
    setName(loc.name);
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setRadiusMeters(loc.radius_meters);
    setMaxAccuracyMeters(loc.max_accuracy_meters || 100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setEditingId(null);
    setName('');
    setLatitude(15.3647);
    setLongitude(75.1240);
    setRadiusMeters(50);
    setMaxAccuracyMeters(100);
    setSuccessMessage(null);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name: name.trim(),
          latitude,
          longitude,
          radius_meters: radiusMeters,
          max_accuracy_meters: maxAccuracyMeters,
          active: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(editingId ? 'Location updated successfully!' : 'New location added!');
        fetchLocations();
        setTimeout(() => {
          handleResetForm();
        }, 1200);
      }
    } catch {
      console.error('Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Location Management
          </h1>
          <p className="text-xs text-slate-500">
            Define authorized classroom coordinates and GPS geofence radiuses for attendance sessions
          </p>
        </div>

        {editingId && (
          <Button size="sm" variant="outline" onClick={handleResetForm}>
            Cancel Edit / Add New
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Location Form */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  {editingId ? 'Edit Attendance Location' : 'Configure New Attendance Location'}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Interactive OpenStreetMap</span>
              </div>

              {/* Interactive Leaflet Map */}
              <LocationPickerMap
                latitude={latitude}
                longitude={longitude}
                radiusMeters={radiusMeters}
                maxAccuracyMeters={maxAccuracyMeters}
                onLocationChange={(newLat, newLon) => {
                  setLatitude(newLat);
                  setLongitude(newLon);
                }}
              />

              <form onSubmit={handleSaveLocation} className="space-y-4 pt-2">
                <Input
                  label="Location Name"
                  required
                  placeholder="e.g. Electronics Classroom 302, Digital Systems Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-1">
                      Allowed Radius ({radiusMeters} metres)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={200}
                      step={5}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>10m (Small Lab)</span>
                      <span className="font-bold text-indigo-600">{radiusMeters}m</span>
                      <span>200m (Auditorium)</span>
                    </div>
                  </div>

                  <Input
                    label="Max GPS Accuracy Threshold (m)"
                    type="number"
                    min={15}
                    max={300}
                    value={maxAccuracyMeters}
                    onChange={(e) => setMaxAccuracyMeters(Number(e.target.value))}
                    helperText="Rejects signals with uncertainty higher than this"
                  />
                </div>

                {/* Pre-save confirmation card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                  <div className="font-bold text-slate-800">Confirmation Summary:</div>
                  <div className="text-slate-600">
                    Location: <strong>{name || 'Untitled Location'}</strong>
                  </div>
                  <div className="text-slate-600 font-mono">
                    Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)} | Radius: {radiusMeters}m
                  </div>
                </div>

                {successMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  isLoading={saving}
                  className="w-full gap-2 text-sm font-bold uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'CONFIRM & UPDATE LOCATION' : 'CONFIRM LOCATION'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Existing Saved Locations */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Configured Classrooms & Labs ({locations.length})
              </h3>
              <p className="text-xs text-slate-500">
                These locations are selectable when initiating an attendance session.
              </p>

              <div className="divide-y divide-slate-100">
                {locations.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No classrooms configured yet.</p>
                    <p className="mt-1">
                      Click <strong>"Use Current GPS Location"</strong> on the map to save your first classroom!
                    </p>
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div key={loc.id} className="py-3 flex items-start justify-between gap-3 group">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{loc.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                            Radius: {loc.radius_meters}m
                          </span>
                          <span className="text-slate-400">
                            Max Acc: {loc.max_accuracy_meters || 100}m
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectToEdit(loc)}
                        className="text-xs h-7 px-2"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  </div>
);
}
