'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Crosshair, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracyMeters?: number;
  onLocationChange: (lat: number, lon: number) => void;
  onRadiusChange?: (radius: number) => void;
}

export function LocationPickerMap({
  latitude,
  longitude,
  radiusMeters,
  maxAccuracyMeters = 100,
  onLocationChange,
  onRadiusChange,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [deviceAccuracy, setDeviceAccuracy] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet on client-side only
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths in Next.js bundler
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([latitude, longitude], 17);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Marker for target location
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        markerRef.current = marker;

        // Radius circle for allowed attendance boundary
        const circle = L.circle([latitude, longitude], {
          radius: radiusMeters,
          color: '#4f46e5',
          fillColor: '#6366f1',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
        circleRef.current = circle;

        // On map click, move marker and update coordinates
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          onLocationChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        });

        // On marker drag
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          circle.setLatLng(pos);
          onLocationChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });

        mapInstanceRef.current = map;
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map when latitude/longitude props change from parent
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setRadius(radiusMeters);
      mapInstanceRef.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude, radiusMeters]);

  // Handle "Use Current Location" button
  const handleUseCurrentLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);

        setDeviceAccuracy(acc);
        setLocating(false);
        onLocationChange(lat, lon);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([lat, lon]);
          circleRef.current.setLatLng([lat, lon]);
          mapInstanceRef.current.setView([lat, lon], 18);
        }
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please allow access in browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError('Unable to obtain GPS coordinates. Please check your location services.');
            break;
          case err.TIMEOUT:
            setGpsError('GPS request timed out. Please try again.');
            break;
          default:
            setGpsError('Failed to retrieve location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Map Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Crosshair className="w-4 h-4 text-indigo-600" />
          <span>Click anywhere on the map or drag the pin to set the center.</span>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleUseCurrentLocation}
          isLoading={locating}
          className="gap-1.5 text-xs h-8 bg-white"
        >
          <Navigation className="w-3.5 h-3.5 text-indigo-600" />
          Use Current GPS Location
        </Button>
      </div>

      {gpsError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {deviceAccuracy !== null && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center justify-between">
          <span>Detected device GPS accuracy: ±{deviceAccuracy} metres</span>
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> High Precision Mode
          </span>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Radius Visualizer & Coordinates Readout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
        <div>
          <span className="block font-semibold text-slate-800">Target Latitude:</span>
          <span className="font-mono text-slate-600">{latitude.toFixed(6)}</span>
        </div>
        <div>
          <span className="block font-semibold text-slate-800">Target Longitude:</span>
          <span className="font-mono text-slate-600">{longitude.toFixed(6)}</span>
        </div>
        <div>
          <span className="block font-semibold text-slate-800">Permitted Radius:</span>
          <span className="font-mono text-indigo-600 font-bold">{radiusMeters} metres</span>
        </div>
      </div>
    </div>
  );
}
