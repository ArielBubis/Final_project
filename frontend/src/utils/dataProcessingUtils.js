/**
 * Utility functions for processing and transforming data for visualization and analysis
 */

/**
 * Calculates the average value from an array of numbers
 * @param {Array<number>} values - Array of numeric values
 * @returns {number} - The calculated average
 */
export const calculateAverage = (values) => {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((total, val) => total + (val || 0), 0);
  return sum / values.length;
};

/**
 * Normalizes a value to a 0-100 scale based on min and max bounds
 * @param {number} value - The value to normalize
 * @param {number} min - Minimum value in the range
 * @param {number} max - Maximum value in the range
 * @returns {number} - Normalized value between 0 and 100
 */
export const normalizeValue = (value, min, max) => {
  if (max === min) return 50; // Default to middle if range is zero
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
};

/**
 * Generates data for radar chart visualization from student performance metrics
 * @param {Object} studentData - The student performance data
 * @param {Object} classAverage - Optional class average data for comparison
 * @returns {Array} - Formatted data for radar chart
 */
export const generateRadarChartData = (studentData, classAverage = null) => {
  if (!studentData) return [];
  
  const metrics = [
    {
      metric: 'Completion Rate',
      value: studentData.completion || studentData.overallCompletion || 0,
      classAverage: classAverage?.completion || 0
    },
    {
      metric: 'Overall Score',
      value: studentData.score || studentData.averageScore || 0,
      classAverage: classAverage?.score || 0
    },
    {
      metric: 'Submission Rate',
      value: studentData.submissionRate || 0,
      classAverage: classAverage?.submissionRate || 0
    },
    {
      metric: 'Expertise Rate',
      value: studentData.expertiseRate || 0,
      classAverage: classAverage?.expertiseRate || 0
    },
    {
      metric: 'Time Spent',
      value: normalizeTimeSpent(studentData.timeSpent || 0),
      classAverage: normalizeTimeSpent(classAverage?.timeSpent || 0)
    }
  ];
  
  return metrics;
};

/**
 * Normalizes time spent for visualization (converts raw minutes to a 0-100 scale)
 * @param {number} timeInMinutes - Time spent in minutes
 * @returns {number} - Normalized value between 0 and 100
 */
export const normalizeTimeSpent = (timeInMinutes) => {
  // Define reasonable bounds for time spent (adjust based on your data)
  const minTimeSpent = 0;
  const maxTimeSpent = 600; // 10 hours as reasonable maximum
  
  return normalizeValue(timeInMinutes, minTimeSpent, maxTimeSpent);
};

/**
 * Generates grade distribution data for visualization
 * @param {Array} studentsData - Array of student performance data
 * @returns {Array} - Formatted grade distribution data
 */
export const generateGradeDistribution = (studentsData) => {
  if (!studentsData || studentsData.length === 0) {
    return [];
  }
  
  // Initialize grade distribution buckets
  const gradeDistribution = [
    { grade: '90+', count: 0, percentage: 0 },
    { grade: '80-89', count: 0, percentage: 0 },
    { grade: '70-79', count: 0, percentage: 0 },
    { grade: '60-69', count: 0, percentage: 0 },
    { grade: 'Below 60', count: 0, percentage: 0 }
  ];
  
  // Count students in each grade range
  studentsData.forEach(student => {
    const score = student.score || student.averageScore || 0;
    
    if (score >= 90) gradeDistribution[0].count++;
    else if (score >= 80) gradeDistribution[1].count++;
    else if (score >= 70) gradeDistribution[2].count++;
    else if (score >= 60) gradeDistribution[3].count++;
    else gradeDistribution[4].count++;
  });
  
  // Calculate percentages
  const totalStudents = studentsData.length;
  gradeDistribution.forEach(grade => {
    grade.percentage = Math.round((grade.count / totalStudents) * 100);
  });
  
  return gradeDistribution;
};

/**
 * Calculates risk score for a student based on various factors
 * @param {Object} studentData - The student performance data
 * @returns {Object} - Risk assessment with score and factors
 */
export const calculateRiskScore = (studentData) => {
  if (!studentData) return { score: 0, factors: [] };
  
  let riskScore = 0;
  const riskFactors = [];
  
  // Check average score
  if (studentData.averageScore < 60) {
    riskScore += 30;
    riskFactors.push("Failing average score");
  } else if (studentData.averageScore < 70) {
    riskScore += 20;
    riskFactors.push("Low average score");
  }
  
  // Check completion rate
  if (studentData.overallCompletion < 40) {
    riskScore += 30;
    riskFactors.push("Very low course completion");
  } else if (studentData.overallCompletion < 60) {
    riskScore += 15;
    riskFactors.push("Below average course completion");
  }
  
  // Check missing assignments
  if (studentData.missingAssignments > 5) {
    riskScore += 25;
    riskFactors.push("Multiple missing assignments");
  } else if (studentData.missingAssignments > 2) {
    riskScore += 10;
    riskFactors.push("Several missing assignments");
  }
  
  // Check days since last access
  const daysSinceLastAccess = studentData.daysSinceLastAccess || 0;
  if (daysSinceLastAccess > 21) {
    riskScore += 25;
    riskFactors.push("No course access in over 3 weeks");
  } else if (daysSinceLastAccess > 14) {
    riskScore += 15;
    riskFactors.push("No course access in over 2 weeks");
  } else if (daysSinceLastAccess > 7) {
    riskScore += 5;
    riskFactors.push("No course access in over a week");
  }
  
  // Check submission rate
  if (studentData.submissionRate < 50) {
    riskScore += 15;
    riskFactors.push("Low assignment submission rate");
  }
  
  // Generate risk level
  let riskLevel = "Low";
  if (riskScore >= 50) {
    riskLevel = "High";
  } else if (riskScore >= 25) {
    riskLevel = "Medium";
  }
  
  return {
    score: riskScore,
    level: riskLevel,
    factors: riskFactors
  };
};

/**
 * Creates a performance summary object for a student
 * @param {Object} studentData - The student performance data
 * @returns {Object} - Performance summary with key metrics
 */
export const createPerformanceSummary = (studentData) => {
  if (!studentData) return null;
  
  const risk = calculateRiskScore(studentData);
  
  return {
    id: studentData.id || studentData.studentId,
    name: `${studentData.firstName} ${studentData.lastName}`,
    averageScore: studentData.averageScore || 0,
    completionRate: studentData.overallCompletion || 0,
    submissionRate: studentData.submissionRate || 0,
    missingAssignments: studentData.missingAssignments || 0,
    riskScore: risk.score,
    riskLevel: risk.level,
    riskFactors: risk.factors,
    lastAccessed: studentData.lastAccessed
  };
};

/**
 * Processes raw time series data for visualization
 * @param {Array} timeSeriesData - Raw time series data
 * @param {string} metricKey - The metric key to extract
 * @param {string} timeKey - The time/date key
 * @returns {Array} - Processed data ready for visualization
 */
export const processTimeSeriesData = (timeSeriesData, metricKey, timeKey = 'date') => {
  if (!timeSeriesData || !Array.isArray(timeSeriesData)) return [];
  
  // Sort by date if available
  const sorted = [...timeSeriesData].sort((a, b) => {
    if (!a[timeKey] || !b[timeKey]) return 0;
    return new Date(a[timeKey]) - new Date(b[timeKey]);
  });
  
  // Process the data for visualization
  return sorted.map(item => ({
    date: item[timeKey],
    value: item[metricKey] || 0
  }));
};