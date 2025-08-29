// Category management with persistent storage

// Default categories
const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Entertainment',
  'Transport',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Investment',
  'Other'
];

const DEFAULT_TYPES = [
  'internal',
  'bill-payment', 
  'income',
  'spending'
];

/**
 * Gets all available categories (default + custom)
 */
export const getAvailableCategories = () => {
  const customCategories = getCustomCategories();
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];
  return [...new Set(allCategories)].sort(); // Remove duplicates and sort
};

/**
 * Gets all available transaction types
 */
export const getAvailableTypes = () => {
  return [...DEFAULT_TYPES, 'unknown'];
};

/**
 * Gets custom categories from localStorage
 */
export const getCustomCategories = () => {
  try {
    const saved = localStorage.getItem('customCategories');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading custom categories:', error);
    return [];
  }
};

/**
 * Adds a new custom category
 */
export const addCustomCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  
  const trimmed = category.trim();
  if (!trimmed) return false;
  
  const existing = getAvailableCategories();
  if (existing.includes(trimmed)) return false; // Already exists
  
  try {
    const customCategories = getCustomCategories();
    const updated = [...customCategories, trimmed];
    localStorage.setItem('customCategories', JSON.stringify(updated));
    
    // Also sync to backend if possible
    syncCustomCategories(updated).catch(error => {
      console.warn('Failed to sync custom categories to backend:', error);
    });
    
    return true;
  } catch (error) {
    console.error('Error saving custom category:', error);
    return false;
  }
};

/**
 * Removes a custom category (only custom ones, not defaults)
 */
export const removeCustomCategory = (category) => {
  if (DEFAULT_CATEGORIES.includes(category)) {
    return false; // Cannot remove default categories
  }
  
  try {
    const customCategories = getCustomCategories();
    const updated = customCategories.filter(cat => cat !== category);
    localStorage.setItem('customCategories', JSON.stringify(updated));
    
    // Also sync to backend
    syncCustomCategories(updated).catch(error => {
      console.warn('Failed to sync custom categories to backend:', error);
    });
    
    return true;
  } catch (error) {
    console.error('Error removing custom category:', error);
    return false;
  }
};

/**
 * Syncs custom categories to backend for cross-device persistence
 */
const syncCustomCategories = async (categories) => {
  try {
    const apiService = (await import('../services/api')).default;
    // This would be a new API endpoint to store user preferences
    // For now, we'll store it as a special transaction tag
    await apiService.setUserPreference('customCategories', categories);
  } catch (error) {
    // Silently fail - localStorage will still work
    throw error;
  }
};

/**
 * Loads custom categories from backend on app start
 */
export const loadCustomCategoriesFromBackend = async () => {
  try {
    const apiService = (await import('../services/api')).default;
    const backendCategories = await apiService.getUserPreference('customCategories');
    
    if (backendCategories && Array.isArray(backendCategories)) {
      // Merge with local categories
      const localCategories = getCustomCategories();
      const merged = [...new Set([...localCategories, ...backendCategories])];
      localStorage.setItem('customCategories', JSON.stringify(merged));
      return merged;
    }
  } catch (error) {
    console.warn('Could not load categories from backend:', error);
  }
  
  return getCustomCategories();
};

/**
 * Validates if a category name is acceptable
 */
export const isValidCategoryName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50; // Reasonable limits
};

/**
 * Gets display-friendly category name
 */
export const formatCategoryName = (category) => {
  if (!category || category === 'undefined' || category === 'null') {
    return 'Uncategorized';
  }
  return category;
};

/**
 * Checks if a category can be cleared/reset
 */
export const canClearCategory = () => {
  return true; // All categories can be cleared to "Uncategorized"
};

/**
 * Clears a category (sets to null/uncategorized)
 */
export const clearCategory = () => {
  return null; // This will show as "Uncategorized"
};