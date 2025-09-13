// import React, { useState, useEffect, useMemo } from 'react';
// import { useAuth } from '../contexts/AuthContext';
// import { useLanguage } from '../contexts/LanguageContext';
// import { useData } from '../contexts/DataContext';
// import { usePerformance } from '../contexts/PerformanceContext';
// import { Button, Card, Progress, Spin, Alert, Statistic, Tabs, Empty, Tag } from 'antd';
// import {
//   UserOutlined,
//   BookOutlined,
//   ClockCircleOutlined,
//   WarningOutlined,
//   RobotOutlined,
// } from '@ant-design/icons';
// import CourseList from './Courses/CourseList';
// import StudentList from './Students/StudentList';
// import MLRiskStudentList from './Students/components/MLRiskStudentList';
// import { formatTimestampForDisplay } from '../utils/firebaseUtils';
// import styles from '../styles/modules/MainPage.module.css';
// import { getEnhancedRiskAssessment, checkHealth, isMlServiceAvailable } from '../services/riskPredictionService';

// const MainPage = () => {
//     const { currentUser, userRole } = useAuth();
//     const { t } = useLanguage();
//     const {
//         fetchTeacherCourses,
//         fetchStudentsByTeacher,
//         fetchCourseStats,
//         fetchTeacherDashboard,
//         loading: dataLoading,
//         error: dataError,
//         clearCache
//     } = useData();
//     const { getTeacherAnalytics } = usePerformance();
    
//     const [courses, setCourses] = useState([]);
//     const [students, setStudents] = useState([]);
//     const [dashboardData, setDashboardData] = useState(null);
//     const [analytics, setAnalytics] = useState(null);
//     const [atRiskStudents, setAtRiskStudents] = useState([]);
//     const [mlRiskStudents, setMlRiskStudents] = useState([]);
//     const [mlLoading, setMlLoading] = useState(false);
//     const [mlError, setMlError] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [refreshKey, setRefreshKey] = useState(0);
//     const [selectedTab, setSelectedTab] = useState('overview');
//     const [mlServiceStatus, setMlServiceStatus] = useState(null);

//     // Dashboard metrics derived from fetched data with fallbacks
//     const dashboardMetrics = useMemo(() => {
//         // First try to use pre-computed dashboard data
//         if (dashboardData) {
//             return {
//                 totalCourses: dashboardData.totalCourses || 0,
//                 totalStudents: dashboardData.totalStudents || 0,
//                 avgCompletion: Math.round(dashboardData.averageCompletionRate || 0),
//                 activeStudents: dashboardData.totalActiveStudents || 0,
//                 activeStudentsPercentage: dashboardData.totalStudents > 0 ? 
//                     Math.round((dashboardData.totalActiveStudents / dashboardData.totalStudents) * 100) : 0,
//                 upcomingAssignments: dashboardData.upcomingAssignmentCount || 0
//             };
//         }
        
//         // Fallback to calculated metrics if no dashboard data
//         if (!courses.length && !students.length) return null;
        
//         // Calculate average course completion
//         const avgCompletion = courses.length > 0 ? 
//             courses.reduce((sum, course) => sum + (course.averageCompletion || course.progress || 0), 0) / courses.length : 0;
        
//         // Calculate average student performance
//         const avgPerformance = students.length > 0 ? 
//             students.reduce((sum, student) => sum + (student.performance || student.scores?.average || 0), 0) / students.length : 0;
        
//         // Count active students in the last 7 days
//         const now = new Date();
//         const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
//         const activeStudents = students.filter(student => {
//             try {
//                 const lastActiveDate = new Date(student.lastActive || student.lastAccessed);
//                 return lastActiveDate >= sevenDaysAgo;
//             } catch (e) {
//                 return false;
//             }
//         }).length;
        
//         // Count assignments
//         const upcomingAssignments = courses.reduce((count, course) =>
//             count + (course.assignmentCount || course.upcomingAssignments || 0), 0);
            
