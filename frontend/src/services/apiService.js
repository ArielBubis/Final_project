/**
 * API Service for interacting with the backend instead of directly with Firestore
 * This centralizes API calls and handles error management
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} If the request fails
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * API methods for interacting with the backend
 */
export const api = {
  /**
   * Get a document by ID
   * 
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {Promise<Object>} Document data
   */
  async getDocument(collection, id) {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/collections/${collection}/${id}`);
  },

  /**
   * Query documents in a collection
   * 
   * @param {string} collection - Collection name
   * @param {Array<Object>} filters - Array of filter objects { field, op, value }
   * @returns {Promise<Array<Object>>} Array of document data
   */
  async queryCollection(collection, filters = null) {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/collections/${collection}/query`, {
      method: 'POST',
      body: JSON.stringify({ filters }),
    });
  },

  /**
   * Create a document
   * 
   * @param {string} collection - Collection name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document info
   */
  async createDocument(collection, data) {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/collections/${collection}`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }
};