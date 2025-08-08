/**
 * Utility functions for processing and transforming data for visualization and analysis
 */
import { calculateRiskAssessment } from './scoreCalculations';

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
  
  // Log safely with defensive checks - no need to use logDebug to avoid circular imports
  console.log('generateRadarChartData received:', 
    studentData ? {
      id: studentData.id,
      hasData: true,
      hasCourses: Array.isArray(studentData.courses) && studentData.courses.length > 0
    } : 'No student data');
    
  console.log('generateRadarChartData classAverage:', classAverage);
  
  // Calculate submission rate from courses if not directly available
  let submissionRate = studentData.submissionRate;
  if (submissionRate === undefined && Array.isArray(studentData.courses)) {
    let totalAssignments = 0;
    let submittedAssignments = 0;
    
    studentData.courses.forEach(course => {
      if (Array.isArray(course?.assignments)) {
        totalAssignments += course.assignments.length;
        submittedAssignments += course.assignments.filter(a => 
          a?.progress?.submittedAt).length;
      }
    });
    
    submissionRate = totalAssignments > 0 ? 
      (submittedAssignments / totalAssignments) * 100 : 0;
  }
  
  // Calculate expertise rate if not directly available
  let expertiseRate = studentData.expertiseRate;
  if (expertiseRate === undefined && Array.isArray(studentData.courses)) {
    let totalModules = 0;
    let expertiseSum = 0;
    
    studentData.courses.forEach(course => {
      if (Array.isArray(course?.modules)) {
        totalModules += course.modules.length;
        course.modules.forEach(module => {
          expertiseSum += (module?.progress?.totalExpertiseRate || 0);
        });
      }
    });
    
    expertiseRate = totalModules > 0 ? 
      expertiseSum / totalModules : 0;
  }
  
  // Calculate average time spent across courses - FIXED to use totalTimeSpent
  let timeSpent = studentData.timeSpent || studentData.totalTimeSpent;
  console.log('Time spent before calculation:', timeSpent);
  if (timeSpent === undefined && Array.isArray(studentData.courses)) {
    let totalTime = 0;
    
    studentData.courses.forEach(course => {
      if (Array.isArray(course?.assignments)) {
        course.assignments.forEach(assignment => {
          totalTime += (assignment?.progress?.totalTime || 0);
        });
      }
    });
    
    timeSpent = totalTime;
  }
  
  const metrics = [
    {
      metric: 'Completion Rate',
      value: studentData.completion || studentData.completionRate || studentData.overallCompletion || 0,
      classAverage: classAverage?.completion || 0
    },
    {
      metric: 'Overall Score',
      value: studentData.averageScore || 0,
      classAverage: classAverage?.averageScore || 0
    },
    {
      metric: 'Submission Rate',
      value: submissionRate || 0,
      classAverage: classAverage?.submissionRate || 0
    },
    {
      metric: 'Expertise Rate',
      value: expertiseRate || 0,
      classAverage: classAverage?.expertiseRate || 0
    },
    {
      metric: 'Time Spent',
      value: normalizeTimeSpent(timeSpent || 0),
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
  const maxTimeSpent = 3000; // 10 hours as reasonable maximum
  
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
    const score = student.averageScore || 0;
    
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

/**
 * Creates a performance summary object for a student
 * @param {Object} studentData - The student performance data
 * @returns {Object} - Performance summary with key metrics
 */
export const createPerformanceSummary = (studentData) => {
  if (!studentData) return null;
  
  const risk = calculateRiskAssessment(studentData, true);
  
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
 * Calculates class averages for comparison purposes
 * @param {Array} allStudentsData - Array of all students' data for the class
 * @param {Array} courseIds - Array of course IDs to calculate averages for (optional, defaults to all courses)
 * @returns {Object} - Class average metrics
 */
export const calculateClassAverages = (allStudentsData, courseIds = null) => {
  if (!allStudentsData || allStudentsData.length === 0) {
    return {
      averageScore: 0,
      completion: 0,
      submissionRate: 0,
      expertiseRate: 0,
      timeSpent: 0
    };
  }
  
  let totalScore = 0;
  let totalCompletion = 0;
  let totalTimeSpent = 0;
  let studentCount = 0;
  
  allStudentsData.forEach(student => {
    if (!student) return;
    
    // Handle both detailed student data (with courses) and aggregated student data
    if (student.courses && Array.isArray(student.courses)) {
      // Detailed student data with course structure
      let coursesToConsider = student.courses || [];
      if (courseIds && Array.isArray(courseIds)) {
        coursesToConsider = coursesToConsider.filter(course => 
          courseIds.includes(course.id)
        );
      }
      
      // Calculate metrics for this student from course data
      let studentScore = 0;
      let studentCompletion = 0;
      let studentTimeSpent = 0;
      let validCourses = 0;
      
      coursesToConsider.forEach(course => {
        if (course.summary && typeof course.summary.overallScore === 'number' && course.summary.overallScore > 0) {
          studentScore += course.summary.overallScore;
          studentCompletion += course.summary.completionRate || 0;
          studentTimeSpent += course.summary.totalTimeSpent || 0;
          validCourses++;
        }
      });
      
      // Average the student's metrics across their valid courses
      if (validCourses > 0) {
        totalScore += studentScore / validCourses;
        totalCompletion += studentCompletion / validCourses;
        totalTimeSpent += studentTimeSpent;
        studentCount++;
      }
    } else {
      // Aggregated student data (from fetchStudentsByTeacher)
      const studentScore = student.scores?.average || student.averageScore || 0;
      const studentCompletion = student.completion || student.completionRate || 0;
      const studentTimeSpent = student.totalTimeSpent || student.timeSpent || 0;
      
      if (studentScore > 0) {
        totalScore += studentScore;
        totalCompletion += studentCompletion;
        totalTimeSpent += studentTimeSpent;
        studentCount++;
      }
    }
  });
  
  // Calculate class averages
  const averageTimeSpent = studentCount > 0 ? totalTimeSpent / studentCount : 0;
  
  return {
    averageScore: studentCount > 0 ? totalScore / studentCount : 0,
    completion: studentCount > 0 ? totalCompletion / studentCount : 0,
    submissionRate: 75, // Default reasonable value since we don't have detailed assignment data
    expertiseRate: 75, // Default reasonable value since we don't have detailed module data
    timeSpent: averageTimeSpent
  };
};