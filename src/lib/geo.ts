/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param miles Distance in miles
 * @returns Formatted string like "5 mi" or "< 1 mi"
 */
export function formatDistance(miles: number): string {
  if (miles < 1) {
    return "< 1 mi";
  }
  return `${Math.round(miles)} mi`;
}

/**
 * Check if a point is within a radius of another point
 * @param lat1 Latitude of center point
 * @param lng1 Longitude of center point
 * @param lat2 Latitude of point to check
 * @param lng2 Longitude of point to check
 * @param radiusMiles Radius in miles
 * @returns True if point is within radius
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMiles: number
): boolean {
  return calculateDistance(lat1, lng1, lat2, lng2) <= radiusMiles;
}
