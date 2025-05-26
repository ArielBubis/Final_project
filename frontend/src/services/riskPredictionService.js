import { calculateRiskAssessment } from '../utils/scoreCalculations';

const API_BASE_URL = 'http://localhost:5000/api';

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
    
    return await response.json();
  } catch (error) {
    console.error('Error getting risk prediction:', error);
    // Fallback to client-side calculation if server is unavailable
    return null;
  }
};

/**
 * Enhanced risk assessment that tries ML prediction first then falls back to rule-based
 * @param {Object} data - Student data object
 * @param {boolean} isStudentLevel - Whether this is student or course level assessment
 * @returns {Promise<Object>} Risk assessment results
 */
export const getEnhancedRiskAssessment = async (data, isStudentLevel = false) => {
  // Try to get prediction from ML model
  try {
    const mlPrediction = await getPrediction(data);
      if (mlPrediction && mlPrediction.risk_score !== undefined) {
      return {
        score: mlPrediction.risk_score,
        level: mlPrediction.risk_level || (mlPrediction.risk_score >= 70 ? 'high' : 
               mlPrediction.risk_score >= 40 ? 'medium' : 'low'),
        factors: mlPrediction.intervention?.suggestions || mlPrediction.intervention?.interventions || [],
        isAtRisk: mlPrediction.is_at_risk || mlPrediction.risk_score >= 40,
        mlPrediction: mlPrediction  // Include original ML response for debugging
      };
    }
  } catch (err) {
    console.error("Error getting ML prediction, falling back to rule-based assessment:", err);
    // Continue with existing logic if ML fails
  }
    // Fall back to the original rule-based assessment
  return calculateRiskAssessment(data, isStudentLevel);
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
