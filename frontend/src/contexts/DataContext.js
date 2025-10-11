import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchDocuments, fetchDocumentById, formatFirebaseTimestamp, fetchSubcollection } from '../utils/firebaseUtils';
import { formatStudentForUI } from '../utils/studentUtils';

/**
 * DataContext - Centralized Data Management for the Learning Management System
 * 
 * This context provides a comprehensive data layer for the LMS, handling:
 * - Student, teacher, and course data management
 * - Intelligent caching with configurable expiration times
 * - Firebase/Firestore integration with optimized queries
 * - Real-time performance metrics and analytics
 * - Risk assessment data aggregation
 * 
 * Key Features:
 * - Multi-level caching system (short, medium, long-term)
 * - Batch operations to minimize Firebase calls
 * - Automatic UID-to-ID resolution for user mapping
 * - Comprehensive error handling with fallback mechanisms
 * - Performance optimization through selective data loading
 * 
 * @version 2.0.0
 * @author LMS Development Team
 */

// Create the DataContext
const DataContext = createContext(null);

/**
 * Custom hook to access DataContext
 * 
 * @returns {Object} DataContext value with all data management functions
 * @throws {Error} If used outside of DataProvider
 * 
 * @example
 * const { fetchStudentsByTeacher, loading, error } = useData();
 */
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

/**
 * DataProvider Component - Main Provider for Application Data Management
 * 
 * Provides centralized data management for the entire LMS application with
 * intelligent caching, performance optimization, and comprehensive error handling.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to receive context
 * 
 * @example
 * <DataProvider>
 *   <App />
 * </DataProvider>
 */
