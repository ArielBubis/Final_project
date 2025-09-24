import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { Button, Card, Progress, Spin, Alert, Statistic, Tabs, Tag, Row, Col } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  ClockCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { getStudentName } from '../utils/studentUtils';
import CourseList from '../components/features/courses/CourseList';
import StudentList from '../components/features/students/StudentList';
import MLRiskStudentList from '../components/features/students/MLRiskStudentList';
import ModelSelector from '../components/common/ModelSelector';
import styles from '../styles/modules/MainPage.module.css';
import { getEnhancedRiskAssessment, checkHealth } from '../services/riskPredictionService';
import { FEATURE_FLAGS } from '../config/featureFlags';

const MainPage = () => {
    // const { currentUser, userRole } = useAuth();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const {
        fetchTeacherCourses,
        fetchStudentsByTeacher,
        fetchStudentDetailsCached,
        fetchCourseStats,
        fetchTeacherDashboard,
        loading: dataLoading,
        error: dataError,
        clearCache
    } = useData();
    
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [dashboardData, setDashboardData] = useState(null); // NEW: Store dashboard data
    const [mlRiskStudents, setMlRiskStudents] = useState([]);
    const [mlLoading, setMlLoading] = useState(false);
    const [mlError, setMlError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [mlServiceStatus, setMlServiceStatus] = useState(null);
    const [selectedModel, setSelectedModel] = useState(null);

    // UPDATED: Dashboard metrics derived from fetched data with fallbacks
    const dashboardMetrics = useMemo(() => {
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
        
        // Count assignments
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
    }, [courses, students, dashboardData]);

    // Function to refresh data
    const handleRefresh = () => {
        // Clear relevant caches
        clearCache('teacherCourses');
        clearCache('studentsByTeacher');
        clearCache('courseStats');
        clearCache('teacherDashboard'); // NEW: Clear dashboard cache
        // Trigger re-fetch by updating the key
        setRefreshKey(prev => prev + 1);
    };

    const getMlRiskPredictions = async (studentList, modelId = null) => {
        setMlLoading(true);
        setMlError(null);
        try {
            console.log('Getting ML risk predictions for', studentList.length, 'students', 
                      modelId ? `using model ${modelId}` : 'using default model');
            
            // Process students with ML predictions - fetch detailed data for each student
            const studentsWithPredictions = await Promise.all(
                studentList.map(async (student) => {
                    try {
                        // Fetch detailed student data with course and assignment information
                        console.log(`Fetching detailed data for student ${student.id}...`);
                        const detailedStudent = await fetchStudentDetailsCached(student.id);
                        
                        if (!detailedStudent) {
                            console.warn(`No detailed data found for student ${student.id}`);
                            return {
                                ...student,
                                mlRiskScore: 0,
                                mlRiskLevel: 'unknown',
                                mlRiskFactors: ['Student data not found'],
                                mlIsAtRisk: false,
                                skippedReason: 'Student not found'
                            };
                        }
                        
                        // Build payload matching backend expectations: courses[].assignments[].progress
                        // Derive numeric grade level safely (avoid letter grades like 'A')
                        const rawGradeLevel = detailedStudent.gradeLevel ?? student.gradeLevel ?? 12;
                        let numericGradeLevel = 12;
                        if (typeof rawGradeLevel === 'number') {
                            numericGradeLevel = rawGradeLevel;
                        } else if (typeof rawGradeLevel === 'string') {
                            const parsed = parseInt(rawGradeLevel, 10);
                            if (!isNaN(parsed)) numericGradeLevel = parsed; // ignore letters like 'A'
                        }

                        const studentData = {
                            studentId: detailedStudent.id,
                            studentName: detailedStudent.firstName && detailedStudent.lastName 
                                ? `${detailedStudent.firstName} ${detailedStudent.lastName}` 
                                : student.name,
                            gradeLevel: numericGradeLevel,
                            averageScore: Number(detailedStudent.averageScore || 0),
                            completionRate: Number(detailedStudent.completionRate || 0),
                            courses: (detailedStudent.courses || []).map(course => ({
                                id: course.id,
                                name: course.courseName || course.name,
                                assignments: (course.assignments || []).map(assignment => ({
                                    // Map the detailed assignment progress structure
                                    progress: {
                                        totalScore: Number(assignment.progress?.totalScore ?? 0),
                                        totalTime: Number(assignment.progress?.totalTime ?? 0),
                                        isLate: Boolean(assignment.progress?.isLate ?? false)
                                    }
                                }))
                            }))
                        };
                        
                        // Debug logging
                        console.log(`Student ${student.id} (${studentData.studentName}) detailed data:`, {
                            courseCount: studentData.courses.length,
                            courses: studentData.courses.map(c => ({
                                id: c.id,
                                name: c.name,
                                assignmentCount: c.assignments.length
                            })),
                            averageScore: studentData.averageScore,
                            completionRate: studentData.completionRate
                        });
                        
                        // Skip students with no course data
                        if (studentData.courses.length === 0) {
                            console.warn(`Skipping student ${student.id} - no course data`);
                            return {
                                ...student,
                                // Preserve detailed student data for name information
                                name: detailedStudent.firstName && detailedStudent.lastName 
                                    ? `${detailedStudent.firstName} ${detailedStudent.lastName}` 
                                    : student.name,
                                firstName: detailedStudent.firstName || student.firstName,
                                lastName: detailedStudent.lastName || student.lastName,
                                mlRiskScore: 0,
                                mlRiskLevel: 'unknown',
                                mlRiskFactors: ['No course data available'],
                                mlIsAtRisk: false,
                                skippedReason: 'No course data'
                            };
                        }
                        
                        // Check if any course has assignments with valid data
                        const hasValidAssignments = studentData.courses.some(course => 
                            course.assignments && course.assignments.length > 0
                        );
                        
                        if (!hasValidAssignments) {
                            console.warn(`Student ${student.id} has courses but no assignment data`);
                            return {
                                ...student,
                                // Preserve detailed student data for name information
                                name: detailedStudent.firstName && detailedStudent.lastName 
                                    ? `${detailedStudent.firstName} ${detailedStudent.lastName}` 
                                    : student.name,
                                firstName: detailedStudent.firstName || student.firstName,
                                lastName: detailedStudent.lastName || student.lastName,
                                courses: detailedStudent.courses || student.courses || [],
                                mlRiskScore: 0,
                                mlRiskLevel: 'unknown',
                                mlRiskFactors: ['No assignment data available'],
                                mlIsAtRisk: false,
                                skippedReason: 'No assignment data'
                            };
                        }
                        
                        const riskAssessment = await getEnhancedRiskAssessment(studentData, true, modelId);
                        
                        return {
                            ...student,
                            // Preserve detailed student data for name and course information
                            name: detailedStudent.firstName && detailedStudent.lastName 
                                ? `${detailedStudent.firstName} ${detailedStudent.lastName}` 
                                : student.name,
                            firstName: detailedStudent.firstName || student.firstName,
                            lastName: detailedStudent.lastName || student.lastName,
                            courses: detailedStudent.courses || student.courses || [],
                            // Add ML risk assessment results
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

    const handleModelChange = async (newModel) => {
        setSelectedModel(newModel);
        
        // Re-run ML predictions with the new model if we have students
        if (students.length > 0) {
            await getMlRiskPredictions(students, newModel?.id);
        }
    };

    useEffect(() => {
    const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
        // Health check for ML service (non-blocking)
        checkHealth().then(res => setMlServiceStatus(res));
                
                console.log('MainPage: Starting data fetch for user:', currentUser?.email);
                
                // NEW: Try to get pre-computed dashboard data first
                // FIXED: Now properly handles UID-to-teacher-ID mapping in DataContext
                let teacherDashboard = null;
                if (currentUser?.uid) {
                    try {
                        // The fetchTeacherDashboard function now handles UID-to-teacher-ID lookup
                        teacherDashboard = await fetchTeacherDashboard(currentUser.uid);
                        console.log('Dashboard data loaded:', teacherDashboard);
                        setDashboardData(teacherDashboard);
                    } catch (dashboardErr) {
                        console.log('No dashboard data found, will calculate metrics manually');
                    }
                }
                  // Fetch teacher's courses
                console.log('Fetching teacher courses...');
                const teacherCourses = await fetchTeacherCourses(currentUser?.uid);
                console.log('Found courses:', teacherCourses?.length || 0);
                
                if (!teacherCourses || teacherCourses.length === 0) {
                    console.log('No courses found for teacher');
                    setCourses([]);
                    setStudents([]);
                    return;
                }
                
                // Fetch course stats for each course
                console.log('Fetching course stats...');
                const coursesWithStats = await Promise.all(
                    teacherCourses.map(async (course) => {
                        try {
                            const stats = await fetchCourseStats(course.id);
                            return {
                                id: course.id,
                                name: course.courseName || course.name,
                                description: course.description || 'No description available',
                                studentCount: stats?.studentCount || 0,
                                progress: Math.round(stats?.averageCompletion || 0), // For CourseList compatibility
                                averageCompletion: Math.round(stats?.averageCompletion || 0),
                                averageScore: Math.round(stats?.averageScore || 0),
                                lastUpdated: course.updatedAt || new Date().toISOString(),
                                activeStudentsLast7Days: stats?.activeStudentsLast7Days || 0,
                                activeRatio7Days: stats?.activeRatio7Days || 0,
                                assignmentCount: stats?.assignmentCount || 0,
                                moduleCount: stats?.moduleCount || 0,
                            };
                        } catch (err) {
                            console.error(`Error fetching stats for course ${course.id}:`, err);
                            return {
                                id: course.id,
                                name: course.courseName || course.name,
                                description: course.description || 'No description available',
                                studentCount: 0,
                                progress: 0,
                                averageCompletion: 0,
                                averageScore: 0,
                                lastUpdated: new Date().toISOString(),
                                activeStudentsLast7Days: 0,
                                activeRatio7Days: 0,
                                assignmentCount: 0,
                                moduleCount: 0,
                            };
                        }
                    })
                );
                
                console.log('Courses with stats:', coursesWithStats.length);
                  // Fetch students for the teacher
                console.log('Fetching students...');
                const teacherStudents = await fetchStudentsByTeacher(currentUser?.uid);
                console.log('Found students:', teacherStudents?.length || 0);
                
                // Students are now pre-formatted by DataContext, no need for transformation here
                const formattedStudents = teacherStudents || [];

                setCourses(coursesWithStats);
                setStudents(formattedStudents);
                setError(null);
                
                // Get ML risk predictions for students
                if (formattedStudents.length > 0) {
                    try {
                        const modelId = FEATURE_FLAGS.ENABLE_MULTI_MODEL ? selectedModel?.id : null;
                        await getMlRiskPredictions(formattedStudents, modelId);
                    } catch (mlError) {
                        console.error('Error getting ML risk predictions:', mlError);
                        setMlError('Failed to process ML risk predictions');
                    }
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to fetch data: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.email) {
            fetchData();
        } else {
            console.log('No current user email available');
            setLoading(false);
        }
    }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats, fetchTeacherDashboard, refreshKey]);

    if (loading || dataLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" />
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    if (error || dataError) {
        return (
            <div className={styles.errorContainer}>
                <Alert
                    message="Error Loading Dashboard"
                    description={error || dataError || "There was a problem loading your dashboard data. Please try again."}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" type="primary" onClick={handleRefresh}>
                            Retry
                        </Button>
                    }
                />
            </div>
        );
    }

    // Handle tab change
    const handleTabChange = (key) => {
        setSelectedTab(key);
    };

        return (
        <div className={styles.mainPage}>
            <div className={styles.dashboardHeader}>
                <div className={styles.welcomeSection}>
                    <h1>{t("Mainpage", "Welcome")}, {currentUser?.displayName || 'Teacher'}</h1>
                    <p className={styles.lastUpdated}>
                        {t("Mainpage", "Last updated")}: {new Date().toLocaleString()}
                        <Button
                            type="text"
                            size="small"
                            onClick={handleRefresh}
                            className={styles.refreshButton}
                        >
                            {t("Mainpage", "refresh")}
                        </Button>
                    </p>
                                        {mlServiceStatus && !mlServiceStatus.ok && (
                                            <Alert 
                                                type="warning" 
                                                showIcon 
                                                message="ML service unavailable - showing fallback scores where needed" 
                                                style={{ marginTop: 8 }}
                                            />
                                        )}
                </div>
            </div>

            {/* Dashboard Metrics */}
            {dashboardMetrics && (
                <div className={styles.metricsContainer}>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title={t("Mainpage", "Courses")}
                            value={dashboardMetrics.totalCourses}
                            prefix={<BookOutlined />}
                        />
                    </Card>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title={t("Mainpage", "Students")}
                            value={dashboardMetrics.totalStudents}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                    {/* <Card className={styles.metricCard}>
                        <Statistic
                            title={t("Mainpage", "Avg. completion")}
                            value={dashboardMetrics.avgCompletion}
                            suffix="%"
                        />
                        <Progress
                            percent={dashboardMetrics.avgCompletion}
                            showInfo={false}
                            status="active"
                            strokeColor={{
                                '0%': '#108ee9',
                                '100%': '#87d068',
                            }}
                        />
                    </Card> */}
                    <Card className={styles.metricCard}>
                        <Statistic
                            title={t("Mainpage", "Active Atudents")}
                            value={dashboardMetrics.activeStudents}
                            suffix={`/${dashboardMetrics.totalStudents}`}
                        />
                        <Progress
                            percent={dashboardMetrics.activeStudentsPercentage}
                            showInfo={false}
                        />
                    </Card>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title={t("Mainpage", "Upcoming Assigments")}
                            value={dashboardMetrics.upcomingAssignments}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </div>
            )}

            {/* Main Dashboard Content */}
            <div className={styles.dashboardContent}>
                <Tabs 
                    defaultActiveKey="overview"
                    activeKey={selectedTab}
                    onChange={handleTabChange}
                    className={styles.dashboardTabs}
                >
                    <Tabs.TabPane tab={t("Mainpage", "Overview")} key="overview">
                        <div className={styles.tabContent}>
                            <div className={styles.mainSections}>
                                {/* Courses Section */}
                                <div className={styles.section}>
                                    <CourseList
                                        courses={courses}
                                        title={t("Mainpage", "Courses")}
                                    />
                                </div>

                                {/* Students Section */}
                                <div className={styles.section}>
                                    <StudentList
                                        students={students}
                                        title={t("Mainpage", "Students")}
                                    />
                                </div>
                            </div>
                        </div>
                    </Tabs.TabPane>
                    
                    <Tabs.TabPane 
                        tab={
                            <span>
                                <RobotOutlined /> {t("Mainpage", "ML Risk analysis")}
                                {mlRiskStudents.length > 0 && (
                                    <Tag color="red" style={{ marginLeft: '8px' }}>
                                        {mlRiskStudents.length}
                                    </Tag>
                                )}
                            </span>
                        }
                        key="mlRisk"
                    >
                        <div className={styles.tabContent}>
                            <Row gutter={16}>
                                {FEATURE_FLAGS.ENABLE_MULTI_MODEL && (
                                    <Col xs={24} md={8}>
                                        <ModelSelector 
                                            onModelChange={handleModelChange}
                                            disabled={mlLoading}
                                        />
                                    </Col>
                                )}
                                <Col xs={24} md={FEATURE_FLAGS.ENABLE_MULTI_MODEL ? 16 : 24}>
                                    <Card
                                        title={
                                            <div className={styles.riskCardTitle}>
                                                <RobotOutlined /> {t("Mainpage", "ML Risk analysis")}
                                                {FEATURE_FLAGS.ENABLE_MULTI_MODEL && selectedModel && (
                                                    <Tag color="blue" style={{ marginLeft: '8px' }}>
                                                        {selectedModel.name}
                                                    </Tag>
                                                )}
                                            </div>
                                        }
                                        className={styles.riskCard}
                                    >
                                        <MLRiskStudentList 
                                            students={mlRiskStudents} 
                                            loading={mlLoading}
                                            error={mlError}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </div>
        </div>
    );
};

export default MainPage;