//         return {
//             totalCourses: courses.length,
//             totalStudents: students.length,
//             avgCompletion: Math.round(avgCompletion),
//             avgPerformance: Math.round(avgPerformance),
//             activeStudents,
//             activeStudentsPercentage: students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0,
//             upcomingAssignments
//         };
//     }, [courses, students, dashboardData]);

//     // Function to refresh data
//     const handleRefresh = () => {
//         // Clear relevant caches
//         clearCache('teacherCourses');
//         clearCache('studentsByTeacher');
//         clearCache('courseStats');
//         clearCache('teacherDashboard');
//         // Trigger re-fetch by updating the key
//         setRefreshKey(prev => prev + 1);
//     };

//     // Helper function to calculate grade based on score
//     const calculateGrade = (score) => {
//         if (score >= 90) return 'A';
//         if (score >= 80) return 'B';
//         if (score >= 70) return 'C';
//         if (score >= 60) return 'D';
//         return 'F';
//     };

//     // Helper function to calculate risk score with better logic
//     const calculateRiskScore = (student) => {
//         let score = 0;
        
//         // Low performance increases risk
//         const avgScore = student.scores?.average || 0;
//         if (avgScore < 50) score += 40;
//         else if (avgScore < 60) score += 30;
//         else if (avgScore < 70) score += 15;
        
//         // Low completion increases risk
//         const completion = student.completion || 0;
//         if (completion < 30) score += 35;
//         else if (completion < 50) score += 25;
//         else if (completion < 70) score += 10;
        
//         // Recent inactivity increases risk
//         try {
//             const lastAccess = new Date(student.lastAccessed || new Date());
//             const daysSinceLastAccess = Math.floor((new Date() - lastAccess) / (1000 * 60 * 60 * 24));
            
//             if (daysSinceLastAccess > 21) score += 25;
//             else if (daysSinceLastAccess > 14) score += 20;
//             else if (daysSinceLastAccess > 7) score += 10;
//         } catch (e) {
//             // Invalid date, add some risk
//             score += 15;
//         }
        
//         return Math.min(score, 100); // Cap at 100
//     };

//     // Function to get ML risk predictions for students
//     const getMlRiskPredictions = async (studentList) => {
//         setMlLoading(true);
//         setMlError(null);
//         try {
//             console.log('Getting ML risk predictions for', studentList.length, 'students');
            
//             // Process students with ML predictions
//             const studentsWithPredictions = await Promise.all(
//                 studentList.map(async (student) => {
//                     try {
//                         // Build payload matching backend expectations
//                         const rawGradeLevel = student.gradeLevel ?? student.gradeLevelNumeric ?? student.gradeLevelNum ?? student.grade;
//                         let numericGradeLevel = 12;
//                         if (typeof rawGradeLevel === 'number') {
//                             numericGradeLevel = rawGradeLevel;
//                         } else if (typeof rawGradeLevel === 'string') {
//                             const parsed = parseInt(rawGradeLevel, 10);
//                             if (!isNaN(parsed)) numericGradeLevel = parsed;
//                         }

//                         const studentData = {
//                             studentId: student.id,
//                             studentName: student.name,
//                             gradeLevel: numericGradeLevel,
//                             averageScore: Number(student.performance || student.scores?.average || 0),
//                             completionRate: Number(student.completion || student.completionRate || 0),
//                             courses: (student.courses || []).map(course => ({
//                                 id: course.id,
//                                 name: course.name || course.courseName,
//                                 assignments: (course.assignments || []).map(a => ({
//                                     progress: {
//                                         totalScore: Number(a.progress?.totalScore ?? a.score ?? 0),
//                                         totalTime: Number(a.progress?.totalTime ?? a.timeSpent ?? 0),
//                                         isLate: Boolean(a.progress?.isLate ?? a.isLate ?? false)
//                                     }
//                                 }))
//                             }))
//                         };
                        
//                         const riskAssessment = await getEnhancedRiskAssessment(studentData, true);
                        
