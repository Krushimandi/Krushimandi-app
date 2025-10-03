/**
 * Formatter Utilities
 * Format data for display
 */

import { Fruit } from '../types/fruit';
import i18n from '../i18n';

// Format currency
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  // Keep Indian number formatting for currency; can be adjusted per locale if required
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Format date
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Use locale based on selected app language
  const lang = i18n.language || 'en';
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format relative time
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return i18n.t('time.justNow', { defaultValue: 'Just now' });
  if (diffInMinutes < 60) return i18n.t('time.minutesAgo_short', { count: diffInMinutes, defaultValue: '{{count}}m ago' });
  if (diffInHours < 24) return i18n.t('time.hoursAgo_short', { count: diffInHours, defaultValue: '{{count}}h ago' });
  if (diffInDays < 7) return i18n.t('time.daysAgo_short', { count: diffInDays, defaultValue: '{{count}}d ago' });
  
  return formatDate(dateObj);
};

// Format quantity with unit
export const formatQuantity = (quantity: number, unit: string): string => {
  return `${quantity} ${unit}`;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// === FRUIT-SPECIFIC FORMATTERS (moved from sampleFruits) ===

// Helper function to format price for display
export const formatPrice = (pricePerKg: number): string => {
  // Use per-kg unit from translations
  const perKg = i18n.t('units.perKg', { defaultValue: '/kg' });
  return `₹${pricePerKg}${perKg}`;
};

// Helper function to format fruit quantity for display (overloaded version)
export const formatFruitQuantity = (quantity: [number, number]): string => {
  const [min, max] = quantity;
  const ton = (n: number) => i18n.t(`units.ton_${n === 1 ? 'one' : 'other'}`, { count: n, defaultValue: n === 1 ? 'ton' : 'tons' });
  if (min === 0 && max === 0) {
    return `0 ${ton(0 as unknown as number)}`; // falls back to plural in defaultValue
  }
  if (min === max) {
    return `${min} ${ton(min)}`;
  }
  return `${min}-${max} ${ton(max)}`;
};

// Helper function to format location for display
export const formatLocation = (location: Fruit['location']): string => {
  if (!location) {
    return i18n.t('common.locationNotAvailable', { defaultValue: 'Location not available' });
  }
  return `${location.city}, ${location.district}, ${location.state}`;
};

// Helper function to get days since created
export const getDaysSince = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to get relative time display (fruit-specific version)
export const getRelativeTime = (dateString: string): string => {
  const days = getDaysSince(dateString);
  
  if (days === 0) return i18n.t('time.today', { defaultValue: 'Today' });
  if (days === 1) return i18n.t('time.dayAgo', { defaultValue: '1 day ago' });
  if (days < 7) return i18n.t('time.daysAgo', { count: days, defaultValue: '{{count}} days ago' });
  if (days === 7) return i18n.t('time.weekAgo', { defaultValue: '1 week ago' });
  if (days < 14) return i18n.t('time.weekAgo', { defaultValue: '1 week ago' });
  if (days < 30) return i18n.t('time.weeksAgo', { count: Math.floor(days / 7), defaultValue: '{{count}} weeks ago' });
  if (days < 60) return i18n.t('time.monthAgo', { defaultValue: '1 month ago' });
  if (days < 365) return i18n.t('time.monthsAgo', { count: Math.floor(days / 30), defaultValue: '{{count}} months ago' });
  const years = Math.floor(days / 365);
  if (years <= 1) return i18n.t('time.yearAgo', { defaultValue: '1 year ago' });
  return i18n.t('time.yearsAgo', { count: years, defaultValue: '{{count}} years ago' });
};

// Utility to split relative time into number and label
export const getDisplayParts = (text: string): [string, string] => {
  // Language-aware split: try to extract a leading number and the rest, else show full text below
  const todayKey = i18n.t('time.today', { defaultValue: 'Today' });
  if (text === todayKey) return ['-', todayKey.toUpperCase()];

  // Use Unicode regex to capture number-first patterns (e.g., "2 days ago", "2 दिन पहले", "2 दिवसांपूर्वी")
  const match = text.match(/^(\d+)\s+(.+)$/u);
  if (match) {
    const number = match[1];
    const rest = match[2].toUpperCase();
    return [number, rest];
  }

  // Fallback: show full text on second line
  return ['-', text.toUpperCase()];
};

