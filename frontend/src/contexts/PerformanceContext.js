import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  fetchStudentOverallAnalytics, 
  fetchStudentCourseAnalytics,
  fetchCourseAnalytics,
  fetchTeacherAnalytics
} from '../services/courseAnalyticsService';
import { processFirestoreData } from '../utils/firebaseUtils';

// Create context
const PerformanceContext = createContext(null);

// Custom hook to use the performance context
export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance must be used within a PerformanceProvider");
  }
  return context;
};

// Context provider component
export const PerformanceProvider = ({ children }) => {
  // State for different types of analytics data
  const [studentPerformance, setStudentPerformance] = useState({});
  const [courseAnalytics, setCourseAnalytics] = useState({});
  const [teacherAnalytics, setTeacherAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cache for analytics data to prevent redundant fetching
  const [analyticsCache, setAnalyticsCache] = useState({
    students: {},     // studentId -> data
    courses: {},      // courseId -> data 
    teachers: {},     // teacherId -> data
    studentCourses: {} // studentId_courseId -> data
  });

  /**
   * Get student performance data with caching
   * 
   * @param {string} studentId - The student's ID
   * @returns {Promise<Object>} - Performance data for the student
   */
  const getStudentPerformance = useCallback(async (studentId) => {
    if (!studentId) {
      setError("Student ID is required");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      if (analyticsCache.students[studentId]) {
        setStudentPerformance(analyticsCache.students[studentId]);
        setLoading(false);
        return analyticsCache.students[studentId];
      }
      
      // Fetch from service if not in cache
      const data = await fetchStudentOverallAnalytics(studentId);
      const processedData = processFirestoreData(data);
      
      // Update state and cache
      setStudentPerformance(processedData);
      setAnalyticsCache(prev => ({
        ...prev,
        students: {
          ...prev.students,
          [studentId]: processedData
        }
      }));
      
      setLoading(false);
      return processedData;
    } catch (err) {
      setError(`Error fetching student performance: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [analyticsCache]);

  /**
   * Get course analytics data with caching
   * 
   * @param {string} courseId - The course ID
   * @returns {Promise<Object>} - Analytics data for the course
   */
  const getCourseAnalytics = useCallback(async (courseId) => {
    if (!courseId) {
      setError("Course ID is required");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      if (analyticsCache.courses[courseId]) {
        setCourseAnalytics(analyticsCache.courses[courseId]);
        setLoading(false);
        return analyticsCache.courses[courseId];
      }
      
      // Fetch from service if not in cache
      const data = await fetchCourseAnalytics(courseId);
      const processedData = processFirestoreData(data);
      
      // Update state and cache
      setCourseAnalytics(processedData);
      setAnalyticsCache(prev => ({
        ...prev,
        courses: {
          ...prev.courses,
          [courseId]: processedData
        }
      }));
      
      setLoading(false);
      return processedData;
    } catch (err) {
      setError(`Error fetching course analytics: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [analyticsCache]);

  /**
   * Get student-course specific analytics with caching
   * 
   * @param {string} studentId - The student ID
   * @param {string} courseId - The course ID
   * @returns {Promise<Object>} - The student's performance in the specific course
   */
  const getStudentCoursePerformance = useCallback(async (studentId, courseId) => {
    if (!studentId || !courseId) {
      setError("Student ID and Course ID are required");
      return null;
    }
    
    const cacheKey = `${studentId}_${courseId}`;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      if (analyticsCache.studentCourses[cacheKey]) {
        setLoading(false);
        return analyticsCache.studentCourses[cacheKey];
      }
      
      // Fetch from service if not in cache
      const data = await fetchStudentCourseAnalytics(studentId, courseId);
      const processedData = processFirestoreData(data);
      
      // Update cache only (not setting to state since this is course-specific)
      setAnalyticsCache(prev => ({
        ...prev,
        studentCourses: {
          ...prev.studentCourses,
          [cacheKey]: processedData
        }
      }));
      
      setLoading(false);
      return processedData;
    } catch (err) {
      setError(`Error fetching student course performance: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [analyticsCache]);

  /**
   * Get teacher analytics with caching
   * 
   * @param {string} teacherId - The teacher's ID
   * @returns {Promise<Object>} - Analytics data for all the teacher's courses
   */
  const getTeacherAnalytics = useCallback(async (teacherId) => {
    if (!teacherId) {
      setError("Teacher ID is required");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      if (analyticsCache.teachers[teacherId]) {
        setTeacherAnalytics(analyticsCache.teachers[teacherId]);
        setLoading(false);
        return analyticsCache.teachers[teacherId];
      }
      
      // Fetch from service if not in cache
      const data = await fetchTeacherAnalytics(teacherId);
      const processedData = processFirestoreData(data);
      
      // Update state and cache
      setTeacherAnalytics(processedData);
      setAnalyticsCache(prev => ({
        ...prev,
        teachers: {
          ...prev.teachers,
          [teacherId]: processedData
        }
      }));
      
      setLoading(false);
      return processedData;
    } catch (err) {
      setError(`Error fetching teacher analytics: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [analyticsCache]);

  /**
   * Clear the cache for a specific entity or all cache
   * 
   * @param {string} type - Type of cache to clear ('students', 'courses', 'teachers', 'studentCourses', or 'all')
   * @param {string} [id] - Optional ID to clear specific cache entry
   */
  const clearCache = useCallback((type = 'all', id = null) => {
    if (type === 'all') {
      setAnalyticsCache({
        students: {},
        courses: {},
        teachers: {},
        studentCourses: {}
      });
      return;
    }
    
    if (id && analyticsCache[type]) {
      setAnalyticsCache(prev => {
        const newCache = { ...prev };
        const typeCache = { ...newCache[type] };
        delete typeCache[id];
        newCache[type] = typeCache;
        return newCache;
      });
    } else if (!id && analyticsCache[type]) {
      setAnalyticsCache(prev => ({
        ...prev,
        [type]: {}
      }));
    }
  }, [analyticsCache]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    // Data
    studentPerformance,
    courseAnalytics,
    teacherAnalytics,
    loading,
    error,
    
    // Methods
    getStudentPerformance,
    getCourseAnalytics,
    getStudentCoursePerformance,
    getTeacherAnalytics,
    clearCache,
  }), [
    studentPerformance, 
    courseAnalytics,
    teacherAnalytics,
    loading, 
    error,
    getStudentPerformance,
    getCourseAnalytics,
    getStudentCoursePerformance,
    getTeacherAnalytics,
    clearCache
  ]);

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};