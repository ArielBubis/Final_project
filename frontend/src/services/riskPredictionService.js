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
 * @returns {Promise<Object>} - The prediction results
 */
export const getPrediction = async (studentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
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
 * @returns {Promise<Object>} Risk assessment results
 */
export const getEnhancedRiskAssessment = async (data, isStudentLevel = false) => {
  try {
    const mlPrediction = await getPrediction(data);
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
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting at-risk students:', error);
    throw error;
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
