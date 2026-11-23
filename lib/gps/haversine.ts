/**
 * Haversine formula for calculating geodetic distance between two coordinates in metres.
 * 
 * Formula:
 * R = 6,371,000 metres (mean Earth radius)
 * Δlat = lat2 - lat1 (in radians)
 * Δlon = lon2 - lon1 (in radians)
 * a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
 * c = 2 * atan2(√a, √(1-a))
 * distance = R * c
 */

const EARTH_RADIUS_METRES = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two geographic coordinates in metres.
 *
 * @param lat1 Latitude of first point in decimal degrees
 * @param lon1 Longitude of first point in decimal degrees
 * @param lat2 Latitude of second point in decimal degrees
 * @param lon2 Longitude of second point in decimal degrees
 * @returns Distance in metres rounded to 2 decimal places
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  // Avoid potential floating point inaccuracies exceeding 1
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distance = EARTH_RADIUS_METRES * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Validates whether student's coordinates are within the permitted radius of the target location.
 */
export function verifyGpsProximity(
  studentLat: number,
  studentLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): {
  isWithinRadius: boolean;
  distanceMeters: number;
} {
  const distance = calculateHaversineDistance(studentLat, studentLon, targetLat, targetLon);
  return {
    isWithinRadius: distance <= radiusMeters,
    distanceMeters: distance,
  };
}
