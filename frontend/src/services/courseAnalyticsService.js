/**
 * Course Analytics Service
 * 
 * Handles operations related to course performance analytics and metrics
 * Centralizes data processing logic for course performance
 */

import { calculateAverage, generateGradeDistribution } from '../utils/dataProcessingUtils';
import { fetchDocuments } from '../utils/firebaseUtils';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { processFirestoreData } from '../utils/firebaseUtils';

/**
 * Fetches course analytics data for a specific course
 * @param {string} courseId - The ID of the course to fetch analytics for
 * @returns {Promise<Object>} - Promise resolving to course analytics data
 */
export const fetchCourseAnalytics = async (courseId) => {
  try {
    // In a real implementation, this would make an API call to fetch course analytics
    // For now, we'll return mock data
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock analytics data
    const studentCount = Math.floor(Math.random() * 50) + 10;
    const completionRates = Array.from({ length: studentCount }, () => Math.floor(Math.random() * 100));
    const scores = Array.from({ length: studentCount }, () => Math.floor(Math.random() * 40) + 60); // 60-100 range
    const submissionRates = Array.from({ length: studentCount }, () => Math.floor(Math.random() * 50) + 50); // 50-100 range
    
    // Calculate engagement metrics (mock data)
    const activeStudentsLastWeek = Math.floor(Math.random() * studentCount * 0.8);
    const activeStudentsLastMonth = Math.floor(Math.random() * (studentCount - activeStudentsLastWeek)) + activeStudentsLastWeek;
    
    // Generate time series data (last 12 weeks)
    const timeSeriesData = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i * 7); // weekly data points
      
      timeSeriesData.push({
        week: `Week ${12-i}`,
        date: date.toISOString().split('T')[0],
        averageScore: 65 + Math.floor(Math.random() * 20),
        completionRate: 40 + Math.floor(Math.random() * 30) + i * 2, // trending upward
        activeStudents: Math.floor(Math.random() * studentCount * 0.8)
      });
    }
    
    // Generate grade distribution
    const mockStudentsData = scores.map((score, index) => ({
      score,
      completion: completionRates[index],
      submissionRate: submissionRates[index]
    }));
    const gradeDistribution = generateGradeDistribution(mockStudentsData);
    
    // Return formatted course analytics
    return {
      courseId,
      studentCount,
      activeStudentsLastWeek,
      activeStudentsLastMonth,
      averageScore: calculateAverage(scores),
      averageCompletion: calculateAverage(completionRates),
      averageSubmissionRate: calculateAverage(submissionRates),
      gradeDistribution,
      timeSeriesData,
      assignmentAnalytics: {
        totalAssignments: Math.floor(Math.random() * 20) + 5,
        completedOnTime: Math.floor(Math.random() * 70) + 30, // percentage
        completedLate: Math.floor(Math.random() * 20), // percentage
        notSubmitted: Math.floor(Math.random() * 10) // percentage
      },
      riskAnalytics: {
        highRiskCount: Math.floor(Math.random() * studentCount * 0.1),
        mediumRiskCount: Math.floor(Math.random() * studentCount * 0.2),
        lowRiskCount: studentCount - Math.floor(Math.random() * studentCount * 0.3)
      }
    };
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    throw error;
  }
};

/**
 * Analyzes course performance trends over time
 * @param {string} courseId - The ID of the course to analyze
 * @param {string} metricType - The metric type to analyze (score, completion, engagement)
 * @param {string} timeRange - Time range for analysis (week, month, quarter, year)
 * @returns {Promise<Array>} - Promise resolving to trend data
 */
export const analyzeCoursePerformanceTrend = async (courseId, metricType = 'score', timeRange = 'month') => {
  try {
    // Get course analytics
    const analytics = await fetchCourseAnalytics(courseId);
    
    // Filter time series data based on time range
    let filteredData = analytics.timeSeriesData;
    if (timeRange === 'week') {
      filteredData = filteredData.slice(-1);
    } else if (timeRange === 'month') {
      filteredData = filteredData.slice(-4);
    } else if (timeRange === 'quarter') {
      filteredData = filteredData.slice(-12);
    }
    
    // Map the metric type to the corresponding data field
    const metricMap = {
      'score': 'averageScore',
      'completion': 'completionRate',
      'engagement': 'activeStudents'
    };
    
    const metricField = metricMap[metricType] || 'averageScore';
    
    // Format trend data
    return filteredData.map(point => ({
      date: point.date,
      week: point.week,
      value: point[metricField]
    }));
  } catch (error) {
    console.error('Error analyzing course performance trend:', error);
    return [];
  }
};

/**
 * Compares performance across multiple courses
 * @param {Array<string>} courseIds - Array of course IDs to compare
 * @returns {Promise<Object>} - Promise resolving to comparative analysis
 */
