/**
 * Course-specific risk assessment utilities
 * Handles loading and processing of course-level risk data from CSV predictions
 */

import React from 'react';
import { SafetyOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

/**
 * Get course-specific risk data for a student
 * @param {Array} riskData - Array of risk prediction data
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID (optional)
 * @returns {Object|Array} Single course risk data or array of all courses for student
 */
export const getCourseRiskData = (riskData, studentId, courseId = null) => {
  if (!riskData || !studentId) return null;

  const studentRiskData = riskData.filter(item => 
    String(item.studentId) === String(studentId)
  );

  if (courseId) {
    // Return specific course risk data
    return studentRiskData.find(item => 
      String(item.courseId) === String(courseId)
    ) || null;
  }

  // Return all courses for the student
  return studentRiskData;
};

/**
 * Calculate overall student risk based on course-specific risks
 * @param {Array} courseRisks - Array of course risk data for a student
 * @returns {Object} Aggregated risk assessment
 */
export const calculateOverallStudentRisk = (courseRisks) => {
  if (!courseRisks || courseRisks.length === 0) {
    return {
      isAtRisk: false,
      overallRiskScore: 0,
      riskLevel: 'low',
      atRiskCourses: 0,
      totalCourses: 0,
      highRiskCourses: [],
      mediumRiskCourses: [],
      lowRiskCourses: []
    };
  }

  const totalCourses = courseRisks.length;
  let totalRiskScore = 0;
  let atRiskCount = 0;
  
  const highRiskCourses = [];
  const mediumRiskCourses = [];
  const lowRiskCourses = [];

  courseRisks.forEach(course => {
    const riskScore = parseFloat(course.risk_score || 0);
    const isAtRisk = course.at_risk_prediction === 1 || course.risk_status === 'At Risk';
    
    totalRiskScore += riskScore;
    
    if (isAtRisk) {
      atRiskCount++;
    }

    // Categorize courses by risk level
    const riskStatus = (course.risk_status || '').toLowerCase();
    const courseInfo = {
      courseId: course.courseId,
      riskScore: riskScore,
      riskStatus: course.risk_status,
      confidence: course.prediction_confidence
    };

    if (riskStatus === 'at risk' || riskScore >= 70) {
      highRiskCourses.push(courseInfo);
    } else if (riskScore >= 40) {
      mediumRiskCourses.push(courseInfo);
    } else {
      lowRiskCourses.push(courseInfo);
    }
  });

  const averageRiskScore = totalRiskScore / totalCourses;
  const riskPercentage = (atRiskCount / totalCourses) * 100;

  // Determine overall risk level
  let overallRiskLevel = 'low';
  if (averageRiskScore >= 70 || riskPercentage >= 50) {
    overallRiskLevel = 'high';
  } else if (averageRiskScore >= 40 || riskPercentage >= 25) {
    overallRiskLevel = 'medium';
  }

  return {
    isAtRisk: atRiskCount > 0,
    overallRiskScore: Math.round(averageRiskScore),
    riskLevel: overallRiskLevel,
    atRiskCourses: atRiskCount,
    totalCourses: totalCourses,
    riskPercentage: Math.round(riskPercentage),
    highRiskCourses,
    mediumRiskCourses,
    lowRiskCourses
  };
};

/**
 * Get color for course risk level (alias for getCourseRiskLevelColor for consistency)
 * @param {string} level - Risk level
 * @returns {string} Color hex code
 */
export const getCourseRiskColor = (level) => { //level between 0 and 100
  if (!level) return '#1890ff'; // Default to blue if no level provided
  return getCourseRiskLevelColor(level);
};

/**
 * Get icon component for course risk level
 * @param {string} level - Risk level
 * @returns {React.Component} Ant Design icon component
 */
export const getCourseRiskIcon = (level) => {
  const levelLower = (level || '').toLowerCase();
  
  switch (levelLower) {
    case 'high':
    case 'at risk':
      return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
    case 'medium':
      return <WarningOutlined style={{ color: '#fa8c16' }} />;
    case 'low':
    case 'not at risk':
      return <SafetyOutlined style={{ color: '#52c41a' }} />;
    default:
      return <SafetyOutlined style={{ color: '#1890ff' }} />;
  }
};

/**
 * Get risk level color for UI display
 * @param {string} level - Risk level
 * @returns {string} Color code
 */
export const getCourseRiskLevelColor = (level) => {
  const levelLower = (level || '').toLowerCase();
  switch (levelLower) {
    case 'high':
    case 'at risk':
      return '#f5222d';
    case 'medium':
      return '#fa8c16';
    case 'low':
    case 'not at risk':
      return '#52c41a';
    default:
      return '#1890ff';
  }
};

/**
 * Get risk level text for UI display
 * @param {string} level - Risk level
 * @param {boolean} isAtRisk - Whether student is at risk
 * @returns {string} Display text
 */
export const getCourseRiskLevelText = (level, isAtRisk) => {
  if (isAtRisk) return 'AT RISK';
  const levelLower = (level || '').toLowerCase();
  switch (levelLower) {
    case 'high':
      return 'HIGH RISK';
    case 'medium':
      return 'MEDIUM RISK';
    case 'low':
      return 'LOW RISK';
    case 'at risk':
      return 'AT RISK';
    case 'not at risk':
      return 'NOT AT RISK';
    default:
      return level ? level.toUpperCase() : 'UNKNOWN';
  }
};

/**
 * Format course risk data for display in components
 * @param {Object} courseRisk - Course risk data
 * @returns {Object} Formatted risk data
 */
export const formatCourseRiskData = (courseRisk) => {
  if (!courseRisk) return null;

  const riskScore = parseFloat(courseRisk.risk_score || 0);
  const isAtRisk = courseRisk.at_risk_prediction === 1 || courseRisk.risk_status === 'At Risk';
  const riskStatus = courseRisk.risk_status || (isAtRisk ? 'At Risk' : 'Not At Risk');
  // Get risk factors for this course
  const riskFactors = getCourseRiskFactors(courseRisk);
  
  return {
    courseId: courseRisk.courseId,
    studentId: courseRisk.studentId,
    riskScore: riskScore *100,
    riskLevel: riskStatus.toLowerCase(),
    riskStatus: riskStatus,
    isAtRisk: isAtRisk,
    atRiskPrediction: isAtRisk,
    confidence: courseRisk.prediction_confidence || 'Unknown',
    probability: parseFloat(courseRisk.at_risk_probability || 0),
    finalScore: parseFloat(courseRisk.finalScore || 0),
    lateSubmissionRate: parseFloat(courseRisk.late_submission_rate || 0) * 100, // Convert to percentage
    gradeLevel: courseRisk.gradeLevel,
    // Additional metrics from CSV
    scoreVariance: parseFloat(courseRisk.score_variance || 0),
    totalTimeSpent: parseFloat(courseRisk.totalTimeSpentMinutes || 0),
    avgMonthlyScore: parseFloat(courseRisk.avg_monthly_score || 0),
    avgMonthlyTime: parseFloat(courseRisk.avg_monthly_time || 0),
    declining_performance: courseRisk.declining_performance === 1,
    low_engagement: courseRisk.low_engagement === 1,
    inconsistent_performance: courseRisk.inconsistent_performance === 1,
    riskFactors: riskFactors || []
  };
};

/**
 * Get risk factors for a course based on the data
 * @param {Object} courseRisk - Course risk data
 * @returns {Array} Array of risk factor strings
 */
export const getCourseRiskFactors = (courseRisk) => {
  if (!courseRisk) return [];

  const factors = [];

  if (courseRisk.declining_performance === 1) {
    factors.push('Declining Performance');
  }

  if (courseRisk.low_engagement === 1) {
    factors.push('Low Engagement');
  }

  if (courseRisk.inconsistent_performance === 1) {
    factors.push('Inconsistent Performance');
  }

  const lateSubmissionRate = parseFloat(courseRisk.late_submission_rate || 0);
  if (lateSubmissionRate > 0.3) {
    factors.push('High Late Submission Rate');
  }

  const finalScore = parseFloat(courseRisk.finalScore || 0);
  if (finalScore < 60) {
    factors.push('Low Final Score');
  }

  const avgMonthlyScore = parseFloat(courseRisk.avg_monthly_score || 0);
  if (avgMonthlyScore < 65) {
    factors.push('Below Average Monthly Scores');
  }

  const totalTimeSpent = parseFloat(courseRisk.totalTimeSpentMinutes || 0);
  if (totalTimeSpent < 120) { // Less than 2 hours
    factors.push('Low Time Investment');
  }

  return factors;
};
