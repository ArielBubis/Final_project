import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { Button, Card, Progress, Spin, Alert, Statistic, Tabs, Empty, Tag } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { getStudentName } from '../utils/studentUtils';
import CourseList from './features/courses/CourseList';
import StudentList from './features/students/StudentList';
import MLRiskStudentList from './features/students/MLRiskStudentList';
import { formatTimestampForDisplay } from '../utils/firebaseUtils';
import styles from '../styles/modules/MainPage.module.css';
import { checkHealth, isMlServiceAvailable } from '../services/riskPredictionService';
import { useMlRiskPredictions } from '../hooks/useMlRiskPredictions';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { calculateDashboardMetrics } from '../utils/dashboardCalculations';

const MainPage = () => {
    const { currentUser, userRole } = useAuth();
    const { t } = useLanguage();
    const {
        fetchTeacherCourses,
        fetchStudentsByTeacher,
        fetchStudentSummary,
        fetchCourseStats,
        fetchTeacherDashboard,
        loading: dataLoading,
        error: dataError
    } = useData();
    const { getTeacherAnalytics } = usePerformance();
    const { mlRiskStudents, mlLoading, mlError, getMlRiskPredictions, setMlError } = useMlRiskPredictions();
    const { refreshKey, handleRefresh } = useDataRefresh();
    
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [dashboardData, setDashboardData] = useState(null); // NEW: Store dashboard data
    const [analytics, setAnalytics] = useState(null);
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [mlServiceStatus, setMlServiceStatus] = useState(null);

    // Calculate dashboard metrics using the utility function
    const dashboardMetrics = useMemo(() => 
        calculateDashboardMetrics(dashboardData, courses, students), 
        [dashboardData, courses, students]
    );

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
                    setAtRiskStudents([]);
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
                
                // Fetch students for the teacher - using existing function which should be lightweight
                console.log('Fetching students...');
                const teacherStudents = await fetchStudentsByTeacher(currentUser?.uid);
                console.log('Found students:', teacherStudents?.length || 0);
                
                // Use the students as-is from fetchStudentsByTeacher (should already be formatted)
                const formattedStudents = teacherStudents || [];

                // Get teacher analytics if available
                let teacherAnalytics = null;
                try {
                    if (currentUser?.uid) {
                        teacherAnalytics = await getTeacherAnalytics(currentUser.uid);
                    }
                } catch (analyticsErr) {
                    console.log('Error fetching teacher analytics:', analyticsErr);
                }

                // FIXED: Identify at-risk students with better logic
                const riskStudents = formattedStudents
                    .filter(student => student.riskScore >= 40) // Lower threshold for more sensitivity
                    .sort((a, b) => b.riskScore - a.riskScore);

                console.log('At-risk students found:', riskStudents.length);

                setCourses(coursesWithStats);
                setStudents(formattedStudents);
                setAnalytics(teacherAnalytics);
                setAtRiskStudents(riskStudents);
                setError(null);
                
                // Get ML risk predictions for students
                if (formattedStudents.length > 0) {
                    try {
                        await getMlRiskPredictions(formattedStudents);
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
    }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats, fetchTeacherDashboard, getTeacherAnalytics, refreshKey]);

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
                            message="Model is missing from backend/models folder. To train a model go to this link: https://colab.research.google.com/drive/124Tc_TnAGpkGgHMw82S7wwZzxbUOz0EJ - showing fallback scores where needed" 
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
                    {/* <Card className={styles.metricCard}>
                        <Statistic
                            title={t("Mainpage", "Upcoming Assigments")}
                            value={dashboardMetrics.upcomingAssignments}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card> */}
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
                            <Card
                                title={
                                    <div className={styles.riskCardTitle}>
                                        <RobotOutlined /> {t("Mainpage", "ML Risk analysis")}
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
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </div>
        </div>
    );
};

export default MainPage;