//                         return {
//                             ...student,
//                             mlRiskScore: riskAssessment.score,
//                             mlRiskLevel: riskAssessment.level,
//                             mlRiskFactors: riskAssessment.factors || [],
//                             mlIsAtRisk: riskAssessment.isAtRisk
//                         };
//                     } catch (err) {
//                         console.error(`Failed to get ML prediction for student ${student.id}:`, err);
//                         return student;
//                     }
//                 })
//             );
            
//             // Sort by ML risk
//             const riskStudents = studentsWithPredictions
//                 .filter(s => s.mlRiskScore !== undefined)
//                 .sort((a, b) => b.mlRiskScore - a.mlRiskScore);
                
//             console.log('Found', riskStudents.length, 'students at risk according to ML model');
//             setMlRiskStudents(riskStudents);
            
//             if (riskStudents.length === 0 && studentsWithPredictions.length > 0) {
//                 setMlError('No students identified as at-risk by the ML model');
//             }
//         } catch (err) {
//             console.error('Error processing ML risk predictions:', err);
//             setMlError('Failed to process ML risk predictions: ' + err.message);
//         } finally {
//             setMlLoading(false);
//         }
//     };

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 setError(null);
                
//                 // Health check for ML service (non-blocking)
//                 checkHealth().then(res => setMlServiceStatus(res));
                
//                 console.log('MainPage: Starting optimized data fetch for user:', currentUser?.email);
                
//                 // Try to get pre-computed dashboard data first
//                 let teacherDashboard = null;
//                 if (currentUser?.uid) {
//                     try {
//                         teacherDashboard = await fetchTeacherDashboard(currentUser.uid);
//                         console.log('Dashboard data loaded:', teacherDashboard);
//                         setDashboardData(teacherDashboard);
//                     } catch (dashboardErr) {
//                         console.log('No dashboard data found, will calculate metrics manually');
//                     }
//                 }
                
//                 // Fetch teacher's courses and students in parallel
//                 console.log('Fetching teacher courses and students in parallel...');
//                 const [teacherCourses, teacherStudents] = await Promise.all([
//                     fetchTeacherCourses(currentUser?.uid),
//                     fetchStudentsByTeacher(currentUser?.uid)
//                 ]);
                
//                 console.log('Found courses:', teacherCourses?.length || 0);
//                 console.log('Found students:', teacherStudents?.length || 0);
                
//                 if (!teacherCourses || teacherCourses.length === 0) {
//                     console.log('No courses found for teacher');
//                     setCourses([]);
//                     setStudents([]);
//                     setAtRiskStudents([]);
//                     return;
//                 }
                
//                 // Batch fetch course stats for all courses
//                 console.log('Fetching course stats in batch...');
//                 const coursesWithStats = await Promise.all(
//                     teacherCourses.map(async (course) => {
//                         try {
//                             const stats = await fetchCourseStats(course.id);
//                             return {
//                                 id: course.id,
//                                 name: course.courseName || course.name,
//                                 description: course.description || 'No description available',
//                                 studentCount: stats?.studentCount || 0,
//                                 progress: Math.round(stats?.averageCompletion || 0),
//                                 averageCompletion: Math.round(stats?.averageCompletion || 0),
//                                 averageScore: Math.round(stats?.averageScore || 0),
//                                 lastUpdated: course.updatedAt || new Date().toISOString(),
//                                 activeStudentsLast7Days: stats?.activeStudentsLast7Days || 0,
//                                 activeRatio7Days: stats?.activeRatio7Days || 0,
//                                 assignmentCount: stats?.assignmentCount || 0,
//                                 moduleCount: stats?.moduleCount || 0,
//                             };
//                         } catch (err) {
//                             console.error(`Error fetching stats for course ${course.id}:`, err);
//                             return {
//                                 id: course.id,
//                                 name: course.courseName || course.name,
//                                 description: course.description || 'No description available',
//                                 studentCount: 0,
//                                 progress: 0,
//                                 averageCompletion: 0,
//                                 averageScore: 0,
//                                 lastUpdated: new Date().toISOString(),
//                                 activeStudentsLast7Days: 0,
//                                 activeRatio7Days: 0,
//                                 assignmentCount: 0,
//                                 moduleCount: 0,
//                             };
//                         }
//                     })
//                 );
                
