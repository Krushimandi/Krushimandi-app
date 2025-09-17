import { UserLocation } from '../services/buyerService';

export type AnyLocation = string | UserLocation | null | undefined;

/**
 * Format a location (string or structured object) into a user-friendly string.
 * Prefers explicit city,district,state ordering; falls back to formattedAddress; finally JSON/string fallback.
 */
export function formatLocation(location: AnyLocation): string {
  if (!location) return 'Unknown Location';
  if (typeof location === 'string') {
    const trimmed = location.trim();
    return trimmed.length > 0 ? trimmed : 'Unknown Location';
  }
  try {
    const { city, district, state, formattedAddress } = location as UserLocation;
    const parts = [city, district, state].filter(p => !!p && String(p).trim().length > 0);
    if (parts.length > 0) return parts.join(', ');
    if (formattedAddress && typeof formattedAddress === 'string') return formattedAddress;
    // Last resort: show at least keys/values if meaningful
    const json = Object.entries(location)
      .filter(([k, v]) => typeof v === 'string' && v.trim().length > 0 && !['formattedAddress'].includes(k))
      .map(([k, v]) => v.trim())
      .join(', ');
    if (json.length > 0) return json;
    return 'Unknown Location';
  } catch {
    return 'Unknown Location';
  }
}
