/**
 * Dashboard calculation utilities
 * Pure functions for calculating dashboard metrics and statistics
 */

/**
 * Calculate the number of active students based on their last activity
 * @param {Array} students - Array of student objects
 * @param {number} daysAgo - Number of days to look back for activity (default: 7)
 * @returns {number} Number of active students
 */
export const calculateActiveStudents = (students, daysAgo = 7) => {
  if (!Array.isArray(students)) {
    return 0;
  }

  const cutoffDate = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
  
  return students.filter(student => {
    try {
      // Check both lastActive and lastAccessed fields
      const lastActiveDate = new Date(student.lastActive || student.lastAccessed);
      return lastActiveDate >= cutoffDate;
    } catch (e) {
      // If date parsing fails, consider student inactive
      return false;
    }
  }).length;
};

/**
 * Calculate active students percentage
 * @param {Array} students - Array of student objects
 * @param {number} daysAgo - Number of days to look back for activity (default: 7)
 * @returns {number} Percentage of active students (0-100)
 */
export const calculateActiveStudentsPercentage = (students, daysAgo = 7) => {
  if (!Array.isArray(students) || students.length === 0) {
    return 0;
  }

  const activeCount = calculateActiveStudents(students, daysAgo);
  return Math.round((activeCount / students.length) * 100);
};

/**
 * Calculate total courses count
 * @param {Array} courses - Array of course objects
 * @returns {number} Total number of courses
 */
export const calculateTotalCourses = (courses) => {
  return Array.isArray(courses) ? courses.length : 0;
};

/**
 * Calculate total students count
 * @param {Array} students - Array of student objects
 * @returns {number} Total number of students
 */
export const calculateTotalStudents = (students) => {
  return Array.isArray(students) ? students.length : 0;
};

/**
 * Calculate average completion across all courses
 * @param {Array} courses - Array of course objects with averageCompletion property
 * @returns {number} Average completion percentage (0-100)
 */
export const calculateAverageCompletion = (courses) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    return 0;
  }

  const totalCompletion = courses.reduce((sum, course) => {
    return sum + (course.averageCompletion || 0);
  }, 0);

  return Math.round(totalCompletion / courses.length);
};

/**
 * Calculate upcoming assignments count
 * @param {Object} dashboardData - Dashboard data object
 * @returns {number} Number of upcoming assignments
 */
export const calculateUpcomingAssignments = (dashboardData) => {
  return dashboardData?.upcomingAssignments || 0;
};

/**
 * Calculate all dashboard metrics at once
 * @param {Object} dashboardData - Pre-computed dashboard data (optional)
 * @param {Array} courses - Array of course objects
 * @param {Array} students - Array of student objects
 * @returns {Object} Object containing all dashboard metrics
 */
export const calculateDashboardMetrics = (dashboardData, courses, students) => {
  return {
    totalCourses: calculateTotalCourses(courses),
    totalStudents: calculateTotalStudents(students),
    activeStudents: calculateActiveStudents(students),
    activeStudentsPercentage: calculateActiveStudentsPercentage(students),
    avgCompletion: calculateAverageCompletion(courses),
    upcomingAssignments: calculateUpcomingAssignments(dashboardData)
  };
};