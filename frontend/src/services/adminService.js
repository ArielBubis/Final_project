import { db, auth } from "../firebaseConfig";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc,
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";

/**
 * Fetches all teachers from Firestore
 * @returns {Promise<Array>} - List of teacher objects with their data
 */
export const fetchAllTeachers = async () => {
  try {
    // Query teachers collection
    const teachersSnapshot = await getDocs(collection(db, "teachers"));
    
    // Create an array of promises to fetch each teacher's user data
    const teacherPromises = teachersSnapshot.docs.map(async (teacherDoc) => {
      const teacherData = teacherDoc.data();
      const userId = teacherData.userId || teacherDoc.id;
      
      // Get corresponding user document for additional details
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Get courses for this teacher
      const teacherCourses = [];
      if (teacherData.courses && teacherData.courses.length > 0) {
        for (const courseId of teacherData.courses) {
          const courseDoc = await getDoc(doc(db, "courses", courseId));
          if (courseDoc.exists()) {
            teacherCourses.push({
              id: courseDoc.id,
              ...courseDoc.data()
            });
          }
        }
      }

      return {
        id: teacherDoc.id,
        ...teacherData,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        gender: userData.gender || "",
        courses: teacherCourses,
        courseCount: teacherCourses.length
      };
    });
    
    // Resolve all promises
    const teachers = await Promise.all(teacherPromises);
    return teachers;
  } catch (error) {
    console.error("Error fetching teachers:", error);
    throw error;
  }
};

/**
 * Creates a new teacher account with both Auth and Firestore records
 * @param {Object} teacherData - Teacher information
 * @returns {Promise<Object>} - Created teacher object
 */
export const createTeacher = async (teacherData) => {
  try {
    // Generate a temporary password
    const tempPassword = generateTemporaryPassword();
    
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      teacherData.email, 
      tempPassword
    );
    
    // Get the generated user ID
    const userId = userCredential.user.uid;
    
    // Create user record in Firestore
    await setDoc(doc(db, "users", userId), {
      userId: userId,
      firstName: teacherData.firstName,
      lastName: teacherData.lastName,
      email: teacherData.email,
      gender: teacherData.gender || "",
      roles: {
        student: false,
        teacher: true,
        admin: false
      },
      createdAt: serverTimestamp()
    });
    
    // Create teacher record in Firestore
    const teacherRef = doc(db, "teachers", userId);
    await setDoc(teacherRef, {
      teacherId: userId,
      userId: userId,
      schoolId: teacherData.schoolId || "",
      department: teacherData.department || "",
      title: teacherData.title || "",
      courses: []
    });
    
    // Send password reset email to let the teacher set their own password
    await sendPasswordResetEmail(auth, teacherData.email);
    
    return {
      id: userId,
      ...teacherData,
      tempPassword
    };
  } catch (error) {
    console.error("Error creating teacher account:", error);
    throw error;
  }
};

/**
 * Updates an existing teacher's information
 * @param {string} teacherId - ID of teacher to update
 * @param {Object} teacherData - Updated teacher information
 * @returns {Promise<void>}
 */
export const updateTeacher = async (teacherId, teacherData) => {
  try {
    // Update user record
    await updateDoc(doc(db, "users", teacherId), {
      firstName: teacherData.firstName,
      lastName: teacherData.lastName,
      gender: teacherData.gender || ""
    });
    
    // Update teacher record
    await updateDoc(doc(db, "teachers", teacherId), {
      department: teacherData.department || "",
      title: teacherData.title || "",
      schoolId: teacherData.schoolId || ""
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating teacher:", error);
    throw error;
  }
};

/**
 * Fetches all courses for admin reporting
 * @returns {Promise<Array>} - List of all courses with statistics
 */
export const fetchAllCourses = async () => {
  try {
    const coursesSnapshot = await getDocs(collection(db, "courses"));
    
    const coursesData = await Promise.all(coursesSnapshot.docs.map(async (doc) => {
      const courseData = doc.data();
      
      // Get enrollments for this course
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("courseId", "==", doc.id)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const studentCount = enrollmentsSnapshot.docs.length;
      
      // Get modules for this course
      const modulesQuery = query(
        collection(db, "courses", doc.id, "modules")
      );
      const modulesSnapshot = await getDocs(modulesQuery);
      
      // Get assignments for this course
      const assignmentsQuery = query(
        collection(db, "courses", doc.id, "assignments")
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      return {
        courseId: doc.id,
        courseName: courseData.courseName || "Unnamed Course",
        description: courseData.description || "",
        teacherId: courseData.teacherId || "",
        studentCount,
        moduleCount: modulesSnapshot.size,
        assignmentCount: assignmentsSnapshot.size,
        subjectArea: courseData.subjectArea || "",
        startDate: courseData.startDate,
        endDate: courseData.endDate
      };
    }));
    
    return coursesData;
  } catch (error) {
    console.error("Error fetching all courses:", error);
    throw error;
  }
};

/**
 * Helper function to generate a temporary password
 * @returns {string} - Generated temporary password
 */
const generateTemporaryPassword = () => {
  const length = 10;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};