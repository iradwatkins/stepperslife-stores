/**
 * Utility function to format event location for display
 * Handles both legacy string format and new object format
 */
export function formatEventLocation(location: any): string {
  if (!location) return '';

  // Handle legacy string format
  if (typeof location === 'string') return location;

  // Handle object format
  const parts: string[] = [];

  if (location.venueName) {
    parts.push(location.venueName);
  }

  if (location.city && location.state) {
    parts.push(`${location.city}, ${location.state}`);
  } else if (location.city) {
    parts.push(location.city);
  } else if (location.state) {
    parts.push(location.state);
  }

  return parts.join(', ');
}

/**
 * Get full address string including street address
 */
export function formatFullAddress(location: any): string {
  if (!location) return '';

  if (typeof location === 'string') return location;

  const parts: string[] = [];

  if (location.venueName) parts.push(location.venueName);
  if (location.address) parts.push(location.address);

  const cityStateZip: string[] = [];
  if (location.city) cityStateZip.push(location.city);
  if (location.state) cityStateZip.push(location.state);
  if (location.zipCode) cityStateZip.push(location.zipCode);

  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }

  if (location.country && location.country !== 'US') {
    parts.push(location.country);
  }

  return parts.join(', ');
}
