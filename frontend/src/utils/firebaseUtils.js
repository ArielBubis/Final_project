/**
 * Utility functions for working with Firebase/Firestore data
 */

import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, limit, orderBy, doc, getDoc } from 'firebase/firestore';

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
 * Unified date formatting utility that handles all timestamp/date formats
 * This replaces all scattered date formatting functions across the codebase
 * 
 * @param {Object|Date|string|null} timestamp - Any timestamp format (Firebase, Date, string, etc.)
 * @param {string} format - Format type ('date', 'datetime', 'time', 'short-date')
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @param {string} fallback - Fallback text for invalid/null timestamps
 * @returns {string} Formatted date string or fallback text
 */
export const formatDate = (timestamp, format = 'date', locale = 'en-US', fallback = 'Not available') => {
  // Handle null/undefined
  if (!timestamp) return fallback;
  
  // Convert to Date object using existing Firebase utility
  const date = formatFirebaseTimestamp(timestamp);
  if (!date) return fallback;
  
  try {
    switch (format) {
      case 'short-date':
        // Matches StudentCard.js format: "Sep 14, 2024"
        return date.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      case 'datetime':
        return date.toLocaleString(locale);
      case 'time':
        return date.toLocaleTimeString(locale);
      case 'date':
      default:
        // Default format: "9/14/2024"
        return date.toLocaleDateString(locale);
    }
  } catch (e) {
    console.error('Error formatting date:', e, { timestamp, format, locale });
    return fallback;
  }
};

/**
 * Specialized date formatter for assignment submissions
 * Handles the specific logic from CoursePerformanceCard.js with proper error handling
 * 
 * @param {Object} progress - Progress object containing submission date fields
 * @param {Function} t - Translation function
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted submission date or appropriate message
 */
export const formatSubmissionDate = (progress, t, locale = 'en-US') => {
  try {
    if (!progress) return t('PerformanceMetrics', 'Not submitted');
    
    // Check for both possible submission date fields
    const submissionDate = progress.submittedAt || progress.submissionDate;
    if (!submissionDate) return t('PerformanceMetrics', 'Not submitted');
    
    // Use the unified formatDate function
    const formatted = formatDate(submissionDate, 'date', locale, null);
    if (formatted === null) {
      return t('PerformanceMetrics', 'Date format error');
    }
    
    return formatted;
  } catch (e) {
    console.error('Error rendering submission date:', e, progress);
    return t('PerformanceMetrics', 'Date error');
  }
};

/**
 * Specialized date formatter for last activity/access dates
 * Handles the specific logic from CoursePerformanceCard.js module progress
 * 
 * @param {Object} lastAccessed - Last accessed timestamp in various formats
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted last activity date or 'Never'
 */
export const formatLastActivity = (lastAccessed, locale = 'en-US') => {
  if (!lastAccessed) return 'Never';
  
  const formatted = formatDate(lastAccessed, 'date', locale, null);
  return formatted || 'Never';
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
    return result; // Return the processed object
  }
  
  // Return primitive values and Date objects as is
  return data;
};

/**
 * Fetches documents from Firestore with optional filtering and ordering
 * 
 * @param {string} collectionPath - Path to the collection
 * @param {Object} [options] - Query options
 * @param {Array<Object>} [options.filters] - Array of filter objects {field, operator, value}
 * @param {Array<Object>} [options.orderByFields] - Array of orderBy objects {field, direction}
 * @param {number} [options.limitCount] - Maximum number of documents to return
 * @returns {Promise<Array>} - Array of document data with IDs
 */
