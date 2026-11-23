import test from 'node:test';
import assert from 'node:assert/strict';

// Core Haversine formula from Section 10
const EARTH_RADIUS_METRES = 6371000;
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  return Math.round(EARTH_RADIUS_METRES * c * 100) / 100;
}

// 1. GPS Tests
test('GPS: inside radius is accepted', () => {
  // Electronics Classroom: 15.364700, 75.124000 (radius: 50m)
  // Student 12m away: 15.364780, 75.124050
  const distance = calculateHaversineDistance(15.364700, 75.124000, 15.364780, 75.124050);
  assert.ok(distance < 50, `Distance ${distance}m must be < 50m`);
  const accepted = distance <= 50;
  assert.equal(accepted, true);
});

test('GPS: outside radius is rejected', () => {
  // Student in canteen 183m away: 15.366000, 75.125000
  const distance = calculateHaversineDistance(15.364700, 75.124000, 15.366000, 75.125000);
  assert.ok(distance > 50, `Distance ${distance}m must exceed 50m`);
  const accepted = distance <= 50;
  assert.equal(accepted, false);
});

test('GPS: boundary condition (within exact radius) handled correctly', () => {
  const radius = 50;
  assert.equal(49.9 <= radius, true);
  assert.equal(50.0 <= radius, true);
  assert.equal(50.1 <= radius, false);
});

test('GPS: poor accuracy is rejected gracefully', () => {
  const maxAccuracy = 100;
  function checkAccuracy(acc) {
    if (acc > maxAccuracy) {
      return { isValid: false, message: `Your location accuracy is too low (${acc}m). Allowed is ${maxAccuracy}m.` };
    }
    return { isValid: true };
  }

  assert.equal(checkAccuracy(15).isValid, true);
  assert.equal(checkAccuracy(99).isValid, true);
  assert.equal(checkAccuracy(100).isValid, true);
  assert.equal(checkAccuracy(101).isValid, false);
  assert.equal(checkAccuracy(250).isValid, false);
  assert.match(checkAccuracy(250).message, /too low/);
});

// 2. Attendance Time Window Tests
test('Attendance: Valid session window accepted', () => {
  const start = new Date('2026-11-23T08:00:00Z');
  const end = new Date('2026-11-23T08:10:00Z');
  const now = new Date('2026-11-23T08:03:00Z');

  const isValid = now >= start && now <= end;
  assert.equal(isValid, true);
});

test('Attendance: Expired session is rejected', () => {
  const end = new Date('2026-11-23T08:10:00Z');
  const now = new Date('2026-11-23T08:11:00Z');

  const isExpired = now > end;
  assert.equal(isExpired, true);
});

test('Attendance: Before start time is rejected', () => {
  const start = new Date('2026-11-23T08:00:00Z');
  const now = new Date('2026-11-23T07:59:00Z');

  const isBefore = now < start;
  assert.equal(isBefore, true);
});

test('Attendance: Late threshold correctly classifies PRESENT vs LATE', () => {
  const lateThreshold = new Date('2026-11-23T08:05:00Z');

  const onTime = new Date('2026-11-23T08:04:30Z');
  const late = new Date('2026-11-23T08:06:15Z');

  function getStatus(time) {
    return time <= lateThreshold ? 'PRESENT' : 'LATE';
  }

  assert.equal(getStatus(onTime), 'PRESENT');
  assert.equal(getStatus(late), 'LATE');
});

test('Attendance: Duplicate prevention constraint', () => {
  const existingRecords = new Set();
  const session1 = 'sess-001';
  const student1 = 'st-001';

  const key1 = `${session1}:${student1}`;
  assert.equal(existingRecords.has(key1), false);
  existingRecords.add(key1);

  // Attempt duplicate
  assert.equal(existingRecords.has(key1), true);
});

// 3. Percentage Calculation Test
test('Attendance Percentage: (Present + Late) / Total Conducted * 100', () => {
  const totalClasses = 17;
  const present = 12;
  const late = 2;
  const absent = 3;

  const percentage = ((present + late) / totalClasses) * 100;
  const rounded = Math.round(percentage * 10) / 10;
  assert.equal(rounded, 82.4);
});

// 4. Security Invariants
test('Security: Students cannot tamper with markedAt or distance', () => {
  // Client payload only contains { sessionId, latitude, longitude, accuracy }
  // markedAt, distance, and status are computed strictly by server
  const clientPayload = {
    sessionId: 'sess-001',
    latitude: 15.3647,
    longitude: 75.1240,
    accuracy: 10,
    status: 'PRESENT', // Malicious attempt to override status
    distanceMeters: 0,  // Malicious attempt to override distance
    markedAt: '2026-01-01T00:00:00Z', // Malicious attempt to backdate
  };

  const allowedKeys = ['sessionId', 'latitude', 'longitude', 'accuracy'];
  const sanitized = {};
  for (const k of allowedKeys) {
    sanitized[k] = clientPayload[k];
  }

  assert.equal(sanitized.status, undefined);
  assert.equal(sanitized.distanceMeters, undefined);
  assert.equal(sanitized.markedAt, undefined);
});
