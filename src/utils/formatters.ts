/**
 * Formatter Utilities
 * Format data for display
 */

import { Fruit } from '../types/fruit';

// Format currency
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
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
  return dateObj.toLocaleDateString('en-IN', {
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

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
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
  return `₹${pricePerKg}/KG`;
};

// Helper function to format fruit quantity for display (overloaded version)
export const formatFruitQuantity = (quantity: [number, number]): string => {
  if (quantity[0] === 0 && quantity[1] === 0) {
    return "0 tons";
  }
  if (quantity[0] === quantity[1]) {
    return `${quantity[0]} tons`;
  }
  return `${quantity[0]}-${quantity[1]} tons`;
};

// Helper function to format location for display
export const formatLocation = (location: Fruit['location']): string => {
  if (!location) {
    return "Location not available";
  }
  return `${location.village}, ${location.district}, ${location.state}`;
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
  
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days === 7) return '1 week ago';
  if (days < 14) return `${Math.floor(days / 7)} week ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days === 30) return '1 month ago';
  if (days < 60) return '1 month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
};

// Utility to split relative time into number and label
export const getDisplayParts = (text: string): [string, string] => {
  if (text === 'Today') return ['-', 'TODAY'];
  const match = text.match(/^(\d+)\s+(\w+)/); // e.g. "2 days ago"
  if (match) {
    const number = match[1];
    let unit = match[2].toUpperCase();

    // Singular/plural fix
    if (unit === 'DAY') unit = 'DAY AGO';
    else if (unit === 'WEEK') unit = 'WEEK AGO';
    else if (unit === 'MONTH') unit = 'MONTH AGO';
    else if (unit === 'YEAR') unit = 'YEAR AGO';
    else unit = `${unit} AGO`;

    // plural
    if (parseInt(number) > 1 && !unit.endsWith('S AGO')) {
      unit = unit.replace(' AGO', 'S AGO');
    }

    return [number, unit];
  }

  // fallback
  return ['-', text.toUpperCase()];
};

