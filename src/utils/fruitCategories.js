/**
 * Fruit Category Utilities
 * Helper functions for managing supported fruit categories
 */

import { SUPPORTED_FRUIT_TYPES, Fruits, getFruitByType, isValidFruitType } from '../constants/Fruits';

// Named export: Common fruit categories with i18n label keys
export const categories = [
  { type: 'banana', labelKey: 'fruits.banana' },
  { type: 'orange', labelKey: 'fruits.orange' },
  { type: 'grape', labelKey: 'fruits.grape' },
  { type: 'pomegranate', labelKey: 'fruits.pomegranate' },
  { type: 'sweet lemon', labelKey: 'fruits.sweetLemon' },
  { type: 'apple', labelKey: 'fruits.apple' },
  { type: 'mango', labelKey: 'fruits.mango' },
];

/**
 * Get all supported fruit categories with their display information
 * @returns {Array} Array of fruit category objects
 */
export const getSupportedFruitCategories = () => {
  return Fruits.map(fruit => ({
    id: fruit.name.toLowerCase(),
    name: fruit.name,
    type: fruit.name.toLowerCase(),
    image: fruit.image,
    bgColor: fruit.bgColor,
    description: fruit.description,
    price: fruit.price
  }));
};

/**
 * Validate if a fruit type is supported
 * @param {string} fruitType - The fruit type to validate
 * @returns {boolean} Whether the fruit type is supported
 */
export const validateFruitCategory = (fruitType) => {
  return isValidFruitType(fruitType);
};

/**
 * Get fruit category information by type
 * @param {string} fruitType - The fruit type
 * @returns {Object|null} Fruit category information or null if not found
 */
export const getFruitCategoryInfo = (fruitType) => {
  return getFruitByType(fruitType);
};

/**
 * Get the display name for a fruit type
 * @param {string} fruitType - The fruit type
 * @returns {string} Display name for the fruit
 */
export const getFruitDisplayName = (fruitType) => {
  if (!fruitType) return 'Unknown Fruit';
  
  const fruit = getFruitByType(fruitType);
  return fruit ? fruit.name : fruitType.charAt(0).toUpperCase() + fruitType.slice(1);
};

/**
 * Convert fruit type to standardized format
 * @param {string} fruitType - The fruit type to standardize
 * @returns {string} Standardized fruit type
 */
export const standardizeFruitType = (fruitType) => {
  if (!fruitType) return '';
  
  const normalized = fruitType.toLowerCase().trim();
  
  // Handle common variations
  const typeMap = {
    'grapes': 'grape',
    'sweet lemons': 'sweet lemon',
    'sweetlemon': 'sweet lemon',
    'apples': 'apple',
    'mangoes': 'mango',
    'bananas': 'banana',
    'oranges': 'orange',
    'pomegranates': 'pomegranate'
  };
  
  return typeMap[normalized] || normalized;
};

/**
 * Get fruit category for display in dropdowns/pickers
 * @returns {Array} Array of fruit options for UI components
 */
export const getFruitCategoryOptions = () => {
  return Fruits.map(fruit => ({
    label: fruit.name,
    value: fruit.name.toLowerCase(),
    icon: fruit.image,
    color: fruit.bgColor
  }));
};

/**
 * Filter fruits by category
 * @param {Array} fruits - Array of fruit objects
 * @param {string} category - Category to filter by ('all' for no filter)
 * @returns {Array} Filtered array of fruits
 */
export const filterFruitsByCategory = (fruits, category) => {
  if (!fruits || !Array.isArray(fruits)) return [];
  if (!category || category === 'all') return fruits;
  
  const standardizedCategory = standardizeFruitType(category);
  
  return fruits.filter(fruit => {
    if (!fruit.type) return false;
    const fruitType = standardizeFruitType(fruit.type);
    return fruitType === standardizedCategory;
  });
};

export default {
  getSupportedFruitCategories,
  validateFruitCategory,
  getFruitCategoryInfo,
  getFruitDisplayName,
  standardizeFruitType,
  getFruitCategoryOptions,
  filterFruitsByCategory,
  SUPPORTED_FRUIT_TYPES,
  categories
};
