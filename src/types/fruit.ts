/**
 * Fruit Data Schema
 * Consistent data structure for fruits throughout the application
 */

export interface FruitLocation {
  village: string;
  district: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

export interface Fruit {
  id: string; // Firestore doc ID or generated UUID
  name: string;
  type: string; // For filtering/search (orange, mango, apple, etc.)
  grade: 'A' | 'B' | 'C';
  description: string;
  
  quantity: [number, number]; // [min, max] in tons
  price_per_kg: number;

  availability_date: string; // ISO date string
  image_urls: string[];
  
  location: FruitLocation;

  // Reference only
  farmer_id: string;

  // Platform status & metadata
  status: 'active' | 'sold' | 'inactive';
  views: number;
  likes: number;
  
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Helper type for filtering
export type FruitType = 'orange' | 'mango' | 'apple' | 'banana' | 'grapes' | 'pomegranate' | 'all';

// Helper type for status
export type FruitStatus = 'active' | 'sold' | 'inactive';

// Helper type for grade
export type FruitGrade = 'A' | 'B' | 'C';

// For backward compatibility with existing code
export interface LegacyFruit {
  id: number;
  name: string;
  category: string;
  price: string;
  originalPrice?: string;
  location: string;
  available: string;
  rating?: number;
  image: any;
  listedDate?: number;
  status: string;
  views: number;
  inquiries?: number;
  soldQuantity?: string;
}
