import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchDocuments, fetchDocumentById, formatFirebaseTimestamp, fetchSubcollection } from '../utils/firebaseUtils';

// Create the context
const DataContext = createContext(null);

// Custom hook to use the data context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Core data state - aligned with new database structure
  const [courses, setCourses] = useState([]);
  const [courseData, setCourseData] = useState([]);
  
  // Enhanced caching system
  const [cacheTimestamps, setCacheTimestamps] = useState({
    courses: null,
    courseData: null,
    teacherDashboards: null
  });
  
  // Cache for specialized queries
  const [queryCache, setQueryCache] = useState({
    studentsByTeacher: new Map(),
    teacherCourses: new Map(),
    courseStats: new Map(),
    studentAssignments: new Map(),
    moduleProgress: new Map(),
    teacherDashboard: new Map(),
    studentCourseSummaries: new Map(),
    schools: new Map()
  });
  
  // Use ref to store cache expiration constants
  const cacheExpirationRef = useRef({
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 15 * 60 * 1000, // 15 minutes
    LONG: 60 * 60 * 1000 // 1 hour
  });
  
  // Check if cache is expired
  const isCacheExpired = useCallback((cacheType) => {
    const timestamp = cacheTimestamps[cacheType];
    if (!timestamp) return true;
    
    const now = new Date().getTime();
    const expirationTime = cacheExpirationRef.current.MEDIUM;
    
    return now - timestamp > expirationTime;
  }, [cacheTimestamps]);
  
  // Helper to update cache timestamps
  const updateCacheTimestamp = useCallback((cacheType) => {
    setCacheTimestamps(prevState => ({
      ...prevState,
      [cacheType]: new Date().getTime()
    }));
  }, []);
  
  // Helper function to update specific query cache
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
  
  // Helper function to get from query cache
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
  
  // Clear specific cache or all caches
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
          schools: new Map()
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
  // NEW: Get teacher dashboard data
  const fetchTeacherDashboard = useCallback(async (teacherUidOrId) => {
    if (!teacherUidOrId) return null;
    
    // Check cache first
    const cachedData = getFromQueryCache('teacherDashboard', teacherUidOrId);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      let actualTeacherId = teacherUidOrId;
        // If we're given a UID (Firebase Auth ID), we need to get the actual teacher ID
      // Check if this looks like a UID (contains no @ and is long alphanumeric)
      if (!teacherUidOrId.includes('@') && teacherUidOrId.length > 10) {
        console.log(`Looking up teacher ID for UID: ${teacherUidOrId}`);
        
        // Find the teacher document by searching for the UID field
        const teachersWithUid = await fetchDocuments('users', {
          filters: [
            { field: 'uid', operator: '==', value: teacherUidOrId },
            { field: 'role', operator: '==', value: 'teacher' }
          ]
        });
        
        if (teachersWithUid && teachersWithUid.length > 0) {
          // The document ID is the teacher ID we need
          actualTeacherId = teachersWithUid[0].id;
          console.log(`Found teacher ID: ${actualTeacherId} for UID: ${teacherUidOrId}`);
        } else {
          console.warn(`No teacher found with UID: ${teacherUidOrId}`);
          return null;
        }
      }
      
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
    // UPDATED: Get courses by teacher using new structure
  const fetchTeacherCourses = useCallback(async (teacherUidOrId) => {
    if (!teacherUidOrId) return [];
    
    // Check cache first
    const cacheKey = `teacher-${teacherUidOrId}`;
    const cachedData = getFromQueryCache('teacherCourses', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      let actualTeacherId = teacherUidOrId;
        // If we're given a UID (Firebase Auth ID), we need to get the actual teacher ID
      // Check if this looks like a UID (contains no @ and is long alphanumeric)
      if (!teacherUidOrId.includes('@') && teacherUidOrId.length > 10) {
        console.log(`Looking up teacher ID for UID: ${teacherUidOrId}`);
        
        // Find the teacher document by searching for the UID field
        const teachersWithUid = await fetchDocuments('users', {
          filters: [
            { field: 'uid', operator: '==', value: teacherUidOrId },
            { field: 'role', operator: '==', value: 'teacher' }
          ]
        });
        
        if (teachersWithUid && teachersWithUid.length > 0) {
          // The document ID is the teacher ID we need
          actualTeacherId = teachersWithUid[0].id;
          console.log(`Found teacher ID: ${actualTeacherId} for UID: ${teacherUidOrId}`);
        } else {
          console.warn(`No teacher found with UID: ${teacherUidOrId}`);
          return [];
        }
      }
      
      console.log(`Searching for courses with teacher ID: ${actualTeacherId}`);
      
      // Use the new teacherIds array approach (no more fallback to old structure)
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
  
  // Helper function to fetch school information
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

  // UPDATED: Get students by teacher using new normalized structure
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
      
      // Process students with their performance data
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
          
          return {
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
            courseCount: courseCount
          };
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
  
  // UPDATED: Get course statistics using new structure
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
  
  // UPDATED: Get student assignments using new normalized structure
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
    // UPDATED: Get module progress using new structure
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
              // Map new schema fields to expected format
              completed: progressDoc?.status === 'completed',
              completion: progressDoc?.completionRate || 0,
              expertiseRate: progressDoc?.moduleScore || 0,
              lastAccessed: progressDoc?.lastActivity || null,
              // Include additional data from new schema
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
  
  // SIMPLIFIED: Admin functions for backward compatibility
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
  
  // Load initial data
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
  
  // Expose context value
  const value = {
    // Data - simplified for new structure
    students: [], // Deprecated - use fetchStudentsByTeacher
    teachers: [], // Deprecated - users collection handles this
    courses,
    assignments: [], // Deprecated - stored as subcollections
    modules: [], // Deprecated - stored as subcollections
    courseData,
    
    // Status
    loading,
    error,
    
    // Functions
    fetchStudentsByTeacher,
    fetchTeacherCourses,
    fetchCourseStats,
    fetchStudentAssignments,
    fetchModuleProgress,
    fetchTeacherDashboard, // NEW
    fetchAllStudents,
    fetchAllAssignments,
    fetchAllModules,
    clearCache,
    
    // Admin functions for backward compatibility
    loadAdminData: fetchAllStudents
  };
  
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};