export const compareCoursePerformance = async (courseIds) => {
  try {
    // Fetch analytics for all courses in parallel
    const analyticsPromises = courseIds.map(id => fetchCourseAnalytics(id));
    const analyticsResults = await Promise.all(analyticsPromises);
    
    // Format comparative data
    const comparisonData = analyticsResults.map((analytics, index) => ({
      courseId: courseIds[index],
      averageScore: analytics.averageScore,
      averageCompletion: analytics.averageCompletion,
      studentCount: analytics.studentCount,
      submissionRate: analytics.averageSubmissionRate,
      riskRatio: (analytics.riskAnalytics.highRiskCount + analytics.riskAnalytics.mediumRiskCount) / analytics.studentCount
    }));
    
    // Calculate overall averages across all courses
    const overallAverages = {
      averageScore: calculateAverage(comparisonData.map(d => d.averageScore)),
      averageCompletion: calculateAverage(comparisonData.map(d => d.averageCompletion)),
      averageSubmissionRate: calculateAverage(comparisonData.map(d => d.submissionRate)),
      averageRiskRatio: calculateAverage(comparisonData.map(d => d.riskRatio))
    };
    
    return {
      courseData: comparisonData,
      overallAverages
    };
  } catch (error) {
    console.error('Error comparing course performance:', error);
    return { courseData: [], overallAverages: {} };
  }
};

/**
 * Identifies at-risk students in a course
 * @param {string} courseId - The ID of the course
 * @returns {Promise<Array>} - Promise resolving to list of at-risk students
 */
export const identifyAtRiskStudents = async (courseId) => {
  try {
    // In a real implementation, this would call an API with actual student data
    // For now, we'll generate mock data
    
    // Mock student count
    const studentCount = Math.floor(Math.random() * 50) + 10;
    
    // Generate mock student data
    const students = Array.from({ length: studentCount }, (_, index) => {
      const score = Math.floor(Math.random() * 100);
      const completion = Math.floor(Math.random() * 100);
      const submissionRate = Math.floor(Math.random() * 100);
      const daysSinceAccess = Math.floor(Math.random() * 30);
      
      // Calculate risk factors
      const lowScore = score < 70;
      const lowCompletion = completion < 60;
      const poorAttendance = daysSinceAccess > 14;
      const lowSubmissionRate = submissionRate < 70;
      
      // Determine risk level
      let riskLevel = "Low";
      let riskFactors = [];
      
      if (lowScore) riskFactors.push("Low scores");
      if (lowCompletion) riskFactors.push("Incomplete coursework");
      if (poorAttendance) riskFactors.push("Poor attendance");
      if (lowSubmissionRate) riskFactors.push("Low submission rate");
      
      if (riskFactors.length >= 3 || (lowScore && lowCompletion)) {
        riskLevel = "High";
      } else if (riskFactors.length >= 1) {
        riskLevel = "Medium";
      }
      
      return {
        id: `student-${courseId}-${index}`,
        name: `Student ${index + 1}`,
        score,
        completion,
        submissionRate,
        daysSinceAccess,
        riskLevel,
        riskFactors
      };
    });
    
    // Filter to only at-risk students
    const atRiskStudents = students.filter(
      s => s.riskLevel === "High" || s.riskLevel === "Medium"
    );
    
    // Sort by risk level (high first)
    atRiskStudents.sort((a, b) => {
      if (a.riskLevel === "High" && b.riskLevel !== "High") return -1;
      if (a.riskLevel !== "High" && b.riskLevel === "High") return 1;
      return 0;
    });
    
    return atRiskStudents;
  } catch (error) {
    console.error('Error identifying at-risk students:', error);
    return [];
  }
};

/**
 * Fetches detailed analytics for a student in a specific course
 * 
 * @param {string} studentId - The student's ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} Student's performance data for the course
 */
export const fetchStudentCourseAnalytics = async (studentId, courseId) => {
  try {
    // In a real implementation, this would fetch real data from Firestore
    // For now, we'll generate mock data that matches our expected structure
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
    
    // Generate mock course performance data
    const completion = Math.floor(Math.random() * 50) + 50; // 50-100%
    const score = Math.floor(Math.random() * 40) + 60; // 60-100%
    const submissionRate = Math.floor(Math.random() * 30) + 70; // 70-100%
    const expertiseRate = Math.floor(Math.random() * 60) + 40; // 40-100%
    const timeSpent = Math.floor(Math.random() * 500) + 100; // 100-600 minutes
    
    // Create a realistic last accessed date (between 0-20 days ago)
    const lastAccessed = new Date();
    lastAccessed.setDate(lastAccessed.getDate() - Math.floor(Math.random() * 21));
    
    // Mock module and assignment counts
    const moduleCount = Math.floor(Math.random() * 6) + 3; // 3-8 modules
    const assignmentCount = Math.floor(Math.random() * 10) + 5; // 5-15 assignments
    const submittedAssignmentCount = Math.floor(assignmentCount * (submissionRate / 100));
    
    return {
      courseId,
      courseName: `Course ${courseId.substring(0, 4)}`,
      completion,
      score,
      submissionRate,
      expertiseRate,
      timeSpent,
      lastAccessed,
      moduleCount,
      assignmentCount,
      submittedAssignmentCount
    };
  } catch (error) {
    console.error(`Error fetching analytics for student ${studentId} in course ${courseId}:`, error);
    return {
      completion: 0,
      score: 0,
      submissionRate: 0,
      expertiseRate: 0,
      timeSpent: 0,
      error: error.message
    };
  }
};

