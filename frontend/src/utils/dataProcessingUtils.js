/**
 * Utility functions for processing and transforming data for visualization and analysis
 */
import { calculateRiskAssessment, calculateStudentMetrics } from './scoreCalculations';
import { getStudentName } from './studentUtils';

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
export const generateRadarChartData = (studentData, classAverage = null, options = {}) => {
  if (!studentData) return [];
  
  // Log safely with defensive checks - no need to use logDebug to avoid circular imports
  console.log('generateRadarChartData received:', 
    studentData ? {
      id: studentData.id,
      hasData: true,
      hasCourses: Array.isArray(studentData.courses) && studentData.courses.length > 0
    } : 'No student data');
    
  console.log('generateRadarChartData classAverage:', classAverage);
  
  // Use calculateStudentMetrics to obtain either aggregated or per-course metrics
  const { selectedCourseId, selectedCourseName } = options || {};
  const metricsSource = calculateStudentMetrics(studentData, { selectedCourseId, selectedCourseName });
  let submissionRate = metricsSource.submissionRate;
  let expertiseRate = metricsSource.expertiseRate;
  let timeSpent = metricsSource.timeSpent;

  // If any of the metrics are missing or zero, compute fallbacks from detailed course data
  const courses = Array.isArray(studentData.courses) ? studentData.courses : [];
  let coursesToConsider = courses;
  if (selectedCourseId && selectedCourseId !== 'all') {
    coursesToConsider = courses.filter(c => c.id === selectedCourseId);
  } else if (selectedCourseName && selectedCourseName !== 'all') {
    coursesToConsider = courses.filter(c => (c.courseName === selectedCourseName || c.name === selectedCourseName));
  } else {
    // When showing "All Courses", filter out courses where the student has no meaningful activity
    coursesToConsider = courses.filter(course => {
      // Check if course has any assignments or modules the student has interacted with
      const hasAssignments = Array.isArray(course?.assignments) && course.assignments.length > 0;
      const hasModules = Array.isArray(course?.modules) && course.modules.length > 0;
      const hasSubmittedWork = hasAssignments && course.assignments.some(a => 
        a?.progress?.submittedAt || a?.progress?.submissionDate
      );
      const hasModuleProgress = hasModules && course.modules.some(m => 
        (m?.progress?.totalExpertiseRate || 0) > 0 || (m?.progress?.completion || 0) > 0
      );
      
      // Check if there's a meaningful score (not just 0 from no activity)
      const score = course?.summary?.overallScore ?? 
                   course?.summary?.averageScore ?? 
                   course?.summary?.average ?? 
                   course?.averageScore ?? 
                   course?.grade ?? 
                   course?.finalGrade ?? 
                   course?.score ?? 0;
      
      // Include course if: has score > 0, OR has submitted work, OR has module progress
      return (typeof score === 'number' && score > 0) || hasSubmittedWork || hasModuleProgress;
    });
  }

  // Fallback: compute submissionRate from assignments if not provided
  if (!submissionRate && coursesToConsider.length > 0) {
    let totalAssignments = 0;
    let submittedAssignments = 0;
    coursesToConsider.forEach(course => {
      if (Array.isArray(course?.assignments)) {
        totalAssignments += course.assignments.length;
        submittedAssignments += course.assignments.filter(a => a?.progress?.submittedAt || a?.progress?.submissionDate).length;
      }
    });
    submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
  }

  // Fallback: compute expertiseRate from modules if not provided
  if (!expertiseRate && coursesToConsider.length > 0) {
    let totalModules = 0;
    let expertiseSum = 0;
    coursesToConsider.forEach(course => {
      if (Array.isArray(course?.modules)) {
        totalModules += course.modules.length;
        course.modules.forEach(module => {
          expertiseSum += (module?.progress?.totalExpertiseRate || 0);
        });
      }
    });
    expertiseRate = totalModules > 0 ? expertiseSum / totalModules : 0;
  }

  // Fallback: compute timeSpent from assignments if not provided
  if (!timeSpent && coursesToConsider.length > 0) {
    let totalTime = 0;
    coursesToConsider.forEach(course => {
      // Prefer course.summary fields if available (multiple possible field names)
      if (course?.summary) {
        const s = course.summary;
        if (typeof s.totalTimeSpent === 'number' && s.totalTimeSpent > 0) { totalTime += s.totalTimeSpent; return; }
        if (typeof s.totalTimeSpentMinutes === 'number' && s.totalTimeSpentMinutes > 0) { totalTime += s.totalTimeSpentMinutes; return; }
        if (typeof s.timeSpent === 'number' && s.timeSpent > 0) { totalTime += s.timeSpent; return; }
        if (typeof s.timeSpentMinutes === 'number' && s.timeSpentMinutes > 0) { totalTime += s.timeSpentMinutes; return; }
        if (typeof s.totalTimeSpentSeconds === 'number' && s.totalTimeSpentSeconds > 0) { totalTime += Math.round(s.totalTimeSpentSeconds / 60); return; }
      }

      if (Array.isArray(course?.assignments)) {
        course.assignments.forEach(assignment => {
          // Support multiple possible fields for time spent collected in different data shapes
          const progress = assignment?.progress || {};
          totalTime += (
            progress.totalTime ||
            progress.timeSpentMinutes ||
            progress.timeSpent ||
            progress.totalTimeSpentMinutes ||
            progress.totalTimeSpent ||
            (typeof progress.timeSpentSeconds === 'number' ? Math.round(progress.timeSpentSeconds / 60) : 0) ||
            0
          );
        });
      }
    });

    // If still zero, check student-level totals (multiple possible field names)
    if (totalTime === 0) {
      totalTime = studentData.totalTimeSpent || studentData.totalTimeSpentMinutes || studentData.timeSpent || studentData.totalTimeSpentSeconds ? Math.round((studentData.totalTimeSpentSeconds || 0) / 60) : 0;
    }

    timeSpent = totalTime;

    // Debug: log raw and normalized timeSpent so we can see what the function computed
    if (process.env.NODE_ENV !== 'production') {
      try {
        // eslint-disable-next-line no-console
        console.debug('generateRadarChartData: computed timeSpent (minutes):', timeSpent, 'normalized:', normalizeTimeSpent(timeSpent || 0));
      } catch (e) {}
    }
  }
  
  const metrics = [
    {
      metric: 'Completion Rate',
      value: metricsSource.completion || studentData.completion || studentData.completionRate || studentData.overallCompletion || 0,
      classAverage: classAverage?.completion || 0
    },
    {
      metric: 'Overall Score',
      value: metricsSource.averageScore || studentData.averageScore || 0,
      classAverage: classAverage?.averageScore || 0
    },
    {
      metric: 'Submission Rate',
      value: submissionRate || studentData.submissionRate || 0,
      classAverage: classAverage?.submissionRate || 0
    },
    {
      metric: 'Expertise Rate',
      value: expertiseRate || studentData.expertiseRate || 0,
      classAverage: classAverage?.expertiseRate || 0
    },
    {
      metric: 'Time Spent',
      // Keep normalized value for plotting, but expose raw minutes in `raw` for UI display
      value: normalizeTimeSpent(timeSpent || 0),
      raw: timeSpent || 0,
      classAverage: normalizeTimeSpent(classAverage?.timeSpent || 0),
      classAverageRaw: classAverage?.timeSpent || 0
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
    name: getStudentName(studentData),
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
    // submissionRate: 75, // Default reasonable value since we don't have detailed assignment data
    // expertiseRate: 75, // Default reasonable value since we don't have detailed module data
    timeSpent: averageTimeSpent
  };
};