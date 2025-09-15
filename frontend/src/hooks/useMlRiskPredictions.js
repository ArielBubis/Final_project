import { useState } from 'react';
import { getEnhancedRiskAssessment } from '../services/riskPredictionService';

/**
 * Custom hook for managing ML risk predictions
 * Handles async ML risk assessment operations and state management
 * 
 * @returns {Object} Hook state and functions
 * @returns {Array} mlRiskStudents - Array of students with ML risk predictions
 * @returns {boolean} mlLoading - Loading state for ML operations
 * @returns {string|null} mlError - Error message if ML operation fails
 * @returns {Function} getMlRiskPredictions - Function to get ML risk predictions for student list
 * @returns {Function} setMlRiskStudents - Direct setter for ML risk students (for external updates)
 * @returns {Function} setMlError - Direct setter for ML error state (for external updates)
 */
export const useMlRiskPredictions = () => {
    const [mlRiskStudents, setMlRiskStudents] = useState([]);
    const [mlLoading, setMlLoading] = useState(false);
    const [mlError, setMlError] = useState(null);

    /**
     * Get ML risk predictions for a list of students
     * Processes each student through the ML risk assessment service
     * 
     * @param {Array} studentList - Array of student objects to assess
     * @returns {Promise<void>} Updates hook state with results
     */
    const getMlRiskPredictions = async (studentList) => {
        setMlLoading(true);
        setMlError(null);
        
        try {
            console.log('Getting ML risk predictions for', studentList.length, 'students');
            
            // Process students with ML predictions
            const studentsWithPredictions = await Promise.all(
                studentList.map(async (student) => {
                    try {
                        // Build payload matching backend expectations: courses[].assignments[].progress
                        // Derive numeric grade level safely (avoid letter grades like 'A')
                        const rawGradeLevel = student.gradeLevel ?? student.gradeLevelNumeric ?? student.gradeLevelNum ?? student.grade;
                        let numericGradeLevel = 12;
                        if (typeof rawGradeLevel === 'number') {
                            numericGradeLevel = rawGradeLevel;
                        } else if (typeof rawGradeLevel === 'string') {
                            const parsed = parseInt(rawGradeLevel, 10);
                            if (!isNaN(parsed)) numericGradeLevel = parsed; // ignore letters like 'A'
                        }

                        const studentData = {
                            studentId: student.id,
                            studentName: student.name,
                            gradeLevel: numericGradeLevel,
                            averageScore: Number(student.performance || student.scores?.average || 0),
                            completionRate: Number(student.completion || student.completionRate || 0),
                            courses: (student.courses || []).map(course => ({
                                id: course.id,
                                name: course.name || course.courseName,
                                assignments: (course.assignments || []).map(a => ({
                                    // Only send minimal required progress structure
                                    progress: {
                                        totalScore: Number(a.progress?.totalScore ?? a.score ?? 0),
                                        totalTime: Number(a.progress?.totalTime ?? a.timeSpent ?? 0),
                                        isLate: Boolean(a.progress?.isLate ?? a.isLate ?? false)
                                    }
                                }))
                            }))
                        };
                        
                        // Debug: log key fields for validation
                        // console.debug('ML payload', { studentId: student.id, gradeLevel: numericGradeLevel, courseCount: studentData.courses.length });
                        
                        const riskAssessment = await getEnhancedRiskAssessment(studentData, true);
                        
                        return {
                            ...student,
                            mlRiskScore: riskAssessment.score,
                            mlRiskLevel: riskAssessment.level,
                            mlRiskFactors: riskAssessment.factors || [],
                            mlIsAtRisk: riskAssessment.isAtRisk
                        };
                    } catch (err) {
                        console.error(`Failed to get ML prediction for student ${student.id}:`, err);
                        // Return student with original risk assessment if ML prediction fails
                        return student;
                    }
                })
            );
            
            // Do not pre-filter low risk here; let downstream component decide. Sort by ML risk.
            const riskStudents = studentsWithPredictions
                .filter(s => s.mlRiskScore !== undefined)
                .sort((a, b) => b.mlRiskScore - a.mlRiskScore);
                
            console.log('Found', riskStudents.length, 'students at risk according to ML model');
            setMlRiskStudents(riskStudents);
            
            // If no at-risk students were found but we have predictions
            if (riskStudents.length === 0 && studentsWithPredictions.length > 0) {
                setMlError('No students identified as at-risk by the ML model');
            }
        } catch (err) {
            console.error('Error processing ML risk predictions:', err);
            setMlError('Failed to process ML risk predictions: ' + err.message);
        } finally {
            setMlLoading(false);
        }
    };

    return {
        mlRiskStudents,
        mlLoading,
        mlError,
        getMlRiskPredictions,
        setMlRiskStudents,
        setMlError
    };
};