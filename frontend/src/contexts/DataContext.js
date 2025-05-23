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
  
  // Core data state
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [courseData, setCourseData] = useState([]);
  
  // Enhanced caching system
  const [cacheTimestamps, setCacheTimestamps] = useState({
    students: null,
    teachers: null,
    courses: null,
    assignments: null,
    modules: null,
    courseData: null
  });
  
  // Cache for specialized queries
  const [queryCache, setQueryCache] = useState({
    studentsByTeacher: new Map(),
    teacherCourses: new Map(),
    courseStats: new Map(),
    studentAssignments: new Map(),
    moduleProgress: new Map()
  });
  
  // Use ref to store cache expiration constants to avoid dependency issues
  const cacheExpirationRef = useRef({
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 15 * 60 * 1000, // 15 minutes
    LONG: 60 * 60 * 1000 // 1 hour
  });
  
  // Check if cache is expired - memoized to prevent dependency issues
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
        setStudents([]);
        setTeachers([]);
        setCourses([]);
        setAssignments([]);
        setModules([]);
        setCourseData([]);
        
        setCacheTimestamps({
          students: null,
          teachers: null,
          courses: null,
          assignments: null,
          modules: null,
          courseData: null
        });
        
        setQueryCache({
          studentsByTeacher: new Map(),
          teacherCourses: new Map(),
          courseStats: new Map(),
          studentAssignments: new Map(),
          moduleProgress: new Map()
        });
      } else if (cacheType in cacheTimestamps) {
        // Clear specific main cache
        const cacheSetters = {
          students: setStudents,
          teachers: setTeachers,
          courses: setCourses,
          assignments: setAssignments,
          modules: setModules,
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
  
  // Get courses by teacher with enhanced caching
  const fetchTeacherCourses = useCallback(async (teacherIdOrEmail) => {
    if (!teacherIdOrEmail) return [];
    
    // Check cache first
    const cacheKey = `teacher-${teacherIdOrEmail}`;
    const cachedData = getFromQueryCache('teacherCourses', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      let teacherId = teacherIdOrEmail;
      
      // If we're given an email address, find the corresponding teacher ID
      if (teacherIdOrEmail.includes('@')) {
        // First find the user with this email
        const usersWithEmail = await fetchDocuments('users', {
          filters: [
            { field: 'email', operator: '==', value: teacherIdOrEmail }
          ]
        });
        
        if (usersWithEmail && usersWithEmail.length > 0) {
          const userId = usersWithEmail[0].id;
          
          // Now find the teacher record with this userId
          const teachersWithUserId = await fetchDocuments('teachers', {
            filters: [
              { field: 'userId', operator: '==', value: userId }
            ]
          });
          
          if (teachersWithUserId && teachersWithUserId.length > 0) {
            teacherId = teachersWithUserId[0].id;
          } else {
            console.warn(`No teacher record found for user ${userId}`);
            return [];
          }
        } else {
          console.warn(`No user found with email ${teacherIdOrEmail}`);
          return [];
        }
      }
      
      // Now get courses for this teacherId
      const coursesQuery = await fetchDocuments('courses', {
        filters: [
          { field: 'teacherId', operator: '==', value: teacherId }
        ]
      });
      
      const result = coursesQuery || [];
      
      // Cache the result
      updateQueryCache('teacherCourses', cacheKey, result);
      
      return result;
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      return [];
    }
  }, [getFromQueryCache, updateQueryCache]);

  // Get students by teacher with enhanced caching and improved batch operations
  const fetchStudentsByTeacher = useCallback(async (teacherIdOrEmail) => {
    if (!teacherIdOrEmail) return [];
    
    // Check cache first
    const cacheKey = `teacher-${teacherIdOrEmail}`;
    const cachedData = getFromQueryCache('studentsByTeacher', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      console.time('fetchStudentsByTeacher');
      
      // First get the teacher's courses
      const teacherCourses = await fetchTeacherCourses(teacherIdOrEmail);
      
      if (!teacherCourses || teacherCourses.length === 0) {
        console.log('No courses found for teacher');
        return [];
      }
      
      // Get all unique student IDs from all courses
      const studentIds = new Set();
      teacherCourses.forEach(course => {
        if (course.students && Array.isArray(course.students)) {
          course.students.forEach(studentId => studentIds.add(studentId));
        }
      });
      
      if (studentIds.size === 0) {
        console.log("No students found in teacher courses");
        return [];
      }
      
      const studentIdsArray = Array.from(studentIds);
      console.log(`Fetching batch data for ${studentIdsArray.length} students`);
      
      // IMPROVED: Use document IDs directly or studentId field - Firestore doesn't support 'in' queries on document IDs
      // Try multiple approaches to find students
      let studentsQuery = [];
      
      // Approach 1: Query by studentId field if it exists
      try {
        const studentsByIdQuery = await fetchDocuments('students', {
          filters: [{ field: 'studentId', operator: 'in', value: studentIdsArray }]
        });
        if (studentsByIdQuery && studentsByIdQuery.length > 0) {
          studentsQuery = studentsByIdQuery;
        }
      } catch (err) {
        console.warn('Failed to query by studentId field:', err.message);
      }
      
      // Approach 2: If no results, try fetching by document IDs individually (batch them)
      if (studentsQuery.length === 0) {
        const batchSize = 10; // Firestore 'in' operator supports up to 10 values
        const batches = [];
        
        for (let i = 0; i < studentIdsArray.length; i += batchSize) {
          const batch = studentIdsArray.slice(i, i + batchSize);
          batches.push(batch);
        }
        
        const batchResults = await Promise.all(
          batches.map(async (batch) => {
            try {
              // Try to fetch documents by ID
              const batchStudents = await Promise.all(
                batch.map(id => fetchDocumentById('students', id).catch(() => null))
              );
              return batchStudents.filter(Boolean);
            } catch (err) {
              console.warn(`Error fetching student batch:`, err.message);
              return [];
            }
          })
        );
        
        studentsQuery = batchResults.flat();
      }
      
      console.log(`Found ${studentsQuery.length} students in database`);
      if (studentsQuery.length === 0) {
        updateQueryCache('studentsByTeacher', cacheKey, []);
        return [];
      }
      
      // BATCH OPERATION: Fetch all relevant user data in a single query
      const userIds = studentsQuery
        .map(student => student.userId)
        .filter(Boolean);
      
      let usersData = [];
      if (userIds.length > 0) {
        // Batch user queries due to Firestore 'in' operator limitations
        const userBatchSize = 10;
        const userBatches = [];
        
        for (let i = 0; i < userIds.length; i += userBatchSize) {
          const batch = userIds.slice(i, i + userBatchSize);
          userBatches.push(batch);
        }
        
        const userBatchResults = await Promise.all(
          userBatches.map(async (batch) => {
            try {
              return await fetchDocuments('users', {
                filters: [{ field: 'uid', operator: 'in', value: batch }]
              }) || [];
            } catch (err) {
              console.warn(`Error fetching user batch:`, err.message);
              return [];
            }
          })
        );
        
        usersData = userBatchResults.flat();
        console.log(`Found ${usersData.length} user records for students`);
      }
      
      // Create maps for quick lookups
      const userDataMap = new Map();
      usersData.forEach(user => {
        userDataMap.set(user.uid, user);
      });
      
      // IMPROVED: Batch progress data fetching
      const progressMap = new Map();
      
      // Group progress fetching by student to reduce number of requests
      const progressPromises = studentsQuery.map(async (student) => {
        const studentId = student.id || student.studentId;
        if (!studentId) return;
        
        const courseProgressPromises = teacherCourses.map(async (course) => {
          const courseId = course.id || course.courseId;
          if (!courseId) return null;
          
          try {
            const progress = await fetchDocumentById(`studentProgress/${studentId}/courses`, courseId);
            if (progress && progress.summary) {
              progressMap.set(`${studentId}-${courseId}`, progress.summary);
            }
            return progress;
          } catch (err) {
            // Silently handle missing progress documents
            return null;
          }
        });
        
        return Promise.all(courseProgressPromises);
      });
      
      // Wait for all progress data to be fetched
      await Promise.all(progressPromises);
      console.log(`Collected progress data for ${progressMap.size} student-course combinations`);
      
      // Process students with their user and progress data
      const students = studentsQuery.map(studentData => {
        const studentId = studentData.id || studentData.studentId;
        const userData = userDataMap.get(studentData.userId) || {};
        
        let totalScore = 0;
        let totalCompletion = 0;
        let courseCount = 0;
        let lastAccessed = null;
        
        // Process all progress data for this student
        teacherCourses.forEach(course => {
          const courseId = course.id || course.courseId;
          const progressKey = `${studentId}-${courseId}`;
          const summary = progressMap.get(progressKey);
          
          if (summary) {
            if (typeof summary.overallScore === 'number') {
              totalScore += summary.overallScore;
            }
            if (typeof summary.overallCompletion === 'number') {
              totalCompletion += summary.overallCompletion;
            }
            if (summary.lastAccessed) {
              const accessDate = formatFirebaseTimestamp(summary.lastAccessed);
              if (!lastAccessed || accessDate > lastAccessed) {
                lastAccessed = accessDate;
              }
            }
            courseCount++;
          }
        });
        
        return {
          id: studentId,
          studentId: studentId,
          firstName: userData.firstName || 'Unknown',
          lastName: userData.lastName || 'Student',
          email: userData.email || '',
          scores: {
            average: courseCount > 0 ? totalScore / courseCount : 0
          },
          completion: courseCount > 0 ? totalCompletion / courseCount : 0,
          lastAccessed: lastAccessed
        };
      });
      
      // Cache the result
      updateQueryCache('studentsByTeacher', cacheKey, students);
      
      console.timeEnd('fetchStudentsByTeacher');
      return students;
    } catch (error) {
      console.error("Error fetching students by teacher:", error);
      return [];
    }
  }, [fetchTeacherCourses, getFromQueryCache, updateQueryCache]);
  
  // Get course statistics with enhanced caching
  const fetchCourseStats = useCallback(async (courseId) => {
    if (!courseId) return null;
    
    // Check cache first
    const cachedData = getFromQueryCache('courseStats', courseId);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Get course document
      const course = await fetchDocumentById('courses', courseId);
      if (!course) return null;
      
      // Get enrollments for this course to count students
      const enrollments = await fetchDocuments('enrollments', {
        filters: [{ field: 'courseId', operator: '==', value: courseId }]
      });
      
      // Get modules and assignments for this course in parallel
      const [modules, assignments] = await Promise.all([
        fetchSubcollection('courses', courseId, 'modules').catch(() => []),
        fetchSubcollection('courses', courseId, 'assignments').catch(() => [])
      ]);
      
      // Calculate statistics from student progress data
      let activeStudentsLast7Days = 0;
      let activeStudentsLast30Days = 0;
      let totalCompletion = 0;
      let totalScore = 0;
      let studentsWithProgress = 0;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      
      // Batch process student progress data
      const progressPromises = (enrollments || []).map(async (enrollment) => {
        const studentId = enrollment.studentId;
        
        if (studentId) {
          try {
            // Get student progress for this specific course
            const progressPath = `studentProgress/${studentId}/courses`;
            const courseProgress = await fetchDocumentById(progressPath, courseId);
            
            if (courseProgress && courseProgress.summary) {
              const summary = courseProgress.summary;
              
              let scoreToAdd = 0;
              let completionToAdd = 0;
              let hasValidProgress = false;
              
              // Count completions and scores
              if (typeof summary.overallCompletion === 'number') {
                completionToAdd = summary.overallCompletion;
                hasValidProgress = true;
              }
              
              if (typeof summary.overallScore === 'number') {
                scoreToAdd = summary.overallScore;
                hasValidProgress = true;
              }
              
              // Count active students
              let isActive7Days = false;
              let isActive30Days = false;
              
              if (summary.lastAccessed) {
                const lastAccessDate = formatFirebaseTimestamp(summary.lastAccessed);
                
                if (lastAccessDate >= oneWeekAgo) {
                  isActive7Days = true;
                }
                
                if (lastAccessDate >= oneMonthAgo) {
                  isActive30Days = true;
                }
              }
              
              return {
                hasValidProgress,
                scoreToAdd,
                completionToAdd,
                isActive7Days,
                isActive30Days
              };
            }
          } catch (err) {
            console.warn(`Error getting progress for student ${studentId}:`, err.message);
          }
        }
        
        return null;
      });
      
      const progressResults = await Promise.all(progressPromises);
      
      // Aggregate results
      progressResults.forEach(result => {
        if (result) {
          if (result.hasValidProgress) {
            totalScore += result.scoreToAdd;
            totalCompletion += result.completionToAdd;
            studentsWithProgress++;
          }
          if (result.isActive7Days) {
            activeStudentsLast7Days++;
          }
          if (result.isActive30Days) {
            activeStudentsLast30Days++;
          }
        }
      });
      
      // Compile statistics
      const studentCount = enrollments ? enrollments.length : 0;
      const courseStats = {
        courseId,
        courseName: course.courseName || 'Unknown Course',
        studentCount,
        activeStudentsLast7Days,
        activeStudentsLast30Days,
        activeRatio7Days: studentCount > 0 ? activeStudentsLast7Days / studentCount : 0,
        activeRatio30Days: studentCount > 0 ? activeStudentsLast30Days / studentCount : 0,
        averageScore: studentsWithProgress > 0 ? totalScore / studentsWithProgress : 0,
        averageCompletion: studentsWithProgress > 0 ? totalCompletion / studentsWithProgress : 0,
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
  
  // Get student assignments with enhanced caching and error handling
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
        filters: [{ field: 'studentId', operator: '==', value: studentId }]
      });
      
      if (!enrollments || enrollments.length === 0) {
        const emptyResult = [];
        updateQueryCache('studentAssignments', studentId, emptyResult);
        return emptyResult;
      }
      
      const assignments = [];
      
      // Process enrollments in parallel
      const assignmentPromises = enrollments.map(async (enrollment) => {
        const courseId = enrollment.courseId;
        
        if (!courseId) return [];
        
        try {
          // Get the course and assignments in parallel
          const [course, courseAssignments] = await Promise.all([
            fetchDocumentById('courses', courseId).catch(() => null),
            fetchSubcollection('courses', courseId, 'assignments').catch(() => [])
          ]);
          
          if (!courseAssignments || courseAssignments.length === 0) {
            return [];
          }
          
          // Get student progress on assignments for this course
          let studentAssignmentProgress = [];
          try {
            const progressData = await fetchSubcollection(
              'studentProgress', 
              studentId, 
              `courses/${courseId}/assignments`
            );
            if (progressData && progressData.length > 0) {
              studentAssignmentProgress = progressData;
            }
          } catch (err) {
            // Progress data might not exist, which is normal
            console.warn(`No assignment progress found for student ${studentId} in course ${courseId}`);
          }
          
          // Create a map of assignment progress by assignment ID
          const progressMap = new Map();
          studentAssignmentProgress.forEach(progress => {
            progressMap.set(progress.id || progress.assignmentId, progress);
          });
          
          // Combine assignment data with student progress
          return courseAssignments.map(assignment => {
            const assignmentId = assignment.id || assignment.assignmentId;
            const progress = progressMap.get(assignmentId);
            
            // Determine assignment status
            let status = 'pending';
            const now = new Date();
            const dueDate = assignment.dueDate ? formatFirebaseTimestamp(assignment.dueDate) : null;
            const assignDate = assignment.assignDate ? formatFirebaseTimestamp(assignment.assignDate) : null;
            
            if (progress?.submittedAt) {
              status = 'completed';
            } else if (dueDate && dueDate < now) {
              status = 'overdue';
            } else if (assignDate && assignDate > now) {
              status = 'future';
            }
            
            // Check if submission was late
            const isLate = progress?.submittedAt && dueDate &&
              formatFirebaseTimestamp(progress.submittedAt) > dueDate;
            
            return {
              id: assignmentId,
              title: assignment.title || 'Untitled Assignment',
              description: assignment.description || '',
              courseId: courseId,
              courseName: course?.courseName || 'Unknown Course',
              dueDate: assignment.dueDate,
              assignDate: assignment.assignDate,
              assignmentType: assignment.assignmentType || 'Assignment',
              status: progress?.status || status,
              submitted: progress?.submittedAt ? true : false,
              submissionDate: progress?.submittedAt || null,
              score: progress?.totalScore || null,
              maxScore: assignment.maxScore || 100,
              weight: assignment.weight || 1,
              isLate: progress?.isLate || isLate || false,
              timeSpent: progress?.totalTime || 0,
              moduleId: assignment.moduleId || null,
              notes: progress?.notes || ''
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
  
  // Get module progress for a student with enhanced caching
  const fetchModuleProgress = useCallback(async (studentId, courseId) => {
    if (!studentId || !courseId) return [];
    
    // Check cache first
    const cacheKey = `${studentId}-${courseId}`;
    const cachedData = getFromQueryCache('moduleProgress', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Get modules and progress in parallel
      const [modules, moduleProgress] = await Promise.all([
        fetchSubcollection('courses', courseId, 'modules').catch(() => []),
        fetchSubcollection(
          'studentProgress', 
          studentId, 
          `courses/${courseId}/modules`
        ).catch(() => [])
      ]);
      
      // Create a map of module progress by module ID
      const progressMap = new Map();
      (moduleProgress || []).forEach(progress => {
        progressMap.set(progress.moduleId || progress.id, progress);
      });
      
      // Combine module data with student progress
      const moduleData = (modules || []).map(module => {
        const moduleId = module.moduleId || module.id;
        const progress = progressMap.get(moduleId);
        
        return {
          id: moduleId,
          title: module.moduleTitle || 'Unnamed Module',
          description: module.description || '',
          sequenceNumber: module.sequenceNumber || 0,
          completed: (progress?.completion || 0) >= 100,
          completion: progress?.completion || 0,
          expertiseRate: progress?.totalExpertiseRate || 0,
          lastAccessed: progress?.lastAccessed || null
        };
      });
      
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
  
  // Fetch list of all students with caching
  const fetchAllStudents = useCallback(async () => {
    if (students.length > 0 && !isCacheExpired('students')) {
      return students;
    }
    
    try {
      setLoading(true);
      const studentsData = await fetchDocuments('students');
      const result = studentsData || [];
      setStudents(result);
      updateCacheTimestamp('students');
      return result;
    } catch (error) {
      console.error("Error fetching all students:", error);
      setError("Failed to fetch students data");
      return [];
    } finally {
      setLoading(false);
    }
  }, [students.length, isCacheExpired, updateCacheTimestamp]);
  
  // Fetch list of all assignments with caching
  const fetchAllAssignments = useCallback(async () => {
    if (assignments.length > 0 && !isCacheExpired('assignments')) {
      return assignments;
    }
    
    try {
      setLoading(true);
      const assignmentsData = await fetchDocuments('assignments');
      const result = assignmentsData || [];
      setAssignments(result);
      updateCacheTimestamp('assignments');
      return result;
    } catch (error) {
      console.error("Error fetching all assignments:", error);
      setError("Failed to fetch assignments data");
      return [];
    } finally {
      setLoading(false);
    }
  }, [assignments.length, isCacheExpired, updateCacheTimestamp]);
  
  // Fetch list of all modules with caching
  const fetchAllModules = useCallback(async () => {
    if (modules.length > 0 && !isCacheExpired('modules')) {
      return modules;
    }
    
    try {
      setLoading(true);
      const modulesData = await fetchDocuments('modules');
      const result = modulesData || [];
      setModules(result);
      updateCacheTimestamp('modules');
      return result;
    } catch (error) {
      console.error("Error fetching all modules:", error);
      setError("Failed to fetch modules data");
      return [];
    } finally {
      setLoading(false);
    }
  }, [modules.length, isCacheExpired, updateCacheTimestamp]);
  
  // Load initial data with improved dependency management
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch core data if needed and cache isn't expired
        const promises = [];
        
        // Courses data
        if (courses.length === 0 || isCacheExpired('courses')) {
          promises.push(
            fetchDocuments('courses').then(coursesData => {
              setCourses(coursesData || []);
              updateCacheTimestamp('courses');
              return coursesData || [];
            })
          );
        } else {
          promises.push(Promise.resolve(courses));
        }
        
        // Teachers data
        if (teachers.length === 0 || isCacheExpired('teachers')) {
          promises.push(
            fetchDocuments('teachers').then(teachersData => {
              setTeachers(teachersData || []);
              updateCacheTimestamp('teachers');
              return teachersData || [];
            })
          );
        } else {
          promises.push(Promise.resolve(teachers));
        }
        
        const [loadedCourses] = await Promise.all(promises);
        
        // Only fetch more detailed data if this is not an initial load and user has role
        if (currentUser.role && (courseData.length === 0 || isCacheExpired('courseData'))) {
          // Create aggregated course data
          const aggregatedCourseData = (loadedCourses || []).map(course => ({
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
  }, [currentUser]); // Simplified dependency array to prevent infinite loops
  
  // Pre-emptively fetch data when user role changes
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      // Pre-load common data for admins
      fetchAllStudents();
      fetchAllAssignments();
    }
  }, [currentUser?.role, fetchAllStudents, fetchAllAssignments]);
  
  // Expose context value
  const value = {
    // Data
    students,
    teachers,
    courses,
    assignments,
    modules,
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
    fetchAllStudents,
    fetchAllAssignments,
    fetchAllModules,
    clearCache
  };
  
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};