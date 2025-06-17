/**
 * App Constants and Enums for KrushiMandi
 */

// User Types
export enum UserType {
  FARMER = 'farmer',
  BUYER = 'buyer',
  ADMIN = 'admin',
}

// User Status
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

// Order Status
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Product Categories
export enum ProductCategory {
  FRUITS = 'fruits',
  VEGETABLES = 'vegetables',
  GRAINS = 'grains',
  PULSES = 'pulses',
  SPICES = 'spices',
  DAIRY = 'dairy',
  ORGANIC = 'organic',
}

// Quality Grades
export enum QualityGrade {
  A_GRADE = 'A',
  B_GRADE = 'B',
  C_GRADE = 'C',
  PREMIUM = 'premium',
  STANDARD = 'standard',
  EXPORT_QUALITY = 'export_quality',
}

// Notification Types
export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PROFILE_UPDATE = 'profile_update',
  PROMOTIONAL = 'promotional',
  SYSTEM = 'system',
}

// Storage Keys for AsyncStorage
export const StorageKeys = {
  USER_TOKEN: '@krushimandi:user_token',
  USER_DATA: '@krushimandi:user_data',
  THEME_MODE: '@krushimandi:theme_mode',
  LANGUAGE: '@krushimandi:language',
  ONBOARDING_COMPLETE: '@krushimandi:onboarding_complete',
  BIOMETRIC_ENABLED: '@krushimandi:biometric_enabled',
  NOTIFICATION_SETTINGS: '@krushimandi:notification_settings',
  APP_SETTINGS: '@krushimandi:app_settings',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/update-profile',
    UPLOAD_AVATAR: '/user/upload-avatar',
    DELETE_ACCOUNT: '/user/delete-account',
  },
  PRODUCTS: {
    LIST: '/products',
    DETAILS: '/products/:id',
    ADD: '/products',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
  },
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAILS: '/orders/:id',
    UPDATE_STATUS: '/orders/:id/status',
    CANCEL: '/orders/:id/cancel',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
    SETTINGS: '/notifications/settings',
  },
} as const;

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'KrushiMandi',
  VERSION: '1.0.0',
  BUNDLE_ID: 'com.krushimandi.app',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Image Upload
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'webp'],
  
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_BIO_LENGTH: 500,
  MAX_PRODUCT_IMAGES: 5,
  
  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  SPLASH_TIMEOUT: 2000, // 2 seconds
  
  // Deep Linking
  DEEP_LINK_SCHEME: 'krushimandi',
  
  // Social Media
  SOCIAL_LINKS: {
    FACEBOOK: 'https://www.facebook.com/share/1C2G6fiHPW/',
    TWITTER: 'https://x.com/krushimandi',
    INSTAGRAM: 'https://instagram.com/krushimandi',
    LINKEDIN: 'https://linkedin.com/company/krushimandi',
  },
} as const;
