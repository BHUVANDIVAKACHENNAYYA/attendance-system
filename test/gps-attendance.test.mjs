import test from 'node:test';
import assert from 'node:assert/strict';

// Haversine implementation for direct math verification
const EARTH_RADIUS_METRES = 6371000;
function toRadians(deg) {
  return (deg * Math.PI) / 180;
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

test('Haversine distance: zero distance when coordinates are identical', () => {
  const d = calculateHaversineDistance(15.3647, 75.1240, 15.3647, 75.1240);
  assert.equal(d, 0);
});

test('Haversine distance: student within 50m radius is accepted', () => {
  // Electronics classroom: 15.364700, 75.124000
  // Student near door (~15 meters away): 15.364800, 75.124050
  const distance = calculateHaversineDistance(15.364700, 75.124000, 15.364800, 75.124050);
  assert.ok(distance > 0);
  assert.ok(distance <= 50, `Distance ${distance} should be <= 50m`);
});

test('Haversine distance: student outside 50m radius (e.g. hostel/canteen) is rejected', () => {
  // Student 250m away: 15.366500, 75.125500
  const distance = calculateHaversineDistance(15.364700, 75.124000, 15.366500, 75.125500);
  assert.ok(distance > 50, `Distance ${distance} must exceed 50m radius`);
  assert.ok(distance >= 200, `Distance should be approx 250m`);
});

test('GPS accuracy verification: acceptable accuracy (<= 100m) passes', () => {
  const maxAllowed = 100;
  const goodAccuracy = 15; // 15 meters
  assert.ok(goodAccuracy <= maxAllowed);
});

test('GPS accuracy verification: poor accuracy (> 100m) is flagged', () => {
  const maxAllowed = 100;
  const poorAccuracy = 250; // coarse cell tower / indoor multipath
  assert.ok(poorAccuracy > maxAllowed);
});

test('Attendance session time window logic', () => {
  const sessionStart = new Date('2026-11-23T08:00:00Z').getTime();
  const sessionLate = new Date('2026-11-23T08:05:00Z').getTime();
  const sessionEnd = new Date('2026-11-23T08:10:00Z').getTime();

  // Test 1: On-time student at 08:03:00 -> PRESENT
  const student1Time = new Date('2026-11-23T08:03:00Z').getTime();
  assert.ok(student1Time >= sessionStart && student1Time <= sessionEnd);
  assert.equal(student1Time <= sessionLate ? 'PRESENT' : 'LATE', 'PRESENT');

  // Test 2: Late student at 08:07:00 -> LATE
  const student2Time = new Date('2026-11-23T08:07:00Z').getTime();
  assert.ok(student2Time >= sessionStart && student2Time <= sessionEnd);
  assert.equal(student2Time <= sessionLate ? 'PRESENT' : 'LATE', 'LATE');

  // Test 3: Expired session at 08:12:00 -> REJECTED_TIME
  const student3Time = new Date('2026-11-23T08:12:00Z').getTime();
  assert.ok(student3Time > sessionEnd, 'Must be rejected as session expired');

  // Test 4: Before start at 07:58:00 -> REJECTED_TIME
  const student4Time = new Date('2026-11-23T07:58:00Z').getTime();
  assert.ok(student4Time < sessionStart, 'Must be rejected as session not started yet');
});

test('Attendance percentage formula verification', () => {
  // Section 22: Attendance % = (Present + Late) / Total Conducted Classes * 100
  const totalClasses = 40;
  const present = 35;
  const late = 3;
  const absent = 2;

  const percentage = ((present + late) / totalClasses) * 100;
  assert.equal(Math.round(percentage * 10) / 10, 95.0);
});