export const fetchDocuments = async (collectionPath, options = {}) => {
  try {
    let queryRef = collection(db, collectionPath);
    
    // Apply filters if provided
    if (options.filters && Array.isArray(options.filters)) {
      let queryConstraints = [];
      
      options.filters.forEach(filter => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          // Special handling for 'in' operator which requires an array of values
          if (filter.operator === 'in' && Array.isArray(filter.value)) {
            // Skip empty arrays to avoid Firestore errors
            if (filter.value.length > 0) {
              queryConstraints.push(where(filter.field, filter.operator, filter.value));
            }
          } else {
            queryConstraints.push(where(filter.field, filter.operator, filter.value));
          }
        }
      });
      
      if (queryConstraints.length > 0) {
        queryRef = query(queryRef, ...queryConstraints);
      }
    }
    
    // Apply ordering if provided
    if (options.orderByFields && Array.isArray(options.orderByFields)) {
      let orderByConstraints = [];
      
      options.orderByFields.forEach(orderByField => {
        if (orderByField.field) {
          orderByConstraints.push(orderBy(
            orderByField.field, 
            orderByField.direction || 'asc'
          ));
        }
      });
      
      if (orderByConstraints.length > 0) {
        queryRef = query(queryRef, ...orderByConstraints);
      }
    }
    
    // Apply limit if provided
    if (options.limitCount && typeof options.limitCount === 'number') {
      queryRef = query(queryRef, limit(options.limitCount));
    }
    
    // Execute query and map results
    const querySnapshot = await getDocs(queryRef);
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...processFirestoreData(doc.data())
    }));
    
    return documents;
  } catch (error) {
    console.error(`Error fetching documents from ${collectionPath}:`, error);
    throw error;
  }
};

/**
 * Fetches a single document by ID
 * 
 * @param {string} collectionPath - Path to the collection
 * @param {string} documentId - ID of the document to fetch
 * @returns {Promise<Object|null>} - Document data with ID or null if not found
 */
export const fetchDocumentById = async (collectionPath, documentId) => {
  try {
    const docRef = doc(db, collectionPath, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...processFirestoreData(docSnap.data())
      };
    }
    
    console.log(`Document not found: ${collectionPath}/${documentId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching document ${documentId} from ${collectionPath}:`, error);
    throw error;
  }
};

/**
 * Fetches documents from a subcollection
 * 
 * @param {string} collectionPath - Path to the parent collection
 * @param {string} documentId - ID of the parent document
 * @param {string} subcollectionPath - Path to the subcollection
 * @param {Object} [options] - Query options (same as fetchDocuments)
 * @returns {Promise<Array>} - Array of document data with IDs
 */
export const fetchSubcollection = async (collectionPath, documentId, subcollectionPath, options = {}) => {
  try {
    const fullPath = `${collectionPath}/${documentId}/${subcollectionPath}`;
    const subcollectionRef = collection(db, collectionPath, documentId, subcollectionPath);
    
    let queryRef = subcollectionRef;
      // Apply filters if provided
    if (options.filters && Array.isArray(options.filters)) {
      let queryConstraints = [];
      
      options.filters.forEach(filter => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          // Special handling for 'in' operator which requires an array of values
          if (filter.operator === 'in' && Array.isArray(filter.value)) {
            // Skip empty arrays to avoid Firestore errors
            if (filter.value.length > 0) {
              queryConstraints.push(where(filter.field, filter.operator, filter.value));
            }
          } else {
            queryConstraints.push(where(filter.field, filter.operator, filter.value));
          }
        }
      });
      
      if (queryConstraints.length > 0) {
        queryRef = query(queryRef, ...queryConstraints);
      }
    }
    
    // Apply ordering if provided
    if (options.orderByFields && Array.isArray(options.orderByFields)) {
      let orderByConstraints = [];
      
      options.orderByFields.forEach(orderByField => {
        if (orderByField.field) {
          orderByConstraints.push(orderBy(
            orderByField.field, 
            orderByField.direction || 'asc'
          ));
        }
      });
      
      if (orderByConstraints.length > 0) {
        queryRef = query(queryRef, ...orderByConstraints);
      }
    }
    
    // Apply limit if provided
    if (options.limitCount && typeof options.limitCount === 'number') {
      queryRef = query(queryRef, limit(options.limitCount));
    }
    
    // Execute query and map results
    const querySnapshot = await getDocs(queryRef);
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...processFirestoreData(doc.data())
    }));
    
    return documents;
  } catch (error) {
    console.error(`Error fetching subcollection ${subcollectionPath} from ${collectionPath}/${documentId}:`, error);
    throw error;
  }
};