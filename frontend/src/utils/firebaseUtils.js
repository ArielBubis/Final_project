/**
 * Utility functions for working with Firebase/Firestore data
 */

/**
 * Formats a Firestore timestamp or timestamp-like object to a JavaScript Date
 * Handles different possible formats of Firestore timestamps
 * 
 * @param {Object|Date|string|null} timestamp - Firestore timestamp or timestamp-like object
 * @returns {Date|null} JavaScript Date object or null if input is invalid
 */
export const formatFirebaseTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  // Already a Date object
  if (timestamp instanceof Date) return timestamp;
  
  // ISO string format (from our backend)
  if (typeof timestamp === 'string') {
    try {
      return new Date(timestamp);
    } catch (e) {
      console.error('Invalid date string:', timestamp);
      return null;
    }
  }
  
  // Firestore Timestamp object with toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Firestore Timestamp-like object with seconds and nanoseconds
  if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }
  
  // Timestamp represented as a number (milliseconds since epoch)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  console.error('Unknown timestamp format:', timestamp);
  return null;
};

/**
 * Formats a Firestore timestamp for display
 * 
 * @param {Object|Date|string|null} timestamp - Firestore timestamp or timestamp-like object
 * @param {string} format - 'date', 'datetime', or 'time'
 * @returns {string} Formatted date string or empty string if input is invalid
 */
export const formatTimestampForDisplay = (timestamp, format = 'date') => {
  const date = formatFirebaseTimestamp(timestamp);
  if (!date) return '';
  
  try {
    switch (format) {
      case 'datetime':
        return date.toLocaleString();
      case 'time':
        return date.toLocaleTimeString();
      case 'date':
      default:
        return date.toLocaleDateString();
    }
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
};

/**
 * Safely renders a Firestore timestamp in a React component
 * 
 * @param {Object|Date|string|null} timestamp - Firestore timestamp or timestamp-like object
 * @param {string} format - 'date', 'datetime', or 'time'
 * @returns {string} Formatted date string safe for rendering
 */
export const renderTimestamp = (timestamp, format = 'date') => {
  return formatTimestampForDisplay(timestamp, format);
};

/**
 * Processes all Firestore data to safely handle timestamps and nested objects
 * This function recursively converts all Firestore timestamp objects to JavaScript Date objects
 * and ensures objects are safe for React rendering
 * 
 * @param {Object|Array|any} data - Firestore data object or array of objects
 * @returns {Object|Array|any} Processed data safe for React
 */
export const processFirestoreData = (data) => {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => processFirestoreData(item));
  }
  
  // Handle objects (but not Date objects)
  if (data instanceof Object && !(data instanceof Date)) {
    // Check if it's a Firestore timestamp
    if (data.seconds !== undefined && data.nanoseconds !== undefined) {
      return formatFirebaseTimestamp(data);
    }
    
    // Process each property of regular objects recursively
    const result = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = processFirestoreData(data[key]);
      }
    }
    return result;
  }
  
  // Return primitive values and Date objects as is
  return data;
};