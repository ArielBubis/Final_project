import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllStudents } from "../services/studentService";
import { db } from "../firebaseConfig";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  collectionGroup 
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Example course data (moved from Dashboard.js)
  const courseData = [
    { name: "Math 101", level: "Beginner", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "History 202", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Physics 303", level: "Advanced", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Calculus 1", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" }
  ];

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const fetchedStudents = await fetchAllStudents();
        setStudents(fetchedStudents);
        setError("");
      } catch (err) {
        setError("Failed to load students");
        console.error("Error loading students:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStudents();
  }, []);

  // Fetch courses taught by a specific teacher with all relevant data
  const fetchTeacherCourses = async (teacherIdOrEmail) => {
    try {
      console.log(`Fetching courses for teacher: ${teacherIdOrEmail}`);
      
      // First, try to find the teacher by email
      let teacherId = teacherIdOrEmail;
      let isEmail = teacherIdOrEmail.includes('@');
      
      // If an email is provided, find the teacher ID from the users collection
      console.log(`Finding teacher by email: ${teacherIdOrEmail}`);
      const usersQuery = query(collection(db, "users"), where("email", "==", teacherIdOrEmail));
      const usersSnapshot = await getDocs(usersQuery);
              
      // Get the first matching user
      const userData = usersSnapshot.docs[0];
      teacherId = userData.id;
      console.log(`Found user with ID: ${teacherId} for email: ${teacherIdOrEmail}`);
      
      
      // Now find the teacher's document with the located ID
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId));
      
      let courseIds = [];
      
      // If the teacher document exists and has courses
      if (teacherDoc.exists() && teacherDoc.data().courses) {
        courseIds = teacherDoc.data().courses;
        console.log(`Found ${courseIds.length} courses in teacher document`);
      } else {
        // // Fallback: Query courses where the teacher is listed as the primary teacher
        // const coursesQuery = query(collection(db, "courses"), where("teacherId", "==", teacherId));
        // const coursesSnapshot = await getDocs(coursesQuery);
        
        // courseIds = coursesSnapshot.docs.map(doc => doc.id);
        // console.log(`Found ${courseIds.length} courses with teacherId = ${teacherId}`);
      }
      
      // If no courses found, return empty array
      if (courseIds.length === 0) {
        console.log("No courses found for teacher");
        return [];
      }
      
      // Fetch detailed course data for each course ID
      const coursesData = await Promise.all(
        courseIds.map(async (courseId) => {
          const courseDoc = await getDoc(doc(db, "courses", courseId));
          
          if (!courseDoc.exists()) {
            console.log(`Course ${courseId} not found`);
            return null;
          }
          
          const courseData = courseDoc.data();
          
          // Fetch the number of students enrolled in this course
          const enrollmentsQuery = query(
            collection(db, "enrollments"),
            where("courseId", "==", courseId)
          );
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          
          // Fetch the modules for this course
          const modulesQuery = query(collection(db, "courses", courseId, "modules"));
          const modulesSnapshot = await getDocs(modulesQuery);
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
        })
      );
      
      // Filter out any null entries (courses that weren't found)
      return coursesData.filter(Boolean);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      return [];
    }
  };

  // Fetch students enrolled in a teacher's courses with performance data
  const fetchStudentsByTeacher = async (teacherIdOrEmail) => {
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
      
      // Get all enrollments for these courses
      const studentIds = new Set();
      const studentCourseMap = new Map(); // Map to track which courses each student is in
      
      for (const courseId of courseIds) {
        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("courseId", "==", courseId)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        enrollmentsSnapshot.docs.forEach(docSnap => {
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
      }
      
      console.log(`Found ${studentIds.size} unique students`);
      
      // If no students found, return empty array
      if (studentIds.size === 0) return [];
      
      // Fetch student details and progress data
      const studentPromises = Array.from(studentIds).map(async (studentId) => {
        // Get basic user data
        const userDoc = await getDoc(doc(db, "users", studentId));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Get student-specific data
        const studentDoc = await getDoc(doc(db, "students", studentId));
        const studentData = studentDoc.exists() ? studentDoc.data() : {};
        
        // Calculate overall metrics across all courses for this student
        let totalScore = 0;
        let totalCompletion = 0;
        let lastAccessedTimestamp = null;
        const courseCount = studentCourseMap.get(studentId)?.length || 0;
        
        // Fetch progress data for all courses this student is enrolled in
        for (const course of (studentCourseMap.get(studentId) || [])) {
          try {
            const progressDoc = await getDoc(doc(db, "studentProgress", studentId, "courses", course.courseId));
            
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
          } catch (err) {
            console.error(`Error fetching progress for student ${studentId} in course ${course.courseId}:`, err);
          }
        }
        
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
      
      return await Promise.all(studentPromises);
    } catch (error) {
      console.error("Error fetching students by teacher:", error);
      return [];
    }
  };

  // Fetch detailed statistics for a specific course
  const fetchCourseStats = async (courseId) => {
    try {
      console.log(`Fetching stats for course: ${courseId}`);
      
      // Get enrollments for this course
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("courseId", "==", courseId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const studentCount = enrollmentsSnapshot.docs.length;
      
      // Extract student IDs
      const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
      
      // Initialize statistics
      let totalScore = 0;
      let totalCompletion = 0;
      let activeLast7Days = 0;
      let activeLast30Days = 0;
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Fetch progress data for all students
      for (const studentId of studentIds) {
        try {
          const progressDoc = await getDoc(doc(db, "studentProgress", studentId, "courses", courseId));
          
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
        } catch (err) {
          console.error(`Error fetching progress for student ${studentId} in course ${courseId}:`, err);
        }
      }
      
      // Get course assignments
      const assignmentsQuery = query(collection(db, "courses", courseId, "assignments"));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignmentCount = assignmentsSnapshot.docs.length;
      
      // Calculate averages
      return {
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
  };

  const value = {
    students,
    courseData,
    loading,
    error,
    fetchTeacherCourses,
    fetchStudentsByTeacher,
    fetchCourseStats
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};