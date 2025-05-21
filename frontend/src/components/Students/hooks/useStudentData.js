import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { db } from '../../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import debugLogger from '../../../utils/debugLogger';

export const useStudentData = (studentId) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const navigate = useNavigate();
  
  const { 
    fetchStudentAssignments,
    fetchModuleProgress,
    currentUser 
  } = useData();

  useEffect(() => {
    const loadStudentData = async () => {
      if (!studentId) {
        setError("No student ID provided");
        navigate('/students');
        return;
      }

      setLoading(true);
      setDebugInfo({});
      
      // Track request counts for debugging
      let requestCount = 0;
      let startTime = performance.now();
      
      // Wrapper for Firestore operations to track network requests
      const trackRequest = async (operation, description) => {
        console.log(`Starting ${description}...`);
        const start = performance.now();
        requestCount++;
        try {
          const result = await operation();
          const end = performance.now();
          console.log(`${description} completed in ${(end-start).toFixed(2)}ms`);
          return result;
        } catch (error) {
          console.error(`${description} failed:`, error);
          throw error;
        }
      };
      
      console.log('==================== STUDENT DATA DEBUG LOG ====================');
      console.log(`Starting to load student data for ID: ${studentId} at ${new Date().toISOString()}`);
      console.time('loadStudentData-total');
        try {        // Student document
        debugLogger.logDebug('useStudentData', 'Fetching student', { studentId });
        const studentDoc = await trackRequest(
          () => getDoc(doc(db, 'students', studentId)), 
          `Fetching student document with ID ${studentId}`
        );
          if (!studentDoc.exists()) {
          debugLogger.logError('useStudentData', 'Student document', new Error("Student not found"));
          throw new Error("Student not found");
        }
        
        const studentData = studentDoc.data();
        debugLogger.logDebug('useStudentData', 'Student data fetched', studentData);
        setDebugInfo(prev => ({ ...prev, studentData }));

        // User data
        if (!studentData.userId) {
          throw new Error("Student document missing userId field");
        }

        const userDoc = await trackRequest(
          () => getDoc(doc(db, 'users', studentData.userId)),
          `Fetching user document with ID ${studentData.userId}`
        );
        
        if (!userDoc.exists()) {
          throw new Error(`User data not found for ID: ${studentData.userId}`);
        }
        
        const userData = userDoc.data();
        setDebugInfo(prev => ({ ...prev, userData }));

        // Enrollments
        const enrollmentsRef = collection(db, 'enrollments');
        const enrollmentsQuery = query(enrollmentsRef, where('studentId', '==', studentId));
        const enrollmentsSnapshot = await trackRequest(
          () => getDocs(enrollmentsQuery),
          `Fetching enrollments for student ID ${studentId}`
        );
        
        const enrollments = enrollmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDebugInfo(prev => ({ ...prev, enrollments }));
        
        // Course data 
        const coursesData = await Promise.all(
          enrollments.map(async (enrollment) => {
            try {
              // Course details
              const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
              if (!courseDoc.exists()) return null;
              
              const courseData = courseDoc.data();

              // Course progress
              const courseProgressPath = `studentProgress/${studentId}/courses/${enrollment.courseId}`;
              const courseProgressDoc = await getDoc(doc(db, courseProgressPath));
              const courseProgress = courseProgressDoc.exists() ? courseProgressDoc.data() : {};
              const courseSummary = courseProgress.summary || {};

              // Modules
              const modulesRef = collection(db, `courses/${enrollment.courseId}/modules`);
              const modulesSnapshot = await getDocs(modulesRef);
              const modules = modulesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Module progress
              const modulesData = await Promise.all(
                modules.map(async (module) => {
                  const moduleProgressPath = `studentProgress/${studentId}/courses/${enrollment.courseId}/modules/${module.id}`;
                  const moduleProgressDoc = await getDoc(doc(db, moduleProgressPath));
                  const moduleProgress = moduleProgressDoc.exists() ? moduleProgressDoc.data() : {};
                  
                  return {
                    ...module,
                    progress: moduleProgress
                  };
                })
              );

              // Assignments
              const assignmentsRef = collection(db, `courses/${enrollment.courseId}/assignments`);
              const assignmentsSnapshot = await getDocs(assignmentsRef);
              const assignments = assignmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Assignment progress
              const assignmentsData = await Promise.all(
                assignments.map(async (assignment) => {
                  const assignmentProgressPath = `studentProgress/${studentId}/courses/${enrollment.courseId}/assignments/${assignment.id}`;
                  const assignmentProgressDoc = await getDoc(doc(db, assignmentProgressPath));
                  const assignmentProgress = assignmentProgressDoc.exists() ? assignmentProgressDoc.data() : {};
                  
                  return {
                    ...assignment,
                    progress: assignmentProgress
                  };
                })
              );
              
              return {
                id: enrollment.courseId,
                ...courseData,
                enrollment: enrollment,
                summary: courseSummary,
                modules: modulesData,
                assignments: assignmentsData
              };
            } catch (err) {
              console.error(`Error processing course ${enrollment.courseId}:`, err);
              return null;
            }
          })
        );
        
        // Filter out any null courses
        const validCoursesData = coursesData.filter(Boolean);
        setDebugInfo(prev => ({ ...prev, coursesData: validCoursesData }));

        // Calculate overall metrics
        let totalScore = 0;
        let totalCompletion = 0;
        let courseCount = 0;
        let lastAccessed = null;

        validCoursesData.forEach(course => {
          if (course.summary) {
            if (course.summary.overallScore !== undefined) {
              totalScore += course.summary.overallScore;
            }
            if (course.summary.overallCompletion !== undefined) {
              totalCompletion += course.summary.overallCompletion;
            }
            if (course.summary.lastAccessed) {
              try {
                const accessDate = course.summary.lastAccessed.toDate ? 
                  new Date(course.summary.lastAccessed.toDate()) : 
                  new Date(course.summary.lastAccessed);
                
                if (!lastAccessed || accessDate > lastAccessed) {
                  lastAccessed = accessDate;
                }
              } catch (e) {
                console.error('Error parsing date:', e);
              }
            }
            courseCount++;
          }
        });        // Calculate averages
        const averageScore = courseCount > 0 ? totalScore / courseCount : 0;
        const completionRate = courseCount > 0 ? totalCompletion / courseCount : 0;

        // Process courses data to ensure date fields are consistent
        const processedCoursesData = validCoursesData.map(course => {
          // Process course-level dates
          const processedCourse = { ...course };
          
          // Ensure course summary has proper date format
          if (processedCourse.summary?.lastAccessed) {
            try {
              if (typeof processedCourse.summary.lastAccessed.toDate === 'function') {
                processedCourse.summary.lastAccessed = processedCourse.summary.lastAccessed.toDate().toISOString();
              } else if (typeof processedCourse.summary.lastAccessed === 'string') {
                // Already a string, check if it's a valid date string
                new Date(processedCourse.summary.lastAccessed);
              } else {
                // Convert to ISO string if it's a valid date object
                processedCourse.summary.lastAccessed = new Date().toISOString();
              }
            } catch (e) {
              processedCourse.summary.lastAccessed = new Date().toISOString();
              console.error('Error processing course lastAccessed date:', e);
            }
          }
          
          // Process modules
          if (Array.isArray(processedCourse.modules)) {
            processedCourse.modules = processedCourse.modules.map(module => {
              const processedModule = { ...module };
              if (processedModule.progress?.lastAccessed) {
                try {
                  if (typeof processedModule.progress.lastAccessed.toDate === 'function') {
                    processedModule.progress.lastAccessed = processedModule.progress.lastAccessed.toDate().toISOString();
                  }
                } catch (e) {
                  console.error('Error processing module lastAccessed date:', e);
                }
              }
              return processedModule;
            });
          }
          
          // Process assignments
          if (Array.isArray(processedCourse.assignments)) {
            processedCourse.assignments = processedCourse.assignments.map(assignment => {
              const processedAssignment = { ...assignment };
              if (processedAssignment.progress?.submittedAt) {
                try {
                  if (typeof processedAssignment.progress.submittedAt.toDate === 'function') {
                    processedAssignment.progress.submittedAt = processedAssignment.progress.submittedAt.toDate().toISOString();
                  }
                } catch (e) {
                  console.error('Error processing assignment submittedAt date:', e);
                }
              }
              return processedAssignment;
            });
          }
          
          return processedCourse;
        });        // Import the enhanced risk assessment
        const { getEnhancedRiskAssessment } = await import('../../../services/riskPredictionService');
        
        // Calculate missing assignments
        let missingAssignments = 0;
        let submittedAssignments = 0;
        
        processedCoursesData.forEach(course => {
          course.assignments?.forEach(assignment => {
            if (!assignment.progress?.submittedAt) {
              missingAssignments++;
            } else {
              submittedAssignments++;
            }
          });
        });
        
        // Calculate days since last access
        let daysSinceLastAccess = 0;
        if (lastAccessed) {
          const lastAccessDate = typeof lastAccessed === 'string' ? new Date(lastAccessed) : 
                              typeof lastAccessed.toDate === 'function' ? lastAccessed.toDate() : lastAccessed;
          daysSinceLastAccess = Math.floor((new Date() - lastAccessDate) / (1000 * 60 * 60 * 24));
        }
        
        // Calculate submission rate
        const totalAssignments = missingAssignments + submittedAssignments;
        const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
        
        // Data for risk assessment
        const studentDataForRisk = {
          averageScore,
          completionRate,
          submissionRate,
          missingAssignments,
          daysSinceLastAccess,
          courses: processedCoursesData,
          lastAccessed: lastAccessed ? 
            (typeof lastAccessed.toISOString === 'function' ? lastAccessed.toISOString() : lastAccessed) : 
            new Date().toISOString()
        };
        
        // Get risk assessment from ML model with fallback to rule-based
        const riskAssessment = await getEnhancedRiskAssessment(studentDataForRisk, true);
        
        // Final student object
        const enrichedStudentData = {
          id: studentId,
          userId: studentData.userId,
          firstName: userData.firstName || 'Unknown',
          lastName: userData.lastName || 'Unknown',
          email: userData.email || '',
          gender: userData.gender || 'Not specified',
          courses: processedCoursesData,
          averageScore,
          completionRate,
          submissionRate,
          missingAssignments,
          daysSinceLastAccess,
          lastAccessed: lastAccessed ? 
            (typeof lastAccessed.toISOString === 'function' ? lastAccessed.toISOString() : lastAccessed) : 
            new Date().toISOString(),
          courseCount: processedCoursesData.length,
          isAtRisk: riskAssessment.isAtRisk,
          riskScore: riskAssessment.score,
          riskLevel: riskAssessment.level,
          riskReasons: riskAssessment.factors
        };

        setDebugInfo(prev => ({ ...prev, finalStudentObject: enrichedStudentData }));
        setStudent(enrichedStudentData);      } catch (err) {
        debugLogger.logError('useStudentData', 'Loading student data', err);
        setError(`Error loading student data: ${err.message}`);
        setDebugInfo(prev => ({ ...prev, error: err.message, errorStack: err.stack }));
      } finally {
        // Calculate final load time
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        setDebugInfo(prev => ({ 
          ...prev, 
          loadTime,
          requestCount,
          timing: {
            totalLoadTime: loadTime,
            avgRequestTime: requestCount > 0 ? loadTime / requestCount : 0
          }
        }));
        
        setLoading(false);
        console.timeEnd('loadStudentData-total');
          // Log final student data
        if (student) {
          debugLogger.logDebug('useStudentData', 'Final student data', { 
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            courses: Array.isArray(student.courses) ? 
              `${student.courses.length} courses found` : 'No courses array',
            averageScore: student.averageScore,
            completionRate: student.completionRate
          });
        } else {
          debugLogger.logDebug('useStudentData', 'No student data set', null);
        }
        
        console.log(`Finished loading student data at ${new Date().toISOString()}`);
        console.log('=============================================================');
      }
    };
  
    loadStudentData();
  }, [studentId, navigate, fetchStudentAssignments, fetchModuleProgress, currentUser]);

  return { student, loading, error, debugInfo };
};
