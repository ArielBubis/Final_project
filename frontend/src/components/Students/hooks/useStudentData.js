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
  
  const { fetchStudentDetailsCached, currentUser } = useData();

  useEffect(() => {
    const loadStudentData = async () => {
      if (!studentId) {
        setError("No student ID provided");
        navigate('/students');
        return;
      }

      setLoading(true);
      setError(null);
      setDebugInfo({});
      
      let requestCount = 0;
      const startTime = performance.now();
      
      console.log('==================== ENHANCED STUDENT DATA DEBUG LOG ====================');
      console.log(`Loading student data for ID: ${studentId} at ${new Date().toISOString()}`);
      console.time('loadStudentDataEnhanced');
        
      try {
        // First try the optimized cached approach from DataContext
        console.log('Attempting optimized cache approach...');
        requestCount++;
        
        const studentData = await fetchStudentDetailsCached(studentId);
        
        if (!studentData) {
          throw new Error("Student not found");
        }
        
        console.log('Successfully loaded student data from optimized cache');
        
        // Enhance with risk assessment if needed
        if (studentData.isAtRisk === false && studentData.riskScore === 0 && studentData.courses.length > 0) {
          try {
            console.log('Computing risk assessment...');
            requestCount++;
            
            const { getEnhancedRiskAssessment } = await import('../../../services/riskPredictionService');
            
            const riskData = {
              averageScore: studentData.averageScore,
              completionRate: studentData.completionRate,
              submissionRate: studentData.submissionRate,
              missingAssignments: studentData.missingAssignments,
              daysSinceLastAccess: studentData.daysSinceLastAccess,
              courses: studentData.courses,
              lastAccessed: studentData.lastAccessed
            };
            
            const riskAssessment = await getEnhancedRiskAssessment(riskData, true);
            
            // Update student data with risk assessment
            studentData.isAtRisk = riskAssessment.isAtRisk;
            studentData.riskScore = riskAssessment.score;
            studentData.riskLevel = riskAssessment.level;
            studentData.riskReasons = riskAssessment.factors;
            
            console.log(`Risk assessment completed: ${riskAssessment.level} risk (${riskAssessment.score})`);
          } catch (riskError) {
            console.warn('Failed to get risk assessment, using defaults:', riskError);
            // Keep the default risk values from the cached data
          }
        }
        
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        setDebugInfo({
          loadTime,
          requestCount,
          source: 'enhanced-optimized-cache',
          cacheHit: true,
          timing: {
            totalLoadTime: loadTime,
            avgRequestTime: requestCount > 0 ? loadTime / requestCount : 0
          },
          courseCount: studentData.courses.length,
          assignmentCount: studentData.courses.reduce((acc, course) => acc + (course.assignments?.length || 0), 0),
          moduleCount: studentData.courses.reduce((acc, course) => acc + (course.modules?.length || 0), 0),
          finalStudentObject: {
            id: studentData.id,
            name: `${studentData.firstName} ${studentData.lastName}`,
            courseCount: studentData.courses.length,
            averageScore: studentData.averageScore,
            completionRate: studentData.completionRate,
            riskLevel: studentData.riskLevel
          }
        });
        
        setStudent(studentData);
        
        debugLogger.logDebug('useStudentData', 'Student data loaded successfully', {
          id: studentData.id,
          name: `${studentData.firstName} ${studentData.lastName}`,
          courses: `${studentData.courses.length} courses`,
          averageScore: studentData.averageScore,
          riskLevel: studentData.riskLevel,
          loadTime: `${loadTime.toFixed(2)}ms`
        });
        
      } catch (err) {
        console.error('Enhanced student data loading failed:', err);
        debugLogger.logError('useStudentData', 'Failed to load student data', err);
        
        // Fallback to the original comprehensive method if the optimized approach fails
        console.log('Falling back to original comprehensive method...');
        try {
          const fallbackResult = await loadStudentDataFallback();
          // Update request count with fallback requests
          requestCount += fallbackResult?.fallbackRequestCount || 0;
        } catch (fallbackErr) {
          console.error('Fallback method also failed:', fallbackErr);
          setError(`Error loading student data: ${fallbackErr.message}`);
          setDebugInfo(prev => ({ 
            ...prev, 
            error: fallbackErr.message, 
            errorStack: fallbackErr.stack,
            source: 'fallback-failed',
            originalError: err.message,
            requestCount
          }));
        }
      } finally {
        setLoading(false);
        console.timeEnd('loadStudentDataEnhanced');
        console.log(`=== ENHANCED STUDENT DATA LOAD END: ${studentId} ===`);
      }
    };

    // Fallback method using the original comprehensive approach
    const loadStudentDataFallback = async () => {
      console.log('Using fallback method with direct Firebase calls...');
      
      let fallbackRequestCount = 0;
      
      const trackRequest = async (operation, description) => {
        console.log(`Starting ${description}...`);
        const start = performance.now();
        fallbackRequestCount++;
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

      // Get student from users collection
      debugLogger.logDebug('useStudentData', 'Fallback: Fetching user data', { studentId });
      const userDoc = await trackRequest(
        () => getDoc(doc(db, 'users', studentId)), 
        `Fallback: Fetching user document with ID ${studentId}`
      );
        
      if (!userDoc.exists()) {
        debugLogger.logError('useStudentData', 'Fallback: User document', new Error("Student user not found"));
        throw new Error("Student user not found");
      }
      
      const userData = userDoc.data();
      debugLogger.logDebug('useStudentData', 'Fallback: User data fetched', userData);
      
      // Verify this is actually a student
      if (userData.role !== 'student') {
        throw new Error(`User ${studentId} is not a student (role: ${userData.role})`);
      }

      // Get student enrollments
      const enrollmentsRef = collection(db, 'enrollments');
      const enrollmentsQuery = query(enrollmentsRef, where('studentId', '==', studentId));
      const enrollmentsSnapshot = await trackRequest(
        () => getDocs(enrollmentsQuery),
        `Fallback: Fetching enrollments for student ID ${studentId}`
      );
      
      const enrollments = enrollmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (enrollments.length === 0) {
        // Create basic student object
        let schoolName = 'N/A';
        if (userData.schoolId) {
          try {
            const schoolDoc = await getDoc(doc(db, 'schools', userData.schoolId));
            if (schoolDoc.exists()) {
              schoolName = schoolDoc.data().name || 'N/A';
            }
          } catch (error) {
            console.error(`Error fetching school data: ${error}`);
          }
        }
        
        const basicStudentData = {
          id: studentId,
          userId: studentId,
          firstName: userData.firstName || 'Unknown',
          lastName: userData.lastName || 'Unknown',
          email: userData.email || '',
          gender: userData.gender || 'Not specified',
          gradeLevel: userData.gradeLevel || null,
          schoolId: userData.schoolId || null,
          schoolName: schoolName,
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
        setDebugInfo(prev => ({ ...prev, finalStudentObject: basicStudentData, source: 'fallback-basic' }));
        return;
      }

      // Process courses (comprehensive version from original code)
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
                  const moduleProgressDoc = await getDoc(doc(db, 'studentModules', `${studentId}_${module.id}`));
                  const moduleProgress = moduleProgressDoc.exists() ? moduleProgressDoc.data() : {
                    completionRate: 0,
                    moduleScore: 0,
                    lastActivity: null
                  };
                  
                  // Debug logging for module progress
                  console.log(`Module ${module.title || module.id}:`, {
                    hasProgress: moduleProgressDoc.exists(),
                    completionRate: moduleProgress.completionRate,
                    moduleScore: moduleProgress.moduleScore,
                    lastActivity: moduleProgress.lastActivity
                  });
                  
                  // Transform to match frontend expectations (same as original useStudentData)
                  return {
                    ...module,
                    progress: {
                      completion: moduleProgress.completionRate || 0,
                      totalExpertiseRate: moduleProgress.moduleScore || 0,
                      lastAccessed: moduleProgress.lastActivity || null,
                      totalTimeSpent: moduleProgress.totalTimeSpent || 0
                    }
                  };
                } catch (err) {
                  console.error(`Error getting module progress for ${module.id}:`, err);
                  return {
                    ...module,
                    progress: {
                      completion: 0,
                      totalExpertiseRate: 0,
                      lastAccessed: null,
                      totalTimeSpent: 0
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
              modules: moduleProgressData,
              assignments: assignmentsData
            };
          } catch (err) {
            console.error(`Error processing course ${enrollment.courseId}:`, err);
            return null;
          }
        })
      );

      // Filter valid courses and calculate metrics (from original code)
      const validCoursesData = coursesData.filter(course => {
        const isValid = course && 
          course.summary && 
          typeof course.summary.overallScore === 'number' && 
          course.summary.overallScore > 0;
        
        if (!isValid) {
          console.log(`useStudentData: Filtering out course - valid: ${!!course}, hasValidScore: ${course?.summary?.overallScore}`);
        }
        
        return isValid;
      });
      
      console.log(`useStudentData: Filtered ${coursesData.length} courses down to ${validCoursesData.length} valid courses`);

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

      // Get school name
      let schoolName = 'N/A';
      if (userData.schoolId) {
        try {
          const schoolDoc = await getDoc(doc(db, 'schools', userData.schoolId));
          if (schoolDoc.exists()) {
            schoolName = schoolDoc.data().name || 'N/A';
          }
        } catch (error) {
          console.error(`Error fetching school data: ${error}`);
        }
      }

      // Import and calculate risk assessment
      const { getEnhancedRiskAssessment } = await import('../../../services/riskPredictionService');
      
      const studentDataForRisk = {
        averageScore,
        completionRate,
        submissionRate,
        missingAssignments,
        daysSinceLastAccess,
        courses: validCoursesData,
        lastAccessed: lastAccessed ? lastAccessed.toISOString() : new Date().toISOString()
      };
      
      const riskAssessment = await getEnhancedRiskAssessment(studentDataForRisk, true);

      const fallbackStudentData = {
        id: studentId,
        userId: studentId,
        firstName: userData.firstName || 'Unknown',
        lastName: userData.lastName || 'Unknown',
        email: userData.email || '',
        gender: userData.gender || 'Not specified',
        gradeLevel: userData.gradeLevel || null,
        schoolId: userData.schoolId || null,
        schoolName: schoolName,
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

      setStudent(fallbackStudentData);
      setDebugInfo(prev => ({ 
        ...prev, 
        finalStudentObject: fallbackStudentData,
        source: 'fallback-complete',
        fallbackRequestCount: fallbackRequestCount,
        fallbackUsed: true
      }));

      // Return the request count for the main function to use
      return { fallbackRequestCount };
    };
  
    loadStudentData();
  }, [studentId, navigate, fetchStudentDetailsCached, currentUser]);

  return { student, loading, error, debugInfo };
};