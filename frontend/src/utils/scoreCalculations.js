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

/**
 * Calculate student-level performance metrics, optionally scoped to a single course.
 *
 * This function is pure and returns the same metric keys that the UI expects when
 * rendering performance summaries and radar charts. When a course selector is
 * provided, the metrics are computed only from that course's data. When no
 * selector is given (or the selector equals 'all'), the student's metrics are
 * aggregated (AVERAGE) across all their courses — matching the current default behavior.
 *
 * @param {Object} studentData - The full student performance object (may include .courses[])
 * @param {Object} [options] - Optional parameters
 * @param {string} [options.selectedCourseId] - If provided, scope metrics to the course with this id
 * @param {string} [options.selectedCourseName] - If provided, scope metrics to the course with this name
 * @returns {Object} Metrics object with keys: averageScore, completion, submissionRate, expertiseRate, timeSpent
 */
export const calculateStudentMetrics = (studentData, options = {}) => {
  const { selectedCourseId, selectedCourseName } = options || {};

  if (!studentData) {
    return {
      averageScore: 0,
      completion: 0,
      submissionRate: 0,
      expertiseRate: 0,
      timeSpent: 0
    };
  }

  // Helper to extract metrics from a single course object (if available)
  const metricsFromCourse = (course) => {
    if (!course) return null;
    // Several shapes are supported in the codebase: course.summary, course.assignments, course.modules
  const avg = (course.summary?.overallScore ?? course.summary?.averageScore ?? course.summary?.average) || 0;
  const completion = (course.summary?.completionRate ?? course.summary?.completion) || 0;
  const submission = (course.summary?.submissionRate ?? course.summary?.submissionRate) || 0;
    const expertise = course.summary?.expertiseRate ?? 0;
    const time = course.summary?.totalTimeSpent ?? course.summary?.timeSpent ?? 0;
    return { avg, completion, submission, expertise, time };
  };

  // If specific course selector provided, try to find the course and compute metrics only for it
  if ((selectedCourseId && selectedCourseId !== 'all') || (selectedCourseName && selectedCourseName !== 'all')) {
    const courses = Array.isArray(studentData.courses) ? studentData.courses : [];
    const matched = courses.find(c => (selectedCourseId && c.id === selectedCourseId) || (selectedCourseName && (c.courseName === selectedCourseName || c.name === selectedCourseName)));
    const m = metricsFromCourse(matched);
    if (!m) {
      // No matching course or no detailed course data — fallback to zeros so caller can handle UI
      return {
        averageScore: 0,
        completion: 0,
        submissionRate: 0,
        expertiseRate: 0,
        timeSpent: 0
      };
    }

    return {
      averageScore: m.avg || 0,
      completion: m.completion || 0,
      submissionRate: m.submission || 0,
      expertiseRate: m.expertise || 0,
      timeSpent: m.time || 0
    };
  }

  // Default behavior: aggregate (average) across all courses — preserve existing behavior
  if (!Array.isArray(studentData.courses) || studentData.courses.length === 0) {
    // If student object already contains aggregated fields, use them
    return {
      averageScore: studentData.averageScore || studentData.scores?.average || 0,
      completion: studentData.completion || studentData.completionRate || studentData.overallCompletion || 0,
      submissionRate: studentData.submissionRate || 0,
      expertiseRate: studentData.expertiseRate || 0,
      timeSpent: studentData.timeSpent || studentData.totalTimeSpent || 0
    };
  }

  let totalScore = 0;
  let totalCompletion = 0;
  let totalSubmission = 0;
  let totalExpertise = 0;
  let totalTime = 0;
  let validCourses = 0;

  studentData.courses.forEach(course => {
    const m = metricsFromCourse(course);
    if (!m) return;
    // consider courses with a valid score
    if (typeof m.avg === 'number') {
      totalScore += m.avg;
      totalCompletion += m.completion || 0;
      totalSubmission += m.submission || 0;
      totalExpertise += m.expertise || 0;
      totalTime += m.time || 0;
      validCourses++;
    }
  });

  if (validCourses === 0) {
    // fallback to aggregated fields if available
    return {
      averageScore: studentData.averageScore || 0,
      completion: studentData.completion || studentData.completionRate || studentData.overallCompletion || 0,
      submissionRate: studentData.submissionRate || 0,
      expertiseRate: studentData.expertiseRate || 0,
      timeSpent: studentData.timeSpent || studentData.totalTimeSpent || 0
    };
  }

  return {
    averageScore: totalScore / validCourses,
    completion: totalCompletion / validCourses,
    submissionRate: totalSubmission / validCourses,
    expertiseRate: totalExpertise / validCourses,
    timeSpent: totalTime / validCourses
  };
};