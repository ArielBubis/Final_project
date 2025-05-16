/**
 * Debug utility for consistent logging throughout the application
 */

const DEBUG_ENABLED = process.env.NODE_ENV !== 'production';

/**
 * Log data to console only in development mode
 * @param {string} component - The component/module name
 * @param {string} action - The action being performed
 * @param {any} data - The data to log
 */
export const logDebug = (component, action, data) => {
  if (DEBUG_ENABLED) {
    console.group(`🔍 ${component} - ${action}`);
    console.log(data);
    console.groupEnd();
  }
};

/**
 * Log errors to console with better formatting
 * @param {string} component - The component/module name
 * @param {string} action - The action being performed
 * @param {Error} error - The error object
 */
export const logError = (component, action, error) => {
  console.error(`❌ [${component}] ${action} Failed:`, error);
};

/**
 * Safe stringify helper for objects with circular references
 * @param {any} obj - The object to stringify
 * @param {number} indent - JSON stringify indent value
 * @returns {string} - Safe JSON string
 */
export const safeStringify = (obj, indent = 2) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular Reference]';
      }
      cache.add(value);
    }
    // Handle Firebase timestamp objects
    if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
      try {
        return `Date: ${value.toDate().toISOString()}`;
      } catch (e) {
        return '[Invalid Date]';
      }
    }
    return value;
  }, indent);
};

/**
 * Create a deep clone of an object with handling for circular references
 * @param {any} obj - The object to clone
 * @returns {any} - A deep clone of the object
 */
export const safeClone = (obj) => {
  try {
    return JSON.parse(safeStringify(obj));
  } catch (e) {
    logError('safeClone', 'Cloning object', e);
    return { error: 'Failed to clone object', reason: e.message };
  }
};

/**
 * Enhanced version of console.table with better support for complex objects
 * @param {Array} data - Array of objects to display as table
 * @param {Array} columns - Optional array of column names to include
 */
export const logTable = (data, columns) => {
  if (!DEBUG_ENABLED) return;
  
  if (Array.isArray(data) && data.length > 0) {
    try {
      console.table(data, columns);
    } catch (e) {
      // Fallback if console.table fails
      console.log('Table data:', data);
    }
  } else {
    console.log('No data to display in table');
  }
};

// Create the default export object
const debugLogger = {
  logDebug,
  logError,
  safeStringify,
  safeClone,
  logTable,
  isEnabled: DEBUG_ENABLED
};

export default debugLogger;