//                 console.log('Courses with stats:', coursesWithStats.length);
                
//                 // Process students data
//                 const formattedStudents = (teacherStudents || []).map(student => ({
//                     id: student.id || student.studentId,
//                     name: `${student.firstName || 'Unknown'} ${student.lastName || 'Student'}`,
//                     firstName: student.firstName || 'Unknown',
//                     lastName: student.lastName || 'Student',
//                     email: student.email || '',
//                     grade: calculateGrade(student.scores?.average || 0),
//                     attendance: Math.round(student.attendance || 95),
//                     lastActive: student.lastAccessed || new Date().toISOString(),
//                     performance: Math.round(student.scores?.average || 0),
//                     completion: Math.round(student.completion || 0),
//                     scores: student.scores || { average: 0 },
//                     riskScore: calculateRiskScore(student),
//                     courses: student.courses || []
//                 }));
                
//                 setCourses(coursesWithStats);
//                 setStudents(formattedStudents);
                
//                 // Filter at-risk students (traditional method)
//                 const atRisk = formattedStudents.filter(student => 
//                     student.riskScore >= 50 || student.performance < 60 || student.completion < 50
//                 );
//                 setAtRiskStudents(atRisk);
                
//                 console.log('Set students:', formattedStudents.length);
//                 console.log('At-risk students (traditional):', atRisk.length);
                
//                 // If ML service is available, get ML risk predictions
//                 if (isMlServiceAvailable() && formattedStudents.length > 0) {
//                     await getMlRiskPredictions(formattedStudents);
//                 }
                
//                 // Get performance analytics if available
//                 try {
//                     const performanceData = await getTeacherAnalytics(currentUser?.uid);
//                     setAnalytics(performanceData);
//                 } catch (analyticsErr) {
//                     console.log('Analytics not available:', analyticsErr.message);
//                 }
                
//             } catch (err) {
//                 console.error('Error fetching dashboard data:', err);
//                 setError(err.message);
//             } finally {
//                 setLoading(false);
//             }
//         };
        
//         if (currentUser) {
//             fetchData();
//         }
//     }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats, fetchTeacherDashboard, getTeacherAnalytics, refreshKey]);

//     if (loading || dataLoading) {
//         return (
//             <div className={styles.loadingContainer}>
//                 <Spin size="large" />
//                 <p>Loading your dashboard...</p>
//             </div>
//         );
//     }

//     if (error || dataError) {
//         return (
//             <div className={styles.errorContainer}>
//                 <Alert
//                     message="Error Loading Dashboard"
//                     description={error || dataError || "There was a problem loading your dashboard data. Please try again."}
//                     type="error"
//                     showIcon
//                     action={
//                         <Button type="primary" onClick={handleRefresh}>
//                             Retry
//                         </Button>
//                     }
//                 />
//             </div>
//         );
//     }

//     // If no data available
//     if (!dashboardMetrics) {
//         return (
//             <div className={styles.emptyState}>
//                 <Empty
//                     description="No dashboard data available"
//                     image={Empty.PRESENTED_IMAGE_SIMPLE}
//                 >
//                     <Button type="primary" onClick={handleRefresh}>
//                         Refresh Data
//                     </Button>
//                 </Empty>
//             </div>
//         );
//     }

//     return (
//         <div className={styles.mainPageContainer}>
//             {/* Dashboard Header */}
//             <div className={styles.dashboardHeader}>
//                 <div className={styles.headerContent}>
//                     <h1>{t("Mainpage", "Teacher Dashboard")}</h1>
//                     <div className={styles.headerActions}>
//                         <Button onClick={handleRefresh} loading={loading}>
//                             {t("common", "Refresh")}
//                         </Button>
//                     </div>
//                 </div>
//             </div>

