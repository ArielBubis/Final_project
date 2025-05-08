import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { fetchDocuments, fetchDocumentById, formatFirebaseTimestamp, fetchSubcollection } from '../utils/firebaseUtils';
import { calculateAverage } from '../utils/dataProcessingUtils';

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
  
  // Constants for cache expiration times (in milliseconds)
  const CACHE_EXPIRATION = {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 15 * 60 * 1000, // 15 minutes
    LONG: 60 * 60 * 1000 // 1 hour
  };
  
  // Check if cache is expired
  const isCacheExpired = useCallback((cacheType) => {
    const timestamp = cacheTimestamps[cacheType];
    if (!timestamp) return true;
    
    const now = new Date().getTime();
    const expirationTime = CACHE_EXPIRATION.MEDIUM; // Default to medium expiration
    
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
  const updateQueryCache = useCallback((cacheType, key, value, expirationTime = CACHE_EXPIRATION.MEDIUM) => {
    setQueryCache(prevCache => {
      const updatedCache = new Map(prevCache[cacheType]);
      updatedCache.set(key, {
        data: value,
        timestamp: new Date().getTime(),
        expiration: expirationTime
      });
      return {
        ...prevCache,
        [cacheType]: updatedCache
      };
    });
  }, []);
  
  // Helper function to get from query cache
  const getFromQueryCache = useCallback((cacheType, key) => {
    const cachedEntry = queryCache[cacheType].get(key);
    
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
        switch(cacheType) {
          case 'students':
            setStudents([]);
            break;
          case 'teachers':
            setTeachers([]);
            break;
          case 'courses':
            setCourses([]);
            break;
          case 'assignments':
            setAssignments([]);
            break;
          case 'modules':
            setModules([]);
            break;
          case 'courseData':
            setCourseData([]);
            break;
          default:
            break;
        }
        
        setCacheTimestamps(prevState => ({
          ...prevState,
          [cacheType]: null
        }));
      } else if (cacheType in queryCache) {
        // Clear specific query cache
        setQueryCache(prevCache => ({
          ...prevCache,
          [cacheType]: new Map()
        }));
      }
    }
  }, []);
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch core data if needed and cache isn't expired
        
        // Courses data
        if (courses.length === 0 || isCacheExpired('courses')) {
          const coursesData = await fetchDocuments('courses');
          setCourses(coursesData || []);
          updateCacheTimestamp('courses');
        }
        
        // Teachers data
        if (teachers.length === 0 || isCacheExpired('teachers')) {
          const teachersData = await fetchDocuments('teachers');
          setTeachers(teachersData || []);
          updateCacheTimestamp('teachers');
        }
        
        // Only fetch more detailed data if this is not an initial load
        if (currentUser.role) {
          if (courseData.length === 0 || isCacheExpired('courseData')) {
            // In a real implementation, this would be an API call to get aggregated course data
            // For now, we'll synthesize this from the courses we already have
            const aggregatedCourseData = courses.map(course => {
              // Create mock aggregated data for each course
              return {
                ...course,
                studentCount: Math.floor(Math.random() * 50) + 10,
                averageCompletion: Math.floor(Math.random() * 60) + 40,
                averageScore: Math.floor(Math.random() * 40) + 60,
                activeLast7Days: Math.floor(Math.random() * 30) + 5,
                activeLast30Days: Math.floor(Math.random() * 40) + 10,
                activeRatio7Days: Math.random() * 0.8,
                activeRatio30Days: Math.random() * 0.9 + 0.1
              };
            });
            
            setCourseData(aggregatedCourseData);
            updateCacheTimestamp('courseData');
          }
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [currentUser, isCacheExpired, updateCacheTimestamp, courses.length, teachers.length, courseData.length]);
  
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
          const userId = usersWithEmail[0].id; // Use the document ID as userId
          
          // Now find the teacher record with this userId
          const teachersWithUserId = await fetchDocuments('teachers', {
            filters: [
              { field: 'userId', operator: '==', value: userId }
            ]
          });
          
          if (teachersWithUserId && teachersWithUserId.length > 0) {
            teacherId = teachersWithUserId[0].id; // Use the document ID as teacherId
          } else {
            console.error(`No teacher record found for user ${userId}`);
            return [];
          }
        } else {
          console.error(`No user found with email ${teacherIdOrEmail}`);
          return [];
        }
      }
      
      // Now get courses for this teacherId
      const coursesQuery = await fetchDocuments('courses', {
        filters: [
          { field: 'teacherId', operator: '==', value: teacherId }
        ]
      });
      
      if (!coursesQuery || coursesQuery.length === 0) {
        console.log(`No courses found for teacher ${teacherId}`);
      }
      
      // Cache the result
      updateQueryCache('teacherCourses', cacheKey, coursesQuery);
      
      return coursesQuery;
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      return [];
    }
  }, [fetchDocuments, getFromQueryCache, updateQueryCache]);
  
  // Get students by teacher with enhanced caching
  const fetchStudentsByTeacher = useCallback(async (teacherIdOrEmail) => {
    if (!teacherIdOrEmail) return [];
    
    // Check cache first
    const cacheKey = `teacher-${teacherIdOrEmail}`;
    const cachedData = getFromQueryCache('studentsByTeacher', cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // First get the teacher's courses
      const teacherCourses = await fetchTeacherCourses(teacherIdOrEmail);
      
      if (!teacherCourses || teacherCourses.length === 0) {
        return [];
      }
      
      // Get all unique student IDs from all courses
      const studentIds = new Set();
      teacherCourses.forEach(course => {
        if (course.students && Array.isArray(course.students)) {
          course.students.forEach(studentId => studentIds.add(studentId));
        }
      });
      
      // Fetch student details and corresponding user info
      const students = [];
      for (const studentId of studentIds) {
        const studentData = await fetchDocumentById('students', studentId);
        
        if (studentData) {
          // Get the user data for this student
          let userData = null;
          if (studentData.userId) {
            userData = await fetchDocumentById('users', studentData.userId);
          }
          
          // Get progress summary across all courses
          let totalScore = 0;
          let totalCompletion = 0;
          let courseCount = 0;
          let lastAccessed = null;
          
          // Get student progress for relevant courses
          for (const course of teacherCourses) {
            try {
              // Get course progress summary using the correct path structure
              const courseProgress = await fetchDocumentById(
                `studentProgress/${studentId}/courses`,
                course.courseId
              );
              
              if (courseProgress && courseProgress.summary) {
                const summary = courseProgress.summary;
                if (summary.overallScore !== undefined) {
                  totalScore += summary.overallScore;
                }
                if (summary.overallCompletion !== undefined) {
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
            } catch (err) {
              console.error(`Error getting progress for student ${studentId} in course ${course.courseId}:`, err);
            }
          }
          
          // Build student object with data from user record and progress
          students.push({
            id: studentId,
            studentId: studentId,
            firstName: userData?.firstName || 'Unknown',
            lastName: userData?.lastName || 'Student',
            email: userData?.email || '',
            scores: {
              average: courseCount > 0 ? totalScore / courseCount : 0
            },
            completion: courseCount > 0 ? totalCompletion / courseCount : 0,
            lastAccessed: lastAccessed
          });
        }
      }
      
      // Cache the result
      updateQueryCache('studentsByTeacher', cacheKey, students);
      
      return students;
    } catch (error) {
      console.error("Error fetching students by teacher:", error);
      return [];
    }
  }, [fetchTeacherCourses, fetchDocuments, fetchDocumentById, getFromQueryCache, updateQueryCache, formatFirebaseTimestamp]);
  
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
      
      // Get modules for this course
      const modules = await fetchSubcollection('courses', courseId, 'modules');
      
      // Get assignments for this course
      const assignments = await fetchSubcollection('courses', courseId, 'assignments');
      
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
      
      // For each student enrolled in this course, get their progress data
      for (const enrollment of enrollments) {
        const studentId = enrollment.studentId;
        
        if (studentId) {
          try {
            // Get student progress for this specific course
            const progressPath = `studentProgress/${studentId}/courses`;
            const courseProgress = await fetchDocumentById(progressPath, courseId);
            
            if (courseProgress && courseProgress.summary) {
              const summary = courseProgress.summary;
              
              // Count completions and scores
              if (typeof summary.overallCompletion === 'number') {
                totalCompletion += summary.overallCompletion;
              }
              
              if (typeof summary.overallScore === 'number') {
                totalScore += summary.overallScore;
              }
              
              // Count active students
              if (summary.lastAccessed) {
                const lastAccessDate = formatFirebaseTimestamp(summary.lastAccessed);
                
                if (lastAccessDate >= oneWeekAgo) {
                  activeStudentsLast7Days++;
                }
                
                if (lastAccessDate >= oneMonthAgo) {
                  activeStudentsLast30Days++;
                }
              }
              
              studentsWithProgress++;
            }
          } catch (err) {
            console.error(`Error getting progress for student ${studentId}:`, err);
          }
        }
      }
      
      // Compile statistics
      const studentCount = enrollments.length;
      const courseStats = {
        courseId,
        courseName: course.courseName,
        studentCount,
        activeStudentsLast7Days,
        activeStudentsLast30Days,
        activeRatio7Days: studentCount > 0 ? activeStudentsLast7Days / studentCount : 0,
        activeRatio30Days: studentCount > 0 ? activeStudentsLast30Days / studentCount : 0,
        averageScore: studentsWithProgress > 0 ? totalScore / studentsWithProgress : 0,
        averageCompletion: studentsWithProgress > 0 ? totalCompletion / studentsWithProgress : 0,
        assignmentCount: assignments.length,
        moduleCount: modules.length
      };
      
      // Cache the result
      updateQueryCache('courseStats', courseId, courseStats);
      
      return courseStats;
    } catch (error) {
      console.error("Error fetching course stats:", error);
      return null;
    }
  }, [fetchDocumentById, fetchDocuments, fetchSubcollection, getFromQueryCache, updateQueryCache, formatFirebaseTimestamp]);
  
  // Get student assignments with enhanced caching
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
      
      const assignments = [];
      
      // For each enrolled course, get assignments
      for (const enrollment of enrollments) {
        const courseId = enrollment.courseId;
        
        if (courseId) {
          // Get the course to get the name
          const course = await fetchDocumentById('courses', courseId);
          
          // Get all assignments for this course
          const courseAssignments = await fetchSubcollection('courses', courseId, 'assignments');
          
          // Get student progress on assignments for this course
          const studentAssignmentProgress = [];
          try {
            // Try to get student progress for this course's assignments
            const progressData = await fetchSubcollection(
              'studentProgress', 
              studentId, 
              `courses/${courseId}/assignments`
            );
            if (progressData && progressData.length > 0) {
              progressData.forEach(progress => {
                studentAssignmentProgress.push(progress);
              });
            }
          } catch (err) {
            console.error(`Error getting assignment progress for student ${studentId} in course ${courseId}:`, err);
          }
          
          // Create a map of assignment progress by assignment ID
          const progressMap = new Map();
          studentAssignmentProgress.forEach(progress => {
            progressMap.set(progress.id || progress.assignmentId, progress);
          });
          
          // Combine assignment data with student progress
          for (const assignment of courseAssignments) {
            const assignmentId = assignment.id || assignment.assignmentId;
            const progress = progressMap.get(assignmentId);
            
            assignments.push({
              id: assignmentId,
              title: assignment.title,
              courseId: courseId,
              courseName: course?.courseName || 'Unknown Course',
              dueDate: assignment.dueDate,
              submitted: progress?.submittedAt ? true : false,
              submissionDate: progress?.submittedAt || null,
              score: progress?.totalScore || null,
              maxScore: assignment.maxScore || 100,
              moduleId: assignment.moduleId || null
            });
          }
        }
      }
      
      // Sort by due date
      assignments.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return formatFirebaseTimestamp(a.dueDate) - formatFirebaseTimestamp(b.dueDate);
      });
      
      // Cache the result
      updateQueryCache('studentAssignments', studentId, assignments);
      
      return assignments;
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      return [];
    }
  }, [fetchDocuments, fetchDocumentById, fetchSubcollection, getFromQueryCache, updateQueryCache, formatFirebaseTimestamp]);
  
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
      // Get all modules for this course
      const modules = await fetchSubcollection('courses', courseId, 'modules');
      
      // Get student progress for modules in this course
      const moduleProgress = [];
      try {
        const progressData = await fetchSubcollection(
          'studentProgress', 
          studentId, 
          `courses/${courseId}/modules`
        );
        if (progressData && progressData.length > 0) {
          progressData.forEach(progress => {
            moduleProgress.push(progress);
          });
        }
      } catch (err) {
        console.error(`Error getting module progress for student ${studentId} in course ${courseId}:`, err);
      }
      
      // Create a map of module progress by module ID
      const progressMap = new Map();
      moduleProgress.forEach(progress => {
        progressMap.set(progress.moduleId || progress.id, progress);
      });
      
      // Combine module data with student progress
      const moduleData = modules.map(module => {
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
  }, [fetchSubcollection, getFromQueryCache, updateQueryCache]);
  
  // Fetch list of all students with caching
  const fetchAllStudents = useCallback(async () => {
    if (students.length > 0 && !isCacheExpired('students')) {
      return students;
    }
    
    try {
      setLoading(true);
      const studentsData = await fetchDocuments('students');
      setStudents(studentsData || []);
      updateCacheTimestamp('students');
      setLoading(false);
      return studentsData || [];
    } catch (error) {
      console.error("Error fetching all students:", error);
      setError("Failed to fetch students data");
      setLoading(false);
      return [];
    }
  }, [students, isCacheExpired, updateCacheTimestamp]);
  
  // Fetch list of all assignments with caching
  const fetchAllAssignments = useCallback(async () => {
    if (assignments.length > 0 && !isCacheExpired('assignments')) {
      return assignments;
    }
    
    try {
      setLoading(true);
      const assignmentsData = await fetchDocuments('assignments');
      setAssignments(assignmentsData || []);
      updateCacheTimestamp('assignments');
      setLoading(false);
      return assignmentsData || [];
    } catch (error) {
      console.error("Error fetching all assignments:", error);
      setError("Failed to fetch assignments data");
      setLoading(false);
      return [];
    }
  }, [assignments, isCacheExpired, updateCacheTimestamp]);
  
  // Fetch list of all modules with caching
  const fetchAllModules = useCallback(async () => {
    if (modules.length > 0 && !isCacheExpired('modules')) {
      return modules;
    }
    
    try {
      setLoading(true);
      const modulesData = await fetchDocuments('modules');
      setModules(modulesData || []);
      updateCacheTimestamp('modules');
      setLoading(false);
      return modulesData || [];
    } catch (error) {
      console.error("Error fetching all modules:", error);
      setError("Failed to fetch modules data");
      setLoading(false);
      return [];
    }
  }, [modules, isCacheExpired, updateCacheTimestamp]);
  
  // Pre-emptively fetch data when user role changes
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      // Pre-load common data for admins
      fetchAllStudents();
      fetchAllAssignments();
    }
  }, [currentUser, fetchAllStudents, fetchAllAssignments]);
  
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