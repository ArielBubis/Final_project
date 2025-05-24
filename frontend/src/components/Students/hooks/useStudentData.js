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
  
  const { currentUser } = useData();

  useEffect(() => {
    const loadStudentData = async () => {
      if (!studentId) {
        setError("No student ID provided");
        navigate('/students');
        return;
      }

      setLoading(true);
      setDebugInfo({});
      
      let requestCount = 0;
      let startTime = performance.now();
      
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
        
      try {
        // UPDATED: Get student from users collection instead of students collection
        debugLogger.logDebug('useStudentData', 'Fetching user data', { studentId });
        const userDoc = await trackRequest(
          () => getDoc(doc(db, 'users', studentId)), 
          `Fetching user document with ID ${studentId}`
        );
          
        if (!userDoc.exists()) {
          debugLogger.logError('useStudentData', 'User document', new Error("Student user not found"));
          throw new Error("Student user not found");
        }
        
        const userData = userDoc.data();
        debugLogger.logDebug('useStudentData', 'User data fetched', userData);
        
        // Verify this is actually a student
        if (userData.role !== 'student') {
          throw new Error(`User ${studentId} is not a student (role: ${userData.role})`);
        }
        
        setDebugInfo(prev => ({ ...prev, userData }));

        // Get student enrollments to find courses
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
        
        if (enrollments.length === 0) {
          console.log(`No enrollments found for student ${studentId}`);
          // Still create a basic student object
          const basicStudentData = {
            id: studentId,
            userId: studentId,
            firstName: userData.firstName || 'Unknown',
            lastName: userData.lastName || 'Unknown',
            email: userData.email || '',
            gender: userData.gender || 'Not specified',
            gradeLevel: userData.gradeLevel || null,
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
          
          setStudent(basicStudentData);
          setDebugInfo(prev => ({ ...prev, finalStudentObject: basicStudentData }));
          return;
        }
        
        // Course data processing
        const coursesData = await Promise.all(
          enrollments.map(async (enrollment) => {
            try {
              // Get course details
              const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
              if (!courseDoc.exists()) return null;
              
              const courseData = courseDoc.data();

              // Get student course summary for this course
              const summaryDoc = await getDoc(doc(db, 'studentCourseSummaries', `${studentId}_${enrollment.courseId}`));
              const courseSummary = summaryDoc.exists() ? summaryDoc.data() : {
                overallScore: 0,
                completionRate: 0,
                totalTimeSpent: 0,
                lastAccessed: new Date()
              };

              // Get modules for this course
              const modulesRef = collection(db, `courses/${enrollment.courseId}/modules`);
              const modulesSnapshot = await getDocs(modulesRef);
              const modules = modulesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Get assignments for this course
              const assignmentsRef = collection(db, `courses/${enrollment.courseId}/assignments`);
              const assignmentsSnapshot = await getDocs(assignmentsRef);
              const assignments = assignmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Get student assignment progress
              const assignmentsData = await Promise.all(
                assignments.map(async (assignment) => {
                  try {
                    const progressDoc = await getDoc(doc(db, 'studentAssignments', `${studentId}_${assignment.id}`));
                    const progress = progressDoc.exists() ? progressDoc.data() : null;
                    
                    // Debug logging for assignment progress
                    console.log(`Assignment ${assignment.title || assignment.id}:`, {
                      hasProgress: !!progress,
                      submittedAt: progress?.submittedAt,
                      submissionDate: progress?.submissionDate,
                      score: progress?.totalScore || progress?.currentScore
                    });
                    
                    return {
                      ...assignment,
                      progress: progress
                    };
                  } catch (err) {
                    console.error(`Error getting assignment progress for ${assignment.id}:`, err);
                    return {
                      ...assignment,
                      progress: null
                    };
                  }
                })
              );
              
              // Get student module progress for this course
              const moduleProgressData = await Promise.all(
                modules.map(async (module) => {
                  try {
                    const moduleProgressDoc = await getDoc(doc(db, 'studentModuleProgress', `${studentId}_${module.id}`));
                    const moduleProgress = moduleProgressDoc.exists() ? moduleProgressDoc.data() : {
                      completion: 0,
                      totalExpertiseRate: 0,
                      lastAccessed: null
                    };
                    
                    return {
                      ...module,
                      progress: moduleProgress
                    };
                  } catch (err) {
                    console.error(`Error getting module progress for ${module.id}:`, err);
                    return {
                      ...module,
                      progress: {
                        completion: 0,
                        totalExpertiseRate: 0,
                        lastAccessed: null
                      }
                    };
                  }
                })
              );

              return {
                id: enrollment.courseId,
                ...courseData,
                enrollment: enrollment,
                summary: courseSummary,
                modules: moduleProgressData, // Use actual progress data
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
        let totalTimeSpent = 0;
        let courseCount = 0;
        let lastAccessed = null;
        let submittedAssignments = 0;
        let totalAssignments = 0;

        validCoursesData.forEach(course => {
          if (course.summary) {
            if (course.summary.overallScore !== undefined) {
              totalScore += course.summary.overallScore;
            }
            if (course.summary.completionRate !== undefined) {
              totalCompletion += course.summary.completionRate;
            }
            if (course.summary.totalTimeSpent) {
              totalTimeSpent += course.summary.totalTimeSpent;
            }
            if (course.summary.lastAccessed) {
              const accessDate = course.summary.lastAccessed.toDate ? 
                course.summary.lastAccessed.toDate() : 
                new Date(course.summary.lastAccessed);
              
              if (!lastAccessed || accessDate > lastAccessed) {
                lastAccessed = accessDate;
              }
            }
            courseCount++;
          }
          
          // Count assignments
          if (course.assignments) {
            totalAssignments += course.assignments.length;
            submittedAssignments += course.assignments.filter(a => a.progress?.submissionDate).length;
          }
        });

        // Calculate metrics
        const averageScore = courseCount > 0 ? totalScore / courseCount : 0;
        const completionRate = courseCount > 0 ? totalCompletion / courseCount : 0;
        const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
        const missingAssignments = totalAssignments - submittedAssignments;
        
        // Calculate days since last access
        let daysSinceLastAccess = 0;
        if (lastAccessed) {
          daysSinceLastAccess = Math.floor((new Date() - lastAccessed) / (1000 * 60 * 60 * 24));
        }
        
        // Import risk assessment function
        const { getEnhancedRiskAssessment } = await import('../../../services/riskPredictionService');
        
        // Data for risk assessment
        const studentDataForRisk = {
          averageScore,
          completionRate,
          submissionRate,
          missingAssignments,
          daysSinceLastAccess,
          courses: validCoursesData,
          lastAccessed: lastAccessed ? lastAccessed.toISOString() : new Date().toISOString()
        };
        
        // Get risk assessment
        const riskAssessment = await getEnhancedRiskAssessment(studentDataForRisk, true);
        
        // Final student object
        const enrichedStudentData = {
          id: studentId,
          userId: studentId,
          firstName: userData.firstName || 'Unknown',
          lastName: userData.lastName || 'Unknown',
          email: userData.email || '',
          gender: userData.gender || 'Not specified',
          gradeLevel: userData.gradeLevel || null,
          courses: validCoursesData,
          averageScore,
          completionRate,
          submissionRate,
          missingAssignments,
          daysSinceLastAccess,
          totalTimeSpent,
          lastAccessed: lastAccessed ? lastAccessed.toISOString() : new Date().toISOString(),
          courseCount: validCoursesData.length,
          isAtRisk: riskAssessment.isAtRisk,
          riskScore: riskAssessment.score,
          riskLevel: riskAssessment.level,
          riskReasons: riskAssessment.factors
        };

        setDebugInfo(prev => ({ ...prev, finalStudentObject: enrichedStudentData }));
        setStudent(enrichedStudentData);
        
      } catch (err) {
        debugLogger.logError('useStudentData', 'Loading student data', err);
        setError(`Error loading student data: ${err.message}`);
        setDebugInfo(prev => ({ ...prev, error: err.message, errorStack: err.stack }));
      } finally {
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
  }, [studentId, navigate, currentUser]);

  return { student, loading, error, debugInfo };
};