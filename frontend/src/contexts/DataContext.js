import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { fetchAllStudents } from "../services/studentService";
import { fetchAllTeachers, fetchAllCourses } from "../services/adminService";
import { db } from "../firebaseConfig";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  collectionGroup,
  onSnapshot
} from "firebase/firestore";

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
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Cache for expensive queries to avoid redundant fetches
  const [teacherCoursesCache] = useState(new Map());
  const [courseStatsCache] = useState(new Map());
  const [teacherStudentsCache] = useState(new Map());
  
  useEffect(() => {
    let isMounted = true;
    
    const loadStudents = async () => {
      try {
        setLoading(true);
        const fetchedStudents = await fetchAllStudents();
        
        if (isMounted) {
          setStudents(fetchedStudents);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load students");
          console.error("Error loading students:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadStudents();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize loadAdminData function
  const loadAdminData = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    
    try {
      // Load teachers and courses in parallel for better performance
      const [fetchedTeachers, fetchedCourses] = await Promise.all([
        fetchAllTeachers(),
        fetchAllCourses()
      ]);
      
      if (isMounted) {
        setTeachers(fetchedTeachers);
        setCourseData(fetchedCourses);
        setError("");
      }
    } catch (err) {
      if (isMounted) {
        setError("Failed to load admin dashboard data");
        console.error("Error loading admin data:", err);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoized function to fetch teacher courses with caching
  const fetchTeacherCourses = useCallback(async (teacherIdOrEmail) => {
    // Check cache first to avoid redundant fetches
    if (teacherCoursesCache.has(teacherIdOrEmail)) {
      return teacherCoursesCache.get(teacherIdOrEmail);
    }
    
    try {
      console.log(`Fetching courses for teacher: ${teacherIdOrEmail}`);
      
      // Determine if we're looking up by email or ID
      let teacherId = teacherIdOrEmail;
      const isEmail = teacherIdOrEmail.includes('@');
      
      // If email provided, find the teacher ID
      if (isEmail) {
        console.log(`Finding teacher by email: ${teacherIdOrEmail}`);
        const usersQuery = query(collection(db, "users"), where("email", "==", teacherIdOrEmail));
        const usersSnapshot = await getDocs(usersQuery);
        
        if (usersSnapshot.docs.length === 0) {
          console.log(`No user found with email: ${teacherIdOrEmail}`);
          return [];
        }
        
        teacherId = usersSnapshot.docs[0].id;
        console.log(`Found user with ID: ${teacherId} for email: ${teacherIdOrEmail}`);
      }
      
      // Fetch teacher document
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId));
      
      let courseIds = [];
      
      // Get course IDs from teacher document
      if (teacherDoc.exists() && teacherDoc.data().courses) {
        courseIds = teacherDoc.data().courses;
        console.log(`Found ${courseIds.length} courses in teacher document`);
      } else {
        // Fallback: Query courses where the teacher is listed as the primary teacher
        // Only uncomment if needed
        // const coursesQuery = query(collection(db, "courses"), where("teacherId", "==", teacherId));
        // const coursesSnapshot = await getDocs(coursesQuery);
        // courseIds = coursesSnapshot.docs.map(doc => doc.id);
        // console.log(`Found ${courseIds.length} courses with teacherId = ${teacherId}`);
      }
      
      if (courseIds.length === 0) {
        console.log("No courses found for teacher");
        return [];
      }
      
      // Batch fetch course data in parallel for better performance
      const courseDataPromises = courseIds.map(async (courseId) => {
        // Fetch course data, enrollments, and modules in parallel
        const [courseDoc, enrollmentsSnapshot, modulesSnapshot] = await Promise.all([
          getDoc(doc(db, "courses", courseId)),
          getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId))),
          getDocs(query(collection(db, "courses", courseId, "modules")))
        ]);
        
        if (!courseDoc.exists()) {
          console.log(`Course ${courseId} not found`);
          return null;
        }
        
        const courseData = courseDoc.data();
        const modules = modulesSnapshot.docs.map(doc => ({
          moduleId: doc.id,
          ...doc.data()
        }));
        
        // Get placeholder image if no thumbnail is available
        const thumbnailUrl = courseData.thumbnailUrl || "https://via.placeholder.com/80";
        
        return {
          courseId,
          courseName: courseData.courseName || "Unnamed Course",
          description: courseData.description || "",
          subjectArea: courseData.subjectArea || "General",
          startDate: courseData.startDate,
          endDate: courseData.endDate,
          students: enrollmentsSnapshot.docs.map(doc => doc.data().studentId),
          studentCount: enrollmentsSnapshot.docs.length,
          modules: modules,
          moduleCount: modules.length,
          thumbnailUrl,
          published: courseData.published || false
        };
      });
      
      // Wait for all parallel requests to complete
      const coursesData = (await Promise.all(courseDataPromises)).filter(Boolean);
      
      // Cache the result for future use
      teacherCoursesCache.set(teacherIdOrEmail, coursesData);
      
      return coursesData;
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      return [];
    }
  }, [teacherCoursesCache]);

  // Memoized function to fetch students by teacher with caching
  const fetchStudentsByTeacher = useCallback(async (teacherIdOrEmail) => {
    // Check cache first
    if (teacherStudentsCache.has(teacherIdOrEmail)) {
      return teacherStudentsCache.get(teacherIdOrEmail);
    }
    
    try {
      console.log(`Fetching students for teacher: ${teacherIdOrEmail}`);
      
      // Get all courses for this teacher
      const courses = await fetchTeacherCourses(teacherIdOrEmail);
      const courseIds = courses.map(course => course.courseId);
      
      if (courseIds.length === 0) {
        console.log("No courses found, so no students to fetch");
        return [];
      }
      
      console.log(`Found ${courseIds.length} courses, fetching enrollments`);
      
      // Collect all enrollment queries to run in parallel
      const enrollmentQueries = courseIds.map(courseId => 
        getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId)))
      );
      
      // Run all enrollment queries in parallel
      const enrollmentSnapshots = await Promise.all(enrollmentQueries);
      
      // Process results to get unique students and their course mappings
      const studentIds = new Set();
      const studentCourseMap = new Map();
      
      enrollmentSnapshots.forEach((snapshot, index) => {
        const courseId = courseIds[index];
        
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.studentId) {
            studentIds.add(data.studentId);
            
            // Add this course to the student's course list
            if (!studentCourseMap.has(data.studentId)) {
              studentCourseMap.set(data.studentId, []);
            }
            
            studentCourseMap.get(data.studentId).push({
              courseId,
              courseName: courses.find(c => c.courseId === courseId)?.courseName || "Unknown Course",
              finalScore: data.finalScore || 0
            });
          }
        });
      });
      
      console.log(`Found ${studentIds.size} unique students`);
      
      if (studentIds.size === 0) return [];
      
      // Batch fetch student details and progress data
      const studentPromises = Array.from(studentIds).map(async (studentId) => {
        // Get user and student data in parallel
        const [userDoc, studentDoc] = await Promise.all([
          getDoc(doc(db, "users", studentId)),
          getDoc(doc(db, "students", studentId))
        ]);
        
        const userData = userDoc.exists() ? userDoc.data() : {};
        const studentData = studentDoc.exists() ? studentDoc.data() : {};
        
        // Calculate overall metrics across all courses for this student
        let totalScore = 0;
        let totalCompletion = 0;
        let lastAccessedTimestamp = null;
        const courseCount = studentCourseMap.get(studentId)?.length || 0;
        
        // Batch fetch progress data for all courses
        const courseProgressPromises = (studentCourseMap.get(studentId) || []).map(course => 
          getDoc(doc(db, "studentProgress", studentId, "courses", course.courseId))
        );
        
        const progressDocs = await Promise.all(courseProgressPromises);
        
        // Process progress data
        progressDocs.forEach(progressDoc => {
          if (progressDoc.exists()) {
            const progressData = progressDoc.data();
            
            if (progressData.summary) {
              totalScore += progressData.summary.overallScore || 0;
              totalCompletion += progressData.summary.overallCompletion || 0;
              
              // Track most recent access time
              if (progressData.summary.lastAccessed && 
                  (!lastAccessedTimestamp || 
                   progressData.summary.lastAccessed.seconds > lastAccessedTimestamp.seconds)) {
                lastAccessedTimestamp = progressData.summary.lastAccessed;
              }
            }
          }
        });
        
        // Calculate averages
        const averageScore = courseCount > 0 ? totalScore / courseCount : 0;
        const overallCompletion = courseCount > 0 ? totalCompletion / courseCount : 0;
        
        return {
          studentId,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          gender: userData.gender || '',
          courses: studentCourseMap.get(studentId) || [],
          courseCount,
          averageScore,
          overallCompletion,
          lastAccessed: lastAccessedTimestamp
        };
      });
      
      const students = await Promise.all(studentPromises);
      
      // Cache the result
      teacherStudentsCache.set(teacherIdOrEmail, students);
      
      return students;
    } catch (error) {
      console.error("Error fetching students by teacher:", error);
      return [];
    }
  }, [fetchTeacherCourses, teacherStudentsCache]);

  // Memoized function to fetch course statistics with caching
  const fetchCourseStats = useCallback(async (courseId) => {
    // Check cache first
    if (courseStatsCache.has(courseId)) {
      return courseStatsCache.get(courseId);
    }
    
    try {
      console.log(`Fetching stats for course: ${courseId}`);
      
      // Get enrollments and assignments in parallel
      const [enrollmentsSnapshot, assignmentsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId))),
        getDocs(query(collection(db, "courses", courseId, "assignments")))
      ]);
      
      const studentCount = enrollmentsSnapshot.docs.length;
      const assignmentCount = assignmentsSnapshot.docs.length;
      
      // Extract student IDs
      const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
      
      if (studentIds.length === 0) {
        const emptyStats = {
          courseId,
          studentCount: 0,
          assignmentCount,
          averageScore: 0,
          averageCompletion: 0,
          activeLast7Days: 0,
          activeLast30Days: 0,
          activeRatio7Days: 0,
          activeRatio30Days: 0
        };
        
        courseStatsCache.set(courseId, emptyStats);
        return emptyStats;
      }
      
      // Calculate time thresholds for activity metrics
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Initialize statistics
      let totalScore = 0;
      let totalCompletion = 0;
      let activeLast7Days = 0;
      let activeLast30Days = 0;
      
      // Batch fetch progress data for all students
      const progressPromises = studentIds.map(studentId => 
        getDoc(doc(db, "studentProgress", studentId, "courses", courseId))
      );
      
      const progressDocs = await Promise.all(progressPromises);
      
      // Process progress data
      progressDocs.forEach(progressDoc => {
        if (progressDoc.exists()) {
          const progressData = progressDoc.data();
          
          if (progressData.summary) {
            // Add to total statistics
            totalScore += progressData.summary.overallScore || 0;
            totalCompletion += progressData.summary.overallCompletion || 0;
            
            // Check for recent activity
            if (progressData.summary.lastAccessed) {
              const lastAccessTime = progressData.summary.lastAccessed.toDate();
              if (lastAccessTime >= sevenDaysAgo) {
                activeLast7Days++;
              }
              if (lastAccessTime >= thirtyDaysAgo) {
                activeLast30Days++;
              }
            }
          }
        }
      });
      
      // Calculate final statistics
      const stats = {
        courseId,
        studentCount,
        assignmentCount,
        averageScore: studentCount > 0 ? totalScore / studentCount : 0,
        averageCompletion: studentCount > 0 ? totalCompletion / studentCount : 0,
        activeLast7Days,
        activeLast30Days,
        activeRatio7Days: studentCount > 0 ? activeLast7Days / studentCount : 0,
        activeRatio30Days: studentCount > 0 ? activeLast30Days / studentCount : 0
      };
      
      // Cache the result
      courseStatsCache.set(courseId, stats);
      
      return stats;
    } catch (error) {
      console.error("Error fetching course stats:", error);
      return {
        courseId,
        studentCount: 0,
        assignmentCount: 0,
        averageScore: 0,
        averageCompletion: 0,
        activeLast7Days: 0,
        activeLast30Days: 0,
        activeRatio7Days: 0,
        activeRatio30Days: 0
      };
    }
  }, [courseStatsCache]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    students,
    teachers,
    courseData,
    loading,
    error,
    fetchTeacherCourses,
    fetchStudentsByTeacher,
    fetchCourseStats,
    loadAdminData
  }), [
    students, 
    teachers, 
    courseData, 
    loading, 
    error, 
    fetchTeacherCourses, 
    fetchStudentsByTeacher,
    fetchCourseStats,
    loadAdminData
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};