//             {/* Metrics Cards */}
//             <div className={styles.metricsGrid}>
//                 <Card className={styles.metricCard}>
//                     <Statistic
//                         title={t("Mainpage", "Total Courses")}
//                         value={dashboardMetrics.totalCourses}
//                         prefix={<BookOutlined />}
//                     />
//                 </Card>
//                 <Card className={styles.metricCard}>
//                     <Statistic
//                         title={t("Mainpage", "Total Students")}
//                         value={dashboardMetrics.totalStudents}
//                         prefix={<UserOutlined />}
//                     />
//                 </Card>
//                 <Card className={styles.metricCard}>
//                     <Statistic
//                         title={t("Mainpage", "Active Students (7 days)")}
//                         value={dashboardMetrics.activeStudents}
//                         suffix={`(${dashboardMetrics.activeStudentsPercentage}%)`}
//                         prefix={<ClockCircleOutlined />}
//                     />
//                 </Card>
//                 <Card className={styles.metricCard}>
//                     <Statistic
//                         title={t("Mainpage", "Average Completion")}
//                         value={dashboardMetrics.avgCompletion}
//                         suffix="%"
//                         prefix={<BookOutlined />}
//                     />
//                 </Card>
//             </div>

//             {/* Content Tabs */}
//             <div className={styles.contentContainer}>
//                 <Tabs
//                     activeKey={selectedTab}
//                     onChange={setSelectedTab}
//                     className={styles.contentTabs}
//                 >
//                     <Tabs.TabPane tab={t("Mainpage", "Overview")} key="overview">
//                         <div className={styles.tabContent}>
//                             <div className={styles.overviewGrid}>
//                                 <Card
//                                     title={t("Mainpage", "My Courses")}
//                                     className={styles.courseListCard}
//                                     extra={
//                                         <Tag color="blue">
//                                             {courses.length} {t("common", "courses")}
//                                         </Tag>
//                                     }
//                                 >
//                                     <CourseList courses={courses} />
//                                 </Card>
                                
//                                 <Card
//                                     title={t("Mainpage", "At-Risk Students")}
//                                     className={styles.atRiskCard}
//                                     extra={
//                                         <Tag color="orange">
//                                             {atRiskStudents.length} {t("common", "students")}
//                                         </Tag>
//                                     }
//                                 >
//                                     <StudentList students={atRiskStudents} />
//                                 </Card>
//                             </div>
//                         </div>
//                     </Tabs.TabPane>
                    
//                     <Tabs.TabPane 
//                         tab={
//                             <span>
//                                 <WarningOutlined />
//                                 {t("Mainpage", "At-Risk Students")}
//                             </span>
//                         } 
//                         key="at-risk"
//                     >
//                         <div className={styles.tabContent}>
//                             <Card
//                                 title={
//                                     <div className={styles.atRiskCardTitle}>
//                                         <WarningOutlined /> {t("Mainpage", "Traditional Risk Analysis")}
//                                         <Tag color="orange">{atRiskStudents.length} students</Tag>
//                                     </div>
//                                 }
//                                 className={styles.atRiskCard}
//                             >
//                                 <StudentList students={atRiskStudents} />
//                             </Card>
//                         </div>
//                     </Tabs.TabPane>
                    
//                     <Tabs.TabPane 
//                         tab={
//                             <span>
//                                 <RobotOutlined />
//                                 {t("Mainpage", "ML Risk Analysis")}
//                             </span>
//                         } 
//                         key="ml-risk"
//                     >
//                         <div className={styles.tabContent}>
//                             <Card
//                                 title={
//                                     <div className={styles.riskCardTitle}>
//                                         <RobotOutlined /> {t("Mainpage", "ML Risk analysis")}
//                                     </div>
//                                 }
//                                 className={styles.riskCard}
//                             >
//                                 <MLRiskStudentList 
//                                     students={mlRiskStudents} 
//                                     loading={mlLoading}
//                                     error={mlError}
//                                 />
//                             </Card>
//                         </div>
//                     </Tabs.TabPane>
//                 </Tabs>
//             </div>
//         </div>
//     );
// };

// export default MainPage;