/**
 * Fetch student performance across all enrolled courses
 * 
 * @param {string} studentId - The student's ID
 * @returns {Promise<Object>} Student's aggregate performance data
 */
export const fetchStudentOverallAnalytics = async (studentId) => {
  try {
    // In a real implementation, this would fetch real data
    // For now, we'll generate mock data
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    // Generate between 1-5 mock courses
    const courseCount = Math.floor(Math.random() * 5) + 1;
    
    // Generate a list of course IDs
    const courseIds = Array.from({ length: courseCount }, (_, i) => `course-${i+1}`);
    
    // Generate course performance data for each course
    const coursePromises = courseIds.map(courseId => fetchStudentCourseAnalytics(studentId, courseId));
    const coursePerformanceData = await Promise.all(coursePromises);
    
    // Calculate overall metrics
    const overallCompletion = calculateAverage(coursePerformanceData.map(c => c.completion));
    const averageScore = calculateAverage(coursePerformanceData.map(c => c.score));
    const submissionRate = calculateAverage(coursePerformanceData.map(c => c.submissionRate));
    const expertiseRate = calculateAverage(coursePerformanceData.map(c => c.expertiseRate));
    const timeSpent = coursePerformanceData.reduce((sum, c) => sum + c.timeSpent, 0);
    
    // Generate last accessed date (most recent of all courses)
    const lastAccessed = coursePerformanceData.reduce((latest, course) => {
      if (!latest || (course.lastAccessed && course.lastAccessed > latest)) {
        return course.lastAccessed;
      }
      return latest;
    }, null);
    
    // Calculate risk factors
    const missingAssignments = coursePerformanceData.reduce(
      (sum, c) => sum + ((c.assignmentCount || 0) - (c.submittedAssignmentCount || 0)), 
      0
    );
    
    const daysSinceLastAccess = lastAccessed ? 
      Math.floor((new Date() - lastAccessed) / (1000 * 60 * 60 * 24)) : 
      30; // Default to 30 days if no access record
    
    // Determine if student is at risk
    const isAtRisk = averageScore < 70 || overallCompletion < 60 || missingAssignments > 3 || daysSinceLastAccess > 14;
    
    // Generate risk reasons
    const riskReasons = [];
    if (averageScore < 70) riskReasons.push(`Low overall score (${Math.round(averageScore)}%)`);
    if (overallCompletion < 60) riskReasons.push(`Low course completion (${Math.round(overallCompletion)}%)`);
    if (missingAssignments > 3) riskReasons.push(`${missingAssignments} missing assignments`);
    if (daysSinceLastAccess > 14) riskReasons.push(`${daysSinceLastAccess} days since last access`);
    
    return {
      studentId,
      firstName: `Student`,
      lastName: `${studentId.substring(0, 4)}`,
      email: `student${studentId.substring(0, 4)}@example.com`,
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      courseCount,
      coursePerformance: coursePerformanceData,
      overallCompletion,
      averageScore,
      submissionRate,
      expertiseRate,
      timeSpent,
      lastAccessed,
      missingAssignments,
      daysSinceLastAccess,
      isAtRisk,
      riskReasons
    };
  } catch (error) {
    console.error(`Error fetching overall analytics for student ${studentId}:`, error);
    return {
      error: error.message
    };
  }
};

/**
 * Fetch teacher analytics including all courses and students
 * 
 * @param {string} teacherId - The teacher's ID
 * @returns {Promise<Object>} Comprehensive teacher analytics
 */
export const fetchTeacherAnalytics = async (teacherId) => {
  try {
    // In a real implementation, this would fetch real data
    // For now, we'll generate mock data
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
    
    // Generate between 1-5 mock courses for this teacher
    const courseCount = Math.floor(Math.random() * 5) + 1;
    
    // Generate course IDs
    const courseIds = Array.from({ length: courseCount }, (_, i) => `course-${teacherId.substring(0, 4)}-${i+1}`);
    
    // Generate course analytics data for each course
    const coursePromises = courseIds.map(courseId => fetchCourseAnalytics(courseId));
    const coursesData = await Promise.all(coursePromises);
    
    // Generate total student count (sum of students across all courses)
    const totalStudents = coursesData.reduce((sum, course) => sum + course.studentCount, 0);
    
    // Generate active students count (sum of active students across all courses)
    const activeStudents = coursesData.reduce((sum, course) => sum + course.activeStudentsLastWeek, 0);
    
    // Calculate average completion across all courses
    const averageCompletion = calculateAverage(coursesData.map(course => course.averageCompletion || 0));
    
    // Generate sample student IDs for demonstration
    const studentIds = Array.from({ length: Math.min(20, totalStudents) }, (_, i) => `student-${i+1}`);
    
    return {
      teacherId,
      totalCourses: courseCount,
      totalStudents,
      activeStudents,
      averageCompletion,
      coursesData,
      studentCount: totalStudents,
      studentIds
    };
  } catch (error) {
    console.error(`Error fetching analytics for teacher ${teacherId}:`, error);
    return {
      error: error.message
    };
  }
};