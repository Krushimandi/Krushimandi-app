/**
 * Validation Utilities
 * Form validation helper functions
 */

// Phone number validation (Indian format)
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

// Password validation
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Name validation
export const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s]{2,50}$/;
  return nameRegex.test(name.trim());
};

// OTP validation
export const validateOTP = (otp: string): boolean => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

// Required field validation
export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

// Price validation
export const validatePrice = (price: string): boolean => {
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  return priceRegex.test(price) && parseFloat(price) > 0;
};

// Quantity validation
export const validateQuantity = (quantity: string): boolean => {
  const quantityRegex = /^\d+$/;
  return quantityRegex.test(quantity) && parseInt(quantity) > 0;
};
