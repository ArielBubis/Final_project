import { useMemo } from 'react';

/**
 * Custom hook for calculating dashboard metrics from course and student data
 * 
 * @param {Object|null} dashboardData - Pre-computed dashboard data from backend
 * @param {Array} courses - Array of course objects
 * @param {Array} students - Array of student objects
 * @returns {Object|null} Dashboard metrics object with calculated statistics
 */
export const useDashboardMetrics = (dashboardData, courses, students) => {
    return useMemo(() => {
        // First try to use pre-computed dashboard data
        if (dashboardData) {
            return {
                totalCourses: dashboardData.totalCourses || 0,
                totalStudents: dashboardData.totalStudents || 0,
                avgCompletion: Math.round(dashboardData.averageCompletionRate || 0),
                // avgPerformance: Math.round(dashboardData.averageScore || 0),
                activeStudents: dashboardData.totalActiveStudents || 0,
                activeStudentsPercentage: dashboardData.totalStudents > 0 ? 
                    Math.round((dashboardData.totalActiveStudents / dashboardData.totalStudents) * 100) : 0,
                upcomingAssignments: dashboardData.upcomingAssignmentCount || 0
            };
        }
        
        // Fallback to calculated metrics if no dashboard data
        if (!courses.length && !students.length) return null;
        
        // Calculate average course completion - FIXED: use averageCompletion instead of progress
        const avgCompletion = courses.length > 0 ? 
            courses.reduce((sum, course) => sum + (course.averageCompletion || course.progress || 0), 0) / courses.length : 0;
        
        // Calculate average student performance - FIXED: handle scores object properly
        const avgPerformance = students.length > 0 ? 
            students.reduce((sum, student) => sum + (student.performance || student.scores?.average || 0), 0) / students.length : 0;
        
        // Count active students in the last 7 days - FIXED: handle date parsing
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const activeStudents = students.filter(student => {
            try {
                const lastActiveDate = new Date(student.lastActive || student.lastAccessed);
                return lastActiveDate >= sevenDaysAgo;
            } catch (e) {
                return false; // Invalid date
            }
        }).length;
        
        // Count assignments - FIXED: use assignmentCount from course stats
        const upcomingAssignments = courses.reduce((count, course) =>
            count + (course.assignmentCount || course.upcomingAssignments || 0), 0);
            
        return {
            totalCourses: courses.length,
            totalStudents: students.length,
            avgCompletion: Math.round(avgCompletion),
            avgPerformance: Math.round(avgPerformance),
            activeStudents,
            activeStudentsPercentage: students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0,
            upcomingAssignments
        };
    }, [dashboardData, courses, students]);
};