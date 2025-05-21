/**
 * Calculates the weighted average score for a course based on assignment scores and weights
 * @param {Array} assignments - Array of assignment objects with progress data
 * @returns {Object} Object containing overallScore and completionRate
 */
export const calculateCourseScores = (assignments) => {
  if (!assignments || assignments.length === 0) {
    return {
      overallScore: 0,
      completionRate: 0
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let completedAssignments = 0;
  let totalAssignments = assignments.length;

  assignments.forEach(assignment => {
    const weight = assignment.weight || 0;
    const progress = assignment.progress || {};
    
    // Only include assignments that have been submitted
    if (progress.submittedAt) {
      const score = progress.totalScore || 0;
      totalWeightedScore += (score * weight);
      totalWeight += weight;
      completedAssignments++;
    }
  });

  // Calculate overall score based on weighted average
  const overallScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
  
  // Calculate completion rate based on submitted assignments
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  return {
    overallScore,
    completionRate
  };
};

/**
 * Calculates the overall course statistics including late submissions and time spent
 * @param {Array} assignments - Array of assignment objects with progress data
 * @returns {Object} Object containing various course statistics
 */
export const calculateCourseStatistics = (assignments) => {
  if (!assignments || assignments.length === 0) {
    return {
      averageScore: 0,
      completionRate: 0,
      lateSubmissions: 0,
      totalTimeSpent: 0,
      averageTimePerAssignment: 0
    };
  }

  let totalScore = 0;
  let completedAssignments = 0;
  let lateSubmissions = 0;
  let totalTimeSpent = 0;

  assignments.forEach(assignment => {
    const progress = assignment.progress || {};
    
    if (progress.submittedAt) {
      totalScore += (progress.totalScore || 0);
      completedAssignments++;
      
      if (progress.isLate) {
        lateSubmissions++;
      }
      
      totalTimeSpent += (progress.totalTime || 0);
    }
  });

  return {
    averageScore: completedAssignments > 0 ? totalScore / completedAssignments : 0,
    completionRate: (completedAssignments / assignments.length) * 100,
    lateSubmissions,
    totalTimeSpent,
    averageTimePerAssignment: completedAssignments > 0 ? totalTimeSpent / completedAssignments : 0
  };
};

/**
 * Formats a timestamp into a readable date string
 * @param {Object} timestamp - Firebase timestamp object
 * @returns {string} Formatted date string
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Not submitted';
  return new Date(timestamp.toDate()).toLocaleDateString();
};

/**
 * Calculates the risk level and score for a student or course based on various performance metrics
 * This is the rule-based implementation that serves as a fallback if the ML model is not available
 * 
 * @param {Object} data - Object containing performance metrics
 * @param {boolean} isStudentLevel - Whether this is a student-level assessment (true) or course-level (false)
 * @returns {Object} Risk assessment object with score, level, factors, and isAtRisk flag
 */
export const calculateRiskAssessment = (data, isStudentLevel = false) => {
  if (!data) {
    return {
      score: 0,
      level: 'low',
      factors: [],
      isAtRisk: false
    };
  }

  let riskScore = 0;
  const riskFactors = [];

  // Score-based risk factors
  const averageScore = data.averageScore || data.score || 0;
  if (averageScore < 60) {
    riskScore += 30;
    riskFactors.push('Failing average score');
  } else if (averageScore < 70) {
    riskScore += 20;
    riskFactors.push('Below average score');
  }

  // Completion rate risk factors
  const completionRate = data.completionRate || data.overallCompletion || 0;
  if (completionRate < 40) {
    riskScore += 30;
    riskFactors.push('Very low completion rate');
  } else if (completionRate < 60) {
    riskScore += 15;
    riskFactors.push('Below average completion rate');
  }

  // Late submissions risk factors
  const lateSubmissions = data.lateSubmissions || 0;
  if (lateSubmissions > 2) {
    riskScore += 15;
    riskFactors.push('Multiple late submissions');
  }

  // Student-specific risk factors
  if (isStudentLevel) {
    // Missing assignments
    const missingAssignments = data.missingAssignments || 0;
    if (missingAssignments > 5) {
      riskScore += 25;
      riskFactors.push('Multiple missing assignments');
    } else if (missingAssignments > 2) {
      riskScore += 10;
      riskFactors.push('Several missing assignments');
    }

    // Last access time
    const daysSinceLastAccess = data.daysSinceLastAccess || 0;
    if (daysSinceLastAccess > 21) {
      riskScore += 25;
      riskFactors.push('No course access in over 3 weeks');
    } else if (daysSinceLastAccess > 14) {
      riskScore += 15;
      riskFactors.push('No course access in over 2 weeks');
    } else if (daysSinceLastAccess > 7) {
      riskScore += 5;
      riskFactors.push('No course access in over a week');
    }

    // Submission rate
    const submissionRate = data.submissionRate || 0;
    if (submissionRate < 50) {
      riskScore += 15;
      riskFactors.push('Low assignment submission rate');
    }
  }

  // Determine risk level based on score
  let riskLevel = 'low';
  if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  }

  return {
    score: riskScore,
    level: riskLevel,
    factors: riskFactors,
    isAtRisk: riskLevel !== 'low'
  };
}; 