import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { getEnhancedRiskAssessment } from '../../../services/riskPredictionService';

/**
 * Optimized student data hook that uses the cached DataContext function
 * instead of making individual Firebase calls
 */
export const useStudentDataOptimized = (studentId) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const navigate = useNavigate();
  
  const { fetchStudentDetailsCached } = useData();

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
      
      const startTime = performance.now();
      console.log(`=== OPTIMIZED STUDENT DATA LOAD START: ${studentId} ===`);
      console.time('loadStudentDataOptimized');
        
      try {
        // Use the cached function from DataContext - this makes minimal Firebase calls
        const studentData = await fetchStudentDetailsCached(studentId);
        
        if (!studentData) {
          throw new Error("Student not found");
        }
        
        // Add risk assessment if not already present
        if (!studentData.isAtRisk && !studentData.riskScore) {
          try {
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
            
            studentData.isAtRisk = riskAssessment.isAtRisk;
            studentData.riskScore = riskAssessment.score;
            studentData.riskLevel = riskAssessment.level;
            studentData.riskReasons = riskAssessment.factors;
          } catch (riskError) {
            console.warn('Failed to get risk assessment:', riskError);
            // Keep the default risk values from the cached data
          }
        }
        
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        setDebugInfo({
          loadTime,
          source: 'optimized-cache',
          requestCount: 1, // Only one call to the cached function
          timing: {
            totalLoadTime: loadTime,
            avgRequestTime: loadTime
          },
          finalStudentObject: studentData
        });
        
        setStudent(studentData);
        
        console.log(`Optimized student data loaded in ${loadTime.toFixed(2)}ms`);
        
      } catch (err) {
        console.error('Error loading student data (optimized):', err);
        setError(`Error loading student data: ${err.message}`);
        setDebugInfo(prev => ({ 
          ...prev, 
          error: err.message, 
          errorStack: err.stack,
          source: 'optimized-cache-error'
        }));
      } finally {
        setLoading(false);
        console.timeEnd('loadStudentDataOptimized');
        console.log(`=== OPTIMIZED STUDENT DATA LOAD END: ${studentId} ===`);
      }
    };
  
    loadStudentData();
  }, [studentId, navigate, fetchStudentDetailsCached]);

  return { student, loading, error, debugInfo };
};

export default useStudentDataOptimized;