export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  // === APPLICATION STATE ===
  
  /** Loading state for async operations */
  const [loading, setLoading] = useState(true);
  
  /** Error state for error handling and user feedback */
  const [error, setError] = useState(null);
  
  // === CORE DATA STATE ===
  
  /** Array of course documents from Firestore */
  const [courses, setCourses] = useState([]);
  
  /** Enriched course data with calculated metrics and statistics */
  const [courseData, setCourseData] = useState([]);
  
  // === CACHING SYSTEM ===
  
  /**
   * Cache timestamps for tracking data freshness
   * Used to determine when to refetch data vs use cached values
   */
  const [cacheTimestamps, setCacheTimestamps] = useState({
    courses: null,
    courseData: null,
    teacherDashboards: null
  });
  
  /**
   * Query-specific cache storage
   * Each cache type uses Map for efficient key-value lookups
   * with timestamp-based expiration
   */
  const [queryCache, setQueryCache] = useState({
    /** Teacher -> Students mapping cache */
    studentsByTeacher: new Map(),
    /** Teacher -> Courses mapping cache */
    teacherCourses: new Map(),
    /** Course statistics and metrics cache */
    courseStats: new Map(),
    /** Student assignment progress cache */
    studentAssignments: new Map(),
    /** Module completion progress cache */
    moduleProgress: new Map(),
    /** Teacher dashboard data cache */
    teacherDashboard: new Map(),
    /** Student course summary cache */
    studentCourseSummaries: new Map(),
    /** School information cache */
    schools: new Map(),
    /** Detailed student data cache */
    studentDetails: new Map() 
  });

  /**
   * Global data cache for preventing duplicate fetches
   * Stores frequently accessed data with timestamps
   */
  const [globalDataCache, setGlobalDataCache] = useState({
    allStudents: null,
    allCourses: null,
    lastFetch: null
  });
  
  /**
   * Cache expiration configuration
   * Different data types have different cache durations based on update frequency
   */
  const cacheExpirationRef = useRef({
    SHORT: 5 * 60 * 1000,    // 5 minutes - for frequently changing data
    MEDIUM: 15 * 60 * 1000,  // 15 minutes - for moderately stable data
    LONG: 60 * 60 * 1000     // 1 hour - for stable reference data
  });
  
  // === CACHE MANAGEMENT UTILITIES ===
  
  /**
   * Checks if cached data has expired based on timestamps
   * 
   * @param {string} cacheType - Type of cache to check (courses, courseData, etc.)
   * @returns {boolean} True if cache is expired or doesn't exist
   */
  const isCacheExpired = useCallback((cacheType) => {
    const timestamp = cacheTimestamps[cacheType];
    if (!timestamp) return true;
    
    const now = new Date().getTime();
    const expirationTime = cacheExpirationRef.current.MEDIUM;
    
    return now - timestamp > expirationTime;
  }, [cacheTimestamps]);
  
  /**
   * Updates the timestamp for a specific cache type
   * 
   * @param {string} cacheType - Type of cache to update timestamp for
   */
  const updateCacheTimestamp = useCallback((cacheType) => {
    setCacheTimestamps(prevState => ({
      ...prevState,
      [cacheType]: new Date().getTime()
    }));
  }, []);
  
  /**
   * Updates query-specific cache with data and expiration time
   * 
   * @param {string} cacheType - Type of query cache (studentsByTeacher, etc.)
   * @param {string} key - Unique identifier for the cached data
   * @param {*} value - Data to cache
   * @param {number|null} expirationTime - Custom expiration time in milliseconds
   */
  const updateQueryCache = useCallback((cacheType, key, value, expirationTime = null) => {
    const expTime = expirationTime || cacheExpirationRef.current.MEDIUM;
    setQueryCache(prevCache => {
      const updatedCache = new Map(prevCache[cacheType]);
      updatedCache.set(key, {
        data: value,
        timestamp: new Date().getTime(),
        expiration: expTime
      });
      return {
        ...prevCache,
        [cacheType]: updatedCache
      };
    });
  }, []);

  /**
   * Determines if a string is likely a Firebase UID
   * Used for resolving UIDs to internal document IDs
   * 
   * @param {string} value - String to check
   * @returns {boolean} True if the value appears to be a UID
   */
  const isLikelyUid = useCallback((value) => {
    return value && typeof value === 'string' && !value.includes('@') && value.length > 10;
  }, []);

  /**
   * Resolves a teacher UID to the corresponding document ID in Firestore
   * Handles the mapping between Firebase Auth UIDs and internal user IDs
   * 
   * @param {string} teacherUidOrId - Either a UID or document ID
   * @returns {Promise<{teacherId: string|null, found: boolean}>} Resolution result
   */
  const resolveTeacherId = useCallback(async (teacherUidOrId) => {
    if (!teacherUidOrId) return { teacherId: null, found: false };

    if (!isLikelyUid(teacherUidOrId)) {
      return { teacherId: teacherUidOrId, found: true };
    }

    try {
      console.log(`Looking up teacher ID for UID: ${teacherUidOrId}`);
      const teachersWithUid = await fetchDocuments('users', {
        filters: [
          { field: 'uid', operator: '==', value: teacherUidOrId },
          { field: 'role', operator: '==', value: 'teacher' }
        ]
      });
      if (teachersWithUid && teachersWithUid.length > 0) {
        const teacherId = teachersWithUid[0].id; // Firestore doc ID
        console.log(`Found teacher ID: ${teacherId} for UID: ${teacherUidOrId}`);
        return { teacherId, found: true };
      }
      console.warn(`No teacher found with UID: ${teacherUidOrId}`);
      return { teacherId: null, found: false };
    } catch (e) {
      console.error(`Error resolving teacher ID for UID ${teacherUidOrId}:`, e);
      return { teacherId: null, found: false };
    }
  }, [fetchDocuments, isLikelyUid]);
  
  /**
   * Retrieves data from query cache with automatic expiration handling
   * 
   * @param {string} cacheType - Type of query cache to access
   * @param {string} key - Unique identifier for the cached data
   * @returns {*|null} Cached data if valid, null if expired or not found
   */
  const getFromQueryCache = useCallback((cacheType, key) => {
    const cache = queryCache[cacheType];
    if (!cache) return null;
    
    const cachedEntry = cache.get(key);
    if (!cachedEntry) return null;
    
    const now = new Date().getTime();
    if (now - cachedEntry.timestamp > cachedEntry.expiration) {
      // Cache expired, remove it
      setQueryCache(prevCache => {
        const updatedCache = new Map(prevCache[cacheType]);
        updatedCache.delete(key);
        return {
          ...prevCache,
          [cacheType]: updatedCache
        };
      });
      return null;
    }
    
    return cachedEntry.data;
  }, [queryCache]);
  
  /**
   * Clears cache data selectively or completely
   * 
   * @param {string|null} cacheType - Specific cache to clear, 'all' for everything, or null
   */
  const clearCache = useCallback((cacheType = null) => {
    if (cacheType) {
      if (cacheType === 'all') {
        // Clear all caches
        setCourses([]);
        setCourseData([]);
        
        setCacheTimestamps({
          courses: null,
          courseData: null,
          teacherDashboards: null
        });
        
        setQueryCache({
          studentsByTeacher: new Map(),
          teacherCourses: new Map(),
          courseStats: new Map(),
          studentAssignments: new Map(),
          moduleProgress: new Map(),
          teacherDashboard: new Map(),
          studentCourseSummaries: new Map(),
          schools: new Map(),
          studentDetails: new Map()
        });

        setGlobalDataCache({
          allStudents: null,
          allCourses: null,
          lastFetch: null
        });
      } else if (cacheType in cacheTimestamps) {
        // Clear specific main cache
        const cacheSetters = {
          courses: setCourses,
          courseData: setCourseData
        };
        
        const setter = cacheSetters[cacheType];
        if (setter) {
          setter([]);
        }
        
        setCacheTimestamps(prevState => ({
          ...prevState,
          [cacheType]: null
        }));
      } else if (queryCache[cacheType]) {
        // Clear specific query cache
        setQueryCache(prevCache => ({
          ...prevCache,
          [cacheType]: new Map()
        }));
      }
    }
  }, [cacheTimestamps, queryCache]);

  // === DATA FETCHING FUNCTIONS ===

  /**
   * Fetches teacher dashboard data with caching
   * 
   * @param {string} teacherUidOrId - Teacher UID or document ID
   * @returns {Promise<Object|null>} Dashboard data or null if not found
   */
  const fetchTeacherDashboard = useCallback(async (teacherUidOrId) => {
    if (!teacherUidOrId) return null;
    
    // Check cache first
    const cachedData = getFromQueryCache('teacherDashboard', teacherUidOrId);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Resolve potential UID to actual teacher document ID
      const { teacherId: actualTeacherId, found } = await resolveTeacherId(teacherUidOrId);
      if (!found || !actualTeacherId) return null;
      
      console.log(`Fetching dashboard data for teacher ID: ${actualTeacherId}`);
      const dashboard = await fetchDocumentById('teacherDashboards', actualTeacherId);
      
      if (dashboard) {
        updateQueryCache('teacherDashboard', teacherUidOrId, dashboard);
        console.log('Dashboard data found and cached');
      } else {
        console.log(`No dashboard data found for teacher ID: ${actualTeacherId}`);
      }
      
      return dashboard;
    } catch (error) {
      console.error("Error fetching teacher dashboard:", error);
      return null;
    }
  }, [getFromQueryCache, updateQueryCache]);
  /**
   * Fetches courses assigned to a specific teacher with intelligent caching
   * Uses the new normalized structure with teacherIds array
   * 
   * @param {string} teacherUidOrId - Teacher UID or document ID
   * @returns {Promise<Array>} Array of course objects
   */
  const fetchTeacherCourses = useCallback(async (teacherUidOrId) => {
    if (!teacherUidOrId) return [];
    
    // Check cache first
    const cacheKey = `teacher-${teacherUidOrId}`;
    const cachedData = getFromQueryCache('teacherCourses', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Resolve potential UID to actual teacher document ID
      const { teacherId: actualTeacherId, found } = await resolveTeacherId(teacherUidOrId);
      if (!found || !actualTeacherId) return [];
      
      console.log(`Searching for courses with teacher ID: ${actualTeacherId}`);
      
      const coursesQuery = await fetchDocuments('courses', {
        filters: [
          { field: 'teacherIds', operator: 'array-contains', value: actualTeacherId }
        ]
      });
      
      const result = coursesQuery || [];
      console.log(`Found ${result.length} courses for teacher ${actualTeacherId}`);
      
      // Cache the result
      updateQueryCache('teacherCourses', cacheKey, result);
      
      return result;
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      return [];
    }
  }, [getFromQueryCache, updateQueryCache]);
  
  /**
   * Fetches and caches school information by ID
   * 
   * @param {string} schoolId - School document ID
   * @returns {Promise<Object|null>} School data or null if not found
   */
  const fetchSchoolInfo = useCallback(async (schoolId) => {
    if (!schoolId) return null;
    
    // Check cache first
    const cachedData = getFromQueryCache('schools', schoolId);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const school = await fetchDocumentById('schools', schoolId);
      if (school) {
        updateQueryCache('schools', schoolId, school);
      }
      return school;
    } catch (error) {
      console.error(`Error fetching school ${schoolId}:`, error);
      return null;
    }
  }, [getFromQueryCache, updateQueryCache]);

  /**
   * Fetches students assigned to a specific teacher using normalized structure
   * 
   * This function:
   * 1. Resolves teacher UID to document ID
   * 2. Finds all courses taught by the teacher
   * 3. Gets active enrollments for those courses
   * 4. Fetches student user data and performance summaries
   * 5. Aggregates metrics across all courses
   * 6. Formats data for UI consistency
   * 
   * @param {string} teacherUidOrId - Teacher UID or document ID
   * @returns {Promise<Array>} Array of formatted student objects with performance data
   */
  const fetchStudentsByTeacher = useCallback(async (teacherUidOrId) => {
    if (!teacherUidOrId) return [];
    
    // Check cache first
    const cacheKey = `teacher-${teacherUidOrId}`;
    const cachedData = getFromQueryCache('studentsByTeacher', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      console.time('fetchStudentsByTeacher');
      
      // First get the teacher's courses (this now handles UID-to-teacher-ID mapping)
      const teacherCourses = await fetchTeacherCourses(teacherUidOrId);
      
      if (!teacherCourses || teacherCourses.length === 0) {
        console.log('No courses found for teacher');
        updateQueryCache('studentsByTeacher', cacheKey, []);
        return [];
      }
      
      console.log(`Found ${teacherCourses.length} courses for teacher`);
      const courseIds = teacherCourses.map(course => course.id);
      
      // Get all enrollments for these courses
      const enrollmentPromises = courseIds.map(courseId => 
        fetchDocuments('enrollments', {
          filters: [
            { field: 'courseId', operator: '==', value: courseId },
            { field: 'status', operator: '==', value: 'active' }
          ]
        })
      );
      
      const enrollmentResults = await Promise.all(enrollmentPromises);
      const allEnrollments = enrollmentResults.flat();
      
      // Get unique student IDs
      const studentIds = [...new Set(allEnrollments.map(e => e.studentId))];
      
      if (studentIds.length === 0) {
        console.log("No students found in teacher courses");
        updateQueryCache('studentsByTeacher', cacheKey, []);
        return [];
      }
      
      console.log(`Processing ${studentIds.length} students`);
      
      // Batch fetch user data for students using document IDs (which should match CSV IDs)
      const userBatches = [];
      const batchSize = 10; // Firestore 'in' operator limit
      
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);
        userBatches.push(batch);
      }
      
      const userBatchResults = await Promise.all(
        userBatches.map(async (batch) => {
          try {
            // Fetch users by document ID (which should match CSV student IDs)
            const userPromises = batch.map(id => 
              fetchDocumentById('users', id).catch(() => null)
            );
            const users = await Promise.all(userPromises);
            return users.filter(Boolean);
          } catch (err) {
            console.warn(`Error fetching user batch:`, err.message);
            return [];
          }
        })
      );
      
      const usersData = userBatchResults.flat();
      console.log(`Found ${usersData.length} user records`);
      
      // Create user data map using document ID
      const userDataMap = new Map();
      usersData.forEach(user => {
        userDataMap.set(user.id, user); // Use document ID as key
      });
      
      // Batch fetch student course summaries for performance data
      const summaryPromises = courseIds.map(async (courseId) => {
        const summaries = await fetchDocuments('studentCourseSummaries', {
          filters: [{ field: 'courseId', operator: '==', value: courseId }]
        });
        return summaries || [];
      });
      
      const summaryResults = await Promise.all(summaryPromises);
      const allSummaries = summaryResults.flat();
      
      // Create summary map: studentId -> course summaries
      const summaryMap = new Map();
      allSummaries.forEach(summary => {
        if (!summaryMap.has(summary.studentId)) {
          summaryMap.set(summary.studentId, []);
        }
        summaryMap.get(summary.studentId).push(summary);
      });
      
      // Process students with their performance data and format for UI
      const studentsWithSchools = await Promise.all(
        studentIds.map(async (studentId) => {
          const userData = userDataMap.get(studentId) || {}; // Use studentId as document ID
          const studentSummaries = summaryMap.get(studentId) || [];
          
          // Fetch school information if schoolId exists
          let schoolName = 'N/A';
          if (userData.schoolId) {
            const schoolInfo = await fetchSchoolInfo(userData.schoolId);
            schoolName = schoolInfo?.name || 'N/A';
          }
          
          // Calculate aggregated metrics across all courses
          let totalScore = 0;
          let totalCompletion = 0;
          let totalTimeSpent = 0;
          let courseCount = studentSummaries.length;
          let lastAccessed = null;
          
          studentSummaries.forEach(summary => {
            if (typeof summary.overallScore === 'number' && summary.overallScore >= 0) {
              totalScore += summary.overallScore;
            }
            if (typeof summary.completionRate === 'number') {
              totalCompletion += summary.completionRate;
            }
            if (typeof summary.totalTimeSpent === 'number') {
              totalTimeSpent += summary.totalTimeSpent;
            }
            if (summary.lastAccessed) {
              const accessDate = formatFirebaseTimestamp(summary.lastAccessed);
              if (!lastAccessed || accessDate > lastAccessed) {
                lastAccessed = accessDate;
              }
            }
          });
          
          // Create raw student data object
          const rawStudentData = {
            id: studentId,
            studentId: studentId,
            firstName: userData.firstName || 'Unknown',
            lastName: userData.lastName || 'Student',
            email: userData.email || '',
            gender: userData.gender || null,
            gradeLevel: userData.gradeLevel || null,
            schoolId: userData.schoolId || null,
            schoolName: schoolName,
            scores: {
              average: courseCount > 0 ? totalScore / courseCount : 0
            },
            completion: courseCount > 0 ? totalCompletion / courseCount : 0,
            totalTimeSpent: totalTimeSpent,
            lastAccessed: lastAccessed,
            courseCount: courseCount,
            attendance: userData.attendance || null // Pass through raw attendance data
          };
          
          // Format the student data for UI consistency
          return formatStudentForUI(rawStudentData);
        })
      );
      
      // Cache the result
      updateQueryCache('studentsByTeacher', cacheKey, studentsWithSchools);
      
      console.timeEnd('fetchStudentsByTeacher');
      console.log(`Returning ${studentsWithSchools.length} students`);
      return studentsWithSchools;
    } catch (error) {
      console.error("Error fetching students by teacher:", error);
      return [];
    }
  }, [fetchTeacherCourses, fetchSchoolInfo, getFromQueryCache, updateQueryCache]);
  
  /**
   * Fetches comprehensive course statistics with performance metrics
   * 
   * Calculates and returns:
   * - Student enrollment counts
   * - Activity metrics (7-day and 30-day active users)
   * - Average scores and completion rates
   * - Assignment and module counts
   * 
   * @param {string} courseId - Course document ID
   * @returns {Promise<Object|null>} Course statistics object or null if not found
   */
  const fetchCourseStats = useCallback(async (courseId) => {
    if (!courseId) return null;
    
    // Check cache first
    const cachedData = getFromQueryCache('courseStats', courseId);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Get course document and related data in parallel
      const [course, enrollments, modules, assignments] = await Promise.all([
        fetchDocumentById('courses', courseId),
        fetchDocuments('enrollments', {
          filters: [
            { field: 'courseId', operator: '==', value: courseId },
            { field: 'status', operator: '==', value: 'active' }
          ]
        }),
        fetchSubcollection('courses', courseId, 'modules').catch(() => []),
        fetchSubcollection('courses', courseId, 'assignments').catch(() => [])
      ]);
      
      if (!course) return null;
      
      const studentCount = enrollments ? enrollments.length : 0;
      
      // Get student course summaries for this course to calculate aggregated metrics
      const summaries = await fetchDocuments('studentCourseSummaries', {
        filters: [{ field: 'courseId', operator: '==', value: courseId }]
      });
      
      let totalScore = 0;
      let totalCompletion = 0;
      let activeStudentsLast7Days = 0;
      let activeStudentsLast30Days = 0;
      let studentsWithData = 0;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      
      (summaries || []).forEach(summary => {
        if (typeof summary.overallScore === 'number') {
          totalScore += summary.overallScore;
          studentsWithData++;
        }
        if (typeof summary.completionRate === 'number') {
          totalCompletion += summary.completionRate;
        }
        
        if (summary.lastAccessed) {
          const lastAccessDate = formatFirebaseTimestamp(summary.lastAccessed);
          if (lastAccessDate >= oneWeekAgo) {
            activeStudentsLast7Days++;
          }
          if (lastAccessDate >= oneMonthAgo) {
            activeStudentsLast30Days++;
          }
        }
      });
      
      // Compile statistics
      const courseStats = {
        courseId,
        courseName: course.courseName || 'Unknown Course',
        studentCount,
        activeStudentsLast7Days,
        activeStudentsLast30Days,
        activeRatio7Days: studentCount > 0 ? activeStudentsLast7Days / studentCount : 0,
        activeRatio30Days: studentCount > 0 ? activeStudentsLast30Days / studentCount : 0,
        averageScore: studentsWithData > 0 ? totalScore / studentsWithData : 0,
        averageCompletion: summaries.length > 0 ? totalCompletion / summaries.length : 0,
        assignmentCount: assignments ? assignments.length : 0,
        moduleCount: modules ? modules.length : 0
      };
      
      // Cache the result
      updateQueryCache('courseStats', courseId, courseStats);
      
      return courseStats;
    } catch (error) {
      console.error("Error fetching course stats:", error);
      return null;
    }
  }, [getFromQueryCache, updateQueryCache]);
  
  /**
   * Fetches all assignments for a specific student across all enrolled courses
   * 
   * Process flow:
   * 1. Get student's active enrollments
   * 2. Fetch assignments from all enrolled courses (subcollections)
   * 3. Get student's progress data for each assignment
   * 4. Combine assignment metadata with progress data
   * 5. Calculate status based on dates and submission state
   * 
   * @param {string} studentId - Student document ID
   * @returns {Promise<Array>} Array of assignment objects with progress data
   */
  const fetchStudentAssignments = useCallback(async (studentId) => {
    if (!studentId) return [];
    
    // Check cache first
    const cachedData = getFromQueryCache('studentAssignments', studentId);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Get student enrollments to find courses
      const enrollments = await fetchDocuments('enrollments', {
        filters: [
          { field: 'studentId', operator: '==', value: studentId },
          { field: 'status', operator: '==', value: 'active' }
        ]
      });
      
      if (!enrollments || enrollments.length === 0) {
        const emptyResult = [];
        updateQueryCache('studentAssignments', studentId, emptyResult);
        return emptyResult;
      }
      
      const assignments = [];
      
      // Process each enrolled course
      const assignmentPromises = enrollments.map(async (enrollment) => {
        const courseId = enrollment.courseId;
        
        try {
          // Get course and its assignments
          const [course, courseAssignments] = await Promise.all([
            fetchDocumentById('courses', courseId).catch(() => null),
            fetchSubcollection('courses', courseId, 'assignments').catch(() => [])
          ]);
          
          if (!courseAssignments || courseAssignments.length === 0) {
            return [];
          }
          
          // Get student progress for these assignments
          const assignmentIds = courseAssignments.map(a => a.id);
          const progressPromises = assignmentIds.map(assignmentId => 
            fetchDocumentById('studentAssignments', `${studentId}_${assignmentId}`)
              .catch(() => null)
          );
          
          const progressResults = await Promise.all(progressPromises);
          
          // Create progress map
          const progressMap = new Map();
          progressResults.forEach((progress, index) => {
            if (progress) {
              progressMap.set(assignmentIds[index], progress);
            }
          });
          
          // Combine assignment data with progress
          return courseAssignments.map(assignment => {
            const assignmentId = assignment.id;
            const progress = progressMap.get(assignmentId);
            
            // Determine status
            let status = 'pending';
            const now = new Date();
            const dueDate = assignment.dueDate ? formatFirebaseTimestamp(assignment.dueDate) : null;
            const assignDate = assignment.assignDate ? formatFirebaseTimestamp(assignment.assignDate) : null;
            
            if (progress?.status) {
              status = progress.status;
            } else if (progress?.submissionDate) {
              status = 'completed';
            } else if (dueDate && dueDate < now) {
              status = 'pending';
            } else if (assignDate && assignDate > now) {
              status = 'future';
            }
            
            return {
              id: assignmentId,
              title: assignment.title || 'Untitled Assignment',
              description: assignment.description || '',
              courseId: courseId,
              courseName: course?.courseName || 'Unknown Course',
              dueDate: assignment.dueDate,
              assignDate: assignment.assignDate,
              assignmentType: assignment.assignmentType || 'Assignment',
              status: status,
              submitted: progress?.submissionDate ? true : false,
              submissionDate: progress?.submissionDate || null,
              score: progress?.currentScore || null,
              maxScore: assignment.maxScore || 100,
              weight: assignment.weight || 1,
              isLate: progress?.isLate || false,
              timeSpent: progress?.timeSpentMinutes || 0,
              moduleId: assignment.moduleId || null,
              attemptCount: progress?.attemptCount || 0,
              attempts: progress?.attempts || []
            };
          });
        } catch (err) {
          console.error(`Error processing assignments for course ${courseId}:`, err);
          return [];
        }
      });
      
      const assignmentArrays = await Promise.all(assignmentPromises);
      const allAssignments = assignmentArrays.flat();
      
      // Sort by due date
      allAssignments.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const dateA = formatFirebaseTimestamp(a.dueDate);
        const dateB = formatFirebaseTimestamp(b.dueDate);
        return dateA - dateB;
      });
      
      // Cache the result
      updateQueryCache('studentAssignments', studentId, allAssignments);
      
      return allAssignments;
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      return [];
    }
  }, [getFromQueryCache, updateQueryCache]);
  /**
   * Fetches module progress for a student in a specific course
   * 
   * @param {string} studentId - Student document ID
   * @param {string} courseId - Course document ID
   * @returns {Promise<Array>} Array of module objects with progress data
   */
  const fetchModuleProgress = useCallback(async (studentId, courseId) => {
    if (!studentId || !courseId) return [];
    
    // Check cache first
    const cacheKey = `${studentId}-${courseId}`;
    const cachedData = getFromQueryCache('moduleProgress', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Get modules for the course
      const modules = await fetchSubcollection('courses', courseId, 'modules');
      
      if (!modules || modules.length === 0) {
        return [];
      }
      
      // Get module progress data from studentModules collection
      const moduleData = await Promise.all(
        modules.map(async (module) => {
          try {
            // Fetch progress from studentModules collection
            const progressDoc = await fetchDocumentById('studentModules', `${studentId}_${module.id}`);
            
            return {
              id: module.id,
              title: module.moduleTitle || 'Unnamed Module',
              description: module.description || '',
              sequenceNumber: module.sequenceNumber || 0,
              isRequired: module.isRequired || false,
              completed: progressDoc?.status === 'completed',
              completion: progressDoc?.completionRate || 0,
              expertiseRate: progressDoc?.moduleScore || 0,
              lastAccessed: progressDoc?.lastActivity || null,
              totalTimeSpent: progressDoc?.totalTimeSpentMinutes || 0,
              riskLevel: progressDoc?.riskLevel || 'low',
              assignmentProgress: progressDoc?.assignmentProgress || []
            };
          } catch (error) {
            console.error(`Error fetching progress for module ${module.id}:`, error);
            // Return module with default progress values
            return {
              id: module.id,
              title: module.moduleTitle || 'Unnamed Module',
              description: module.description || '',
              sequenceNumber: module.sequenceNumber || 0,
              isRequired: module.isRequired || false,
              completed: false,
              completion: 0,
              expertiseRate: 0,
              lastAccessed: null,
              totalTimeSpent: 0,
              riskLevel: 'low',
              assignmentProgress: []
            };
          }
        })
      );
      
      // Sort by sequence number
      moduleData.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      
      // Cache the result
      updateQueryCache('moduleProgress', cacheKey, moduleData);
      
      return moduleData;
    } catch (error) {
      console.error("Error fetching module progress:", error);
      return [];
    }
  }, [getFromQueryCache, updateQueryCache]);
  
  /**
   * Fetches comprehensive student details with optimized performance
   * 
   * This is the most comprehensive student data fetching function, providing:
   * - Complete user profile information
   * - All enrolled courses with detailed progress
   * - Aggregated performance metrics
   * - Risk assessment data
   * - Module and assignment progress across all courses
   * 
   * Uses aggressive caching and batch operations for optimal performance.
   * 
   * @param {string} studentId - Student document ID
   * @returns {Promise<Object|null>} Complete student object with all related data
   */
  const fetchStudentDetailsCached = useCallback(async (studentId) => {
    if (!studentId) return null;
    
    // Check cache first
    const cachedData = getFromQueryCache('studentDetails', studentId);
    if (cachedData) {
      console.log(`Using cached student details for ${studentId}`);
      return cachedData;
    }
    
    try {
      console.log(`Fetching detailed student data for ${studentId}`);
      
      // Use batch operations to minimize Firebase calls
      const [userDoc, enrollmentsSnapshot] = await Promise.all([
        fetchDocumentById('users', studentId),
        fetchDocuments('enrollments', {
          filters: [
            { field: 'studentId', operator: '==', value: studentId },
            { field: 'status', operator: '==', value: 'active' }
          ]
        })
      ]);
      
      if (!userDoc) {
        throw new Error("Student user not found");
      }
      
      if (userDoc.role !== 'student') {
        throw new Error(`User ${studentId} is not a student (role: ${userDoc.role})`);
      }
      
      const enrollments = enrollmentsSnapshot || [];
      
      if (enrollments.length === 0) {
        // Return basic student object if no enrollments
        const basicStudent = {
          id: studentId,
          userId: studentId,
          firstName: userDoc.firstName || 'Unknown',
          lastName: userDoc.lastName || 'Unknown',
          email: userDoc.email || '',
          gender: userDoc.gender || 'Not specified',
          gradeLevel: userDoc.gradeLevel || null,
          schoolId: userDoc.schoolId || null,
          courses: [],
          averageScore: 0,
          completionRate: 0,
          submissionRate: 0,
          missingAssignments: 0,
          daysSinceLastAccess: 0,
          lastAccessed: new Date().toISOString(),
          courseCount: 0,
          isAtRisk: false,
          riskScore: 0,
          riskLevel: 'low',
          riskReasons: []
        };
        
        updateQueryCache('studentDetails', studentId, basicStudent, cacheExpirationRef.current.LONG);
        return basicStudent;
      }
      
      // Batch fetch all course-related data
      const courseIds = enrollments.map(e => e.courseId);
      const [
        coursesData,
        studentCourseSummaries,
        allModules,
        allAssignments,
        allStudentAssignments,
        allStudentModules
      ] = await Promise.all([
        // Batch fetch course documents
        Promise.all(courseIds.map(id => fetchDocumentById('courses', id))),
        // Batch fetch student course summaries
        Promise.all(courseIds.map(id => 
          fetchDocumentById('studentCourseSummaries', `${studentId}_${id}`)
            .catch(() => null)
        )),
        // Batch fetch all modules for all courses
        Promise.all(courseIds.map(id => 
          fetchSubcollection('courses', id, 'modules').catch(() => [])
        )),
        // Batch fetch all assignments for all courses
        Promise.all(courseIds.map(id => 
          fetchSubcollection('courses', id, 'assignments').catch(() => [])
        )),
        // Batch fetch all student assignment progress
        Promise.all(courseIds.map(async (courseId) => {
          const assignments = await fetchSubcollection('courses', courseId, 'assignments').catch(() => []);
          const progressPromises = assignments.map(assignment => 
            fetchDocumentById('studentAssignments', `${studentId}_${assignment.id}`)
              .catch(() => null)
          );
          return Promise.all(progressPromises);
        })),
        // Batch fetch all student module progress
        Promise.all(courseIds.map(async (courseId) => {
          const modules = await fetchSubcollection('courses', courseId, 'modules').catch(() => []);
          const progressPromises = modules.map(module => 
            fetchDocumentById('studentModules', `${studentId}_${module.id}`)
              .catch(() => null)
          );
          return Promise.all(progressPromises);
        }))
      ]);
      
      // Process course data efficiently
      const processedCourses = courseIds.map((courseId, index) => {
        const course = coursesData[index];
        const summary = studentCourseSummaries[index];
        const modules = allModules[index] || [];
        const assignments = allAssignments[index] || [];
        const assignmentProgress = allStudentAssignments[index] || [];
        const moduleProgress = allStudentModules[index] || [];
        
        if (!course) return null;
        
        // Create progress maps for efficient lookup
        const assignmentProgressMap = new Map();
        assignments.forEach((assignment, i) => {
          if (assignmentProgress[i]) {
            assignmentProgressMap.set(assignment.id, assignmentProgress[i]);
          }
        });
        
        const moduleProgressMap = new Map();
        modules.forEach((module, i) => {
          if (moduleProgress[i]) {
            // Transform the raw progress data to match frontend expectations
            const rawProgress = moduleProgress[i];
            const transformedProgress = {
              completion: rawProgress.completionRate || 0,
              totalExpertiseRate: rawProgress.moduleScore || 0,
              lastAccessed: rawProgress.lastActivity || null,
              totalTimeSpent: rawProgress.totalTimeSpent || 0
            };
            moduleProgressMap.set(module.id, transformedProgress);
            
            // Debug logging for module progress transformation
            console.log(`DataContext - Module ${module.moduleTitle || module.id}:`, {
              rawCompletion: rawProgress.completionRate,
              transformedCompletion: transformedProgress.completion,
              rawScore: rawProgress.moduleScore,
              transformedScore: transformedProgress.totalExpertiseRate
            });
          }
        });
        
        return {
          id: courseId,
          ...course,
          summary: summary || {
            overallScore: 0,
            completionRate: 0,
            totalTimeSpent: 0,
            lastAccessed: new Date().toISOString()
          },
          modules: modules.map(module => ({
            ...module,
            progress: moduleProgressMap.get(module.id) || {
              completion: 0,
              totalExpertiseRate: 0,
              lastAccessed: null,
              totalTimeSpent: 0
            }
          })),
          assignments: assignments.map(assignment => ({
            ...assignment,
            progress: assignmentProgressMap.get(assignment.id) || null
          }))
        };
      }).filter(Boolean);
      
      // Calculate metrics efficiently
      let totalScore = 0;
      let totalCompletion = 0;
      let totalTimeSpent = 0;
      let courseCount = 0;
      let lastAccessed = null;
      let submittedAssignments = 0;
      let totalAssignments = 0;
      
      processedCourses.forEach(course => {
        if (course.summary && course.summary.overallScore > 0) {
          totalScore += course.summary.overallScore;
          totalCompletion += course.summary.completionRate || 0;
          totalTimeSpent += course.summary.totalTimeSpent || 0;
          courseCount++;
          
          const accessDate = course.summary.lastAccessed?.toDate ? 
            course.summary.lastAccessed.toDate() : 
            new Date(course.summary.lastAccessed);
          
          if (!lastAccessed || accessDate > lastAccessed) {
            lastAccessed = accessDate;
          }
        }
        
        if (course.assignments) {
          totalAssignments += course.assignments.length;
          submittedAssignments += course.assignments.filter(a => a.progress?.submissionDate).length;
        }
      });
      
      const averageScore = courseCount > 0 ? totalScore / courseCount : 0;
      const completionRate = courseCount > 0 ? totalCompletion / courseCount : 0;
      const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
      const missingAssignments = totalAssignments - submittedAssignments;
      
      let daysSinceLastAccess = 0;
      if (lastAccessed) {
        daysSinceLastAccess = Math.floor((new Date() - lastAccessed) / (1000 * 60 * 60 * 24));
      }
      
      // Get school name if available
      let schoolName = 'N/A';
      if (userDoc.schoolId) {
        const schoolInfo = await fetchSchoolInfo(userDoc.schoolId);
        schoolName = schoolInfo?.name || 'N/A';
      }
      
      const studentDetails = {
        id: studentId,
        userId: studentId,
        firstName: userDoc.firstName || 'Unknown',
        lastName: userDoc.lastName || 'Unknown',
        email: userDoc.email || '',
        gender: userDoc.gender || 'Not specified',
        gradeLevel: userDoc.gradeLevel || null,
        schoolId: userDoc.schoolId || null,
        schoolName: schoolName,
        courses: processedCourses,
        averageScore,
        completionRate,
        submissionRate,
        missingAssignments,
        daysSinceLastAccess,
        totalTimeSpent,
        lastAccessed: lastAccessed ? lastAccessed.toISOString() : new Date().toISOString(),
        courseCount: processedCourses.length,
        isAtRisk: false, // Will be calculated by risk service if needed
        riskScore: 0,
        riskLevel: 'low',
        riskReasons: []
      };
      
      // Cache for a longer time since this is detailed data
      updateQueryCache('studentDetails', studentId, studentDetails, cacheExpirationRef.current.LONG);
      console.log(`Cached detailed student data for ${studentId}`);
      
      return studentDetails;
      
    } catch (error) {
      console.error(`Error fetching student details for ${studentId}:`, error);
      throw error;
    }
  }, [getFromQueryCache, updateQueryCache, fetchSchoolInfo, cacheExpirationRef]);
  
  // === LEGACY ADMIN FUNCTIONS ===
  // Maintained for backward compatibility
  
  /**
   * Fetches all students from the system (admin function)
   * @deprecated Use fetchStudentsByTeacher for teacher-specific data
   * @returns {Promise<Array>} Array of all student users
   */
  const fetchAllStudents = useCallback(async () => {
    try {
      setLoading(true);
      const users = await fetchDocuments('users', {
        filters: [{ field: 'role', operator: '==', value: 'student' }]
      });
      return users || [];
    } catch (error) {
      console.error("Error fetching all students:", error);
      setError("Failed to fetch students data");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetches all assignments from the system (admin function)
   * @deprecated Assignments are now stored as subcollections
   * @returns {Promise<Array>} Empty array (assignments are in subcollections)
   */
  const fetchAllAssignments = useCallback(async () => {
    try {
      setLoading(true);
      // This would require aggregating assignments from all courses
      // For now, return empty array as assignments are stored as subcollections
      return [];
    } catch (error) {
      console.error("Error fetching all assignments:", error);
      setError("Failed to fetch assignments data");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetches all modules from the system (admin function)
   * @deprecated Modules are now stored as subcollections
   * @returns {Promise<Array>} Empty array (modules are in subcollections)
   */
  const fetchAllModules = useCallback(async () => {
    try {
      setLoading(true);
      // This would require aggregating modules from all courses
      // For now, return empty array as modules are stored as subcollections
      return [];
    } catch (error) {
      console.error("Error fetching all modules:", error);
      setError("Failed to fetch modules data");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  // === INITIALIZATION EFFECT ===
  
  /**
   * Loads initial application data when component mounts or user changes
   * Handles course data fetching and creates backward-compatible courseData
   */
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch courses if needed
        if (courses.length === 0 || isCacheExpired('courses')) {
          const coursesData = await fetchDocuments('courses');
          setCourses(coursesData || []);
          updateCacheTimestamp('courses');
        }
        
        // Create aggregated course data for backward compatibility
        if (courseData.length === 0 || isCacheExpired('courseData')) {
          const aggregatedCourseData = courses.map(course => ({
            ...course,
            studentCount: Math.floor(Math.random() * 50) + 10,
            averageCompletion: Math.floor(Math.random() * 60) + 40,
            averageScore: Math.floor(Math.random() * 40) + 60,
            activeLast7Days: Math.floor(Math.random() * 30) + 5,
            activeLast30Days: Math.floor(Math.random() * 40) + 10,
            activeRatio7Days: Math.random() * 0.8,
            activeRatio30Days: Math.random() * 0.9 + 0.1
          }));
          
          setCourseData(aggregatedCourseData);
          updateCacheTimestamp('courseData');
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [currentUser, courses.length, courseData.length, isCacheExpired, updateCacheTimestamp]);
  
  const value = {
    courses,
    courseData,
    loading,
    error,
    fetchStudentsByTeacher,
    fetchTeacherCourses,
    fetchCourseStats,
    fetchStudentAssignments,
    fetchModuleProgress,
    fetchTeacherDashboard,
    fetchStudentDetailsCached,
    fetchAllStudents,
    fetchAllAssignments,
    fetchAllModules,
    clearCache,
    loadAdminData: fetchAllStudents
  };
  
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

