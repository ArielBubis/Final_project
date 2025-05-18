import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { fetchDocuments, fetchDocumentById, formatFirebaseTimestamp, fetchSubcollection } from '../utils/firebaseUtils';
import { calculateAverage } from '../utils/dataProcessingUtils';
import { api } from '../services/apiService'; // already set up


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
        switch (cacheType) {
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
          // const coursesData = await fetchDocuments('courses');
          const coursesData = await api.queryCollection('courses');
          // setCourses(coursesData || []);
          setCourses(coursesData?.data || []);
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
      // const coursesQuery = await api.queryCollection('courses', [
      //   { field: 'teacherId', op: '==', value: teacherId }
      // ]);

      const result = await api.queryCollection('courses', [
        { field: 'teacherId', op: '==', value: teacherId }
      ]);
      const coursesQuery = result?.data || [];  // ✅ unwrap `.data

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
  // Get students by teacher with enhanced caching and batch operations
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
      // console.log(`Fetching batch data for ${studentIdsArray.length} students`);

      // BATCH OPERATION 1: Fetch all students at once with a single query
      let studentsQuery = await fetchDocuments('students', {
        filters: [{ field: 'id', operator: 'in', value: studentIdsArray }]
      }) || [];

      if (studentsQuery.length === 0) {
        // Try querying by studentId field if id field doesn't work
        const studentsByIdQuery = await fetchDocuments('students', {
          filters: [{ field: 'studentId', operator: 'in', value: studentIdsArray }]
        }) || [];

        if (studentsByIdQuery.length > 0) {
          // console.log(`Found ${studentsByIdQuery.length} students using studentId field`);
          studentsQuery = studentsByIdQuery;
        }
      }

      // console.log(`Found ${studentsQuery.length} students in database`);
      if (studentsQuery.length === 0) return [];

      // BATCH OPERATION 2: Fetch all relevant user data in a single query
      const userIds = studentsQuery
        .map(student => student.userId)
        .filter(Boolean);

      let usersData = [];
      if (userIds.length > 0) {
        usersData = await fetchDocuments('users', {
          filters: [{ field: 'uid', operator: 'in', value: userIds }]
        }) || [];
        // console.log(`Found ${usersData.length} user records for students`);
      }

      // Create maps for quick lookups
      const userDataMap = new Map();
      usersData.forEach(user => {
        userDataMap.set(user.uid, user);
      });

      // Create a map of student progress by studentId and courseId
      // Instead of fetching each progress document individually with a separate request,
      // we'll collect all studentId-courseId pairs and fetch their progress data with batched operations

      // IMPROVED APPROACH: Group all progress data fetching into a batch operation
      const courseProgressPromises = [];
      const progressMap = new Map(); // Maps studentId-courseId to progress

      // Group progress fetching by student to reduce number of requests
      const studentProgressByStudent = new Map(); // Maps studentId to an array of course IDs

      // Group all requests by student
      studentsQuery.forEach(student => {
        const studentId = student.id || student.studentId;
        const coursesForStudent = [];

        teacherCourses.forEach(course => {
          const courseId = course.id || course.courseId;
          if (courseId) {
            coursesForStudent.push(courseId);
          }
        });

        if (coursesForStudent.length > 0) {
          studentProgressByStudent.set(studentId, coursesForStudent);
        }
      });

      // Now fetch progress data for each student's courses as a batch
      const progressPromises = Array.from(studentProgressByStudent.entries()).map(
        async ([studentId, courseIds]) => {
          try {
            // For each student, fetch progress data for all their courses in a batch
            // This significantly reduces the number of network requests
            const progressDataForStudent = await Promise.all(
              courseIds.map(courseId =>
                fetchDocumentById(`studentProgress/${studentId}/courses`, courseId)
                  .then(progress => {
                    if (progress && progress.summary) {
                      progressMap.set(`${studentId}-${courseId}`, progress.summary);
                    }
                    return progress;
                  })
                  .catch(err => {
                    console.error(`Error getting progress for student ${studentId} in course ${courseId}:`, err);
                    return null;
                  })
              )
            );
            return progressDataForStudent;
          } catch (err) {
            console.error(`Error fetching progress data for student ${studentId}:`, err);
            return [];
          }
        }
      );

      // Wait for all progress data to be fetched
      await Promise.all(progressPromises);
      // console.log(`Collected progress data for ${progressMap.size} student-course combinations`);

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

            // Determine assignment status
            let status = 'pending';
            const now = new Date();
            const dueDate = formatFirebaseTimestamp(assignment.dueDate);
            const assignDate = formatFirebaseTimestamp(assignment.assignDate);

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

            assignments.push({
              id: assignmentId,
              title: assignment.title,
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
