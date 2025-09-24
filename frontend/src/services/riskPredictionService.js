import { calculateRiskAssessment } from '../utils/scoreCalculations';

// Base URL for backend ML API
export const API_BASE_URL = 'http://localhost:5000/api';

// Simple in-memory flag about backend availability
let mlServiceAvailable = true;

export const isMlServiceAvailable = () => mlServiceAvailable;

/**
 * Perform a health check against the backend API
 */
export const checkHealth = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      mlServiceAvailable = false;
      return { status: 'unhealthy', ok: false };
    }
    const data = await res.json();
    mlServiceAvailable = !!data.model_loaded;
    return { status: data.status, ok: mlServiceAvailable, featureCount: data.feature_count };
  } catch (e) {
    mlServiceAvailable = false;
    return { status: 'unreachable', ok: false };
  }
};

/**
 * Get risk prediction for a student using ML model
 * @param {Object} studentData - The student data to analyze
 * @param {string} modelId - Optional model ID to use for prediction
 * @returns {Promise<Object>} - The prediction results
 */
export const getPrediction = async (studentData, modelId = null) => {
  try {
    const requestBody = { ...studentData };
    if (modelId) {
      requestBody.model_id = modelId;
    }
    
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.warn('ML service unavailable, falling back to rule-based scoring. Reason:', error.message);
    mlServiceAvailable = false;
    return null; // Signal caller to fallback
  }
};

/**
 * Enhanced risk assessment that tries ML prediction first then falls back to rule-based
 * @param {Object} data - Student data object
 * @param {boolean} isStudentLevel - Whether this is student or course level assessment
 * @param {string} modelId - Optional model ID to use for prediction
 * @returns {Promise<Object>} Risk assessment results
 */
export const getEnhancedRiskAssessment = async (data, isStudentLevel = false, modelId = null) => {
  try {
    const mlPrediction = await getPrediction(data, modelId);
    if (mlPrediction && mlPrediction.risk_score !== undefined) {
      return {
        score: mlPrediction.risk_score,
        level: mlPrediction.risk_level || (mlPrediction.risk_score >= 70 ? 'high' : mlPrediction.risk_score >= 40 ? 'medium' : 'low'),
        factors: mlPrediction.intervention?.suggestions || mlPrediction.intervention?.interventions || [],
        isAtRisk: mlPrediction.is_at_risk || mlPrediction.risk_score >= 40,
        mlPrediction
      };
    }
  } catch (err) {
    console.warn('Error during ML prediction, using rule-based fallback:', err.message);
  }
  // Fallback
  return { ...calculateRiskAssessment(data, isStudentLevel), fallback: true };
};

/**
 * Get at-risk students from the latest CSV predictions
 * @returns {Promise<Object>} At-risk students data
 */
export const getAtRiskStudents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/risk/students`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Server returned an error object
      return {
        success: false,
        message: data.message || data.error || `Server responded with status: ${response.status}`,
        students: [],
        summary: null
      };
    }
    
    // Check if the response indicates an error even with 200 status
    if (data.error) {
      return {
        success: false,
        message: data.message || data.error,
        students: [],
        summary: null
      };
    }
    
    return {
      success: true,
      students: data.students || data,
      summary: data.summary || null
    };
  } catch (error) {
    console.error('Error getting at-risk students:', error);
    return {
      success: false,
      message: error.message,
      students: [],
      summary: null
    };
  }
};

/**
 * Get course-specific risk data for students
 * @returns {Promise<Array>} Array of course-specific risk predictions
 */
export const getCourseRiskData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/risk/course-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting course risk data:', error);
    // Return empty array if service is unavailable
    return [];
  }
};

/**
 * Get available models for prediction
 * @returns {Promise<Array>} Array of available models
 */
export const getAvailableModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // If endpoint doesn't exist, return default model
      return [{ 
        id: '1_3', 
        name: '1-3 Months Early Warning', 
        description: 'Predicts risk based on first 3 months of data',
        months_required: 3,
        is_current: true
      }];
    }
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error getting available models:', error);
    // Return default model if service is unavailable
    return [{ 
      id: '1_3', 
      name: '1-3 Months Early Warning', 
      description: 'Predicts risk based on first 3 months of data',
      months_required: 3,
      is_current: true
    }];
  }
};

/**
 * Set the current active model
 * @param {string} modelId - The model to activate
 * @returns {Promise<Object>} Response from server
 */
export const setCurrentModel = async (modelId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/models/current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model_id: modelId })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error setting current model:', error);
    throw error;
  }
};

/**
 * Trigger new prediction generation using CSV data pipeline
 * @param {string} modelId - The model to use for predictions (optional)
 * @param {string} dataDir - Custom data directory (optional)
 * @returns {Promise<Object>} Prediction generation results
 */
export const generateNewPredictions = async (modelId = null, dataDir = null) => {
  try {
    const requestBody = {};
    if (modelId) requestBody.model_id = modelId;
    if (dataDir) requestBody.data_dir = dataDir;

    const response = await fetch(`${API_BASE_URL}/predict/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating new predictions:', error);
    throw error;
  }
};
