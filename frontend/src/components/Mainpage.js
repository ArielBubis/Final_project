import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { Button, Card, Progress, Spin, Alert, Statistic, Tabs, Empty } from 'antd';
import {
    UserOutlined,
    BookOutlined,
    ClockCircleOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import CourseList from './Courses/CourseList';
import StudentList from './Students/StudentList';
import { formatTimestampForDisplay } from '../utils/firebaseUtils';
import styles from '../styles/modules/MainPage.module.css';

const MainPage = () => {
    const { currentUser, userRole } = useAuth();
    const { t } = useLanguage();
    const {
        fetchTeacherCourses,
        fetchStudentsByTeacher,
        fetchCourseStats,
        loading: dataLoading,
        error: dataError,
        clearCache
    } = useData();
    const { getTeacherAnalytics } = usePerformance();

    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedTab, setSelectedTab] = useState('overview');

    // Dashboard metrics derived from fetched data
    const dashboardMetrics = useMemo(() => {
        if (!courses.length || !students.length) return null;

        // Calculate average course completion
        const avgCompletion = courses.reduce((sum, course) => sum + course.progress, 0) / courses.length;

        // Calculate average student performance
        const avgPerformance = students.reduce((sum, student) => sum + student.performance, 0) / students.length;

        // Count active students in the last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        const activeStudents = students.filter(student =>
            new Date(student.lastActive) >= sevenDaysAgo
        ).length;

        // Count assignments due in the next week
        const upcomingAssignments = courses.reduce((count, course) =>
            count + (course.upcomingAssignments || 0), 0);

        return {
            totalCourses: courses.length,
            totalStudents: students.length,
            avgCompletion: Math.round(avgCompletion),
            avgPerformance: Math.round(avgPerformance),
            activeStudents,
            activeStudentsPercentage: Math.round((activeStudents / students.length) * 100),
            upcomingAssignments
        };
    }, [courses, students]);

    // Function to refresh data
    const handleRefresh = () => {
        // Clear relevant caches
        clearCache('teacherCourses');
        clearCache('studentsByTeacher');
        clearCache('courseStats');
        // Trigger re-fetch by updating the key
        setRefreshKey(prev => prev + 1);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch teacher's courses
                const result = await fetchTeacherCourses(currentUser?.email);
                const teacherCourses = result || [];
                console.log('Teacher Courses:', teacherCourses);

                // const teacherCourses = await fetchTeacherCourses(currentUser?.email);

                // Fetch course stats for each course
                const coursesWithStats = await Promise.all(
                    teacherCourses.map(async (course) => {
                        const stats = await fetchCourseStats(course.id || course.courseId);
                        return {
                            id: course.id || course.courseId,
                            name: course.courseName || course.name,
                            description: course.description || 'No description available',
                            studentCount: stats?.studentCount || 0,
                            progress: Math.round(stats?.averageCompletion || 0),
                            lastUpdated: course.lastUpdated || new Date().toISOString(),
                            activeStudentsLast7Days: stats?.activeStudentsLast7Days || 0,
                            activeRatio7Days: stats?.activeRatio7Days || 0,
                            assignmentCount: stats?.assignmentCount || 0,
                            moduleCount: stats?.moduleCount || 0,
                        };
                    })
                );

                // Fetch students for the teacher
                const teacherStudents = await fetchStudentsByTeacher(currentUser?.email);

                // Transform student data to match the required format
                const formattedStudents = teacherStudents.map(student => ({
                    id: student.id || student.studentId,
                    name: `${student.firstName} ${student.lastName}`,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.email,
                    grade: calculateGrade(student.scores?.average || 0),
                    attendance: Math.round(student.attendance || 95), // Default to 95 if not available
                    lastActive: student.lastAccessed ? new Date(student.lastAccessed).toISOString() : new Date().toISOString(),
                    performance: Math.round(student.scores?.average || 0),
                    completion: Math.round(student.completion || 0),
                    // Add risk score (mock data for now)
                    riskScore: calculateRiskScore(student)
                }));

                // Get teacher analytics if available
                let teacherAnalytics = null;
                try {
                    if (currentUser?.uid) {
                        teacherAnalytics = await getTeacherAnalytics(currentUser.uid);
                    }
                } catch (analyticsErr) {
                    console.error('Error fetching teacher analytics:', analyticsErr);
                }

                // Identify at-risk students
                const riskStudents = formattedStudents
                    .filter(student => student.riskScore >= 70)
                    .sort((a, b) => b.riskScore - a.riskScore);

                setCourses(coursesWithStats);
                setStudents(formattedStudents);
                setAnalytics(teacherAnalytics);
                setAtRiskStudents(riskStudents);
                setError(null);
            } catch (err) {
                setError('Failed to fetch data');
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.email) {
            fetchData();
        }
    }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats, getTeacherAnalytics, refreshKey]);

    // Helper function to calculate grade based on score
    const calculateGrade = (score) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    };

    // Helper function to calculate risk score
    const calculateRiskScore = (student) => {
        let score = 0;

        // Low performance increases risk
        if (student.scores?.average < 60) score += 40;
        else if (student.scores?.average < 70) score += 25;

        // Low completion increases risk
        if (student.completion < 40) score += 30;
        else if (student.completion < 60) score += 15;

        // Recent inactivity increases risk
        const lastAccess = new Date(student.lastAccessed || new Date());
        const daysSinceLastAccess = Math.floor((new Date() - lastAccess) / (1000 * 60 * 60 * 24));

        if (daysSinceLastAccess > 14) score += 30;
        else if (daysSinceLastAccess > 7) score += 15;

        return score;
    };

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
                    <h1>{t('general.welcome') || 'Welcome'}, {currentUser?.displayName || 'Teacher'}</h1>
                    <p className={styles.lastUpdated}>
                        Last updated: {new Date().toLocaleString()}
                        <Button
                            type="text"
                            size="small"
                            onClick={handleRefresh}
                            className={styles.refreshButton}
                        >
                            Refresh
                        </Button>
                    </p>
                </div>
            </div>

            {/* Dashboard Metrics */}
            {dashboardMetrics && (
                <div className={styles.metricsContainer}>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Courses"
                            value={dashboardMetrics.totalCourses}
                            prefix={<BookOutlined />}
                        />
                    </Card>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Students"
                            value={dashboardMetrics.totalStudents}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Avg. Completion"
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
                    </Card>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Active Students (7d)"
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
                            title="Upcoming Assignments"
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
                    <Tabs.TabPane tab="Overview" key="overview">
                        <div className={styles.tabContent}>
                            <div className={styles.mainSections}>
                                {/* Courses Section */}
                                <div className={styles.section}>
                                    <CourseList
                                        courses={courses}
                                        title={t('menu.courses') || 'Courses'}
                                    />
                                </div>

                                {/* Students Section */}
                                <div className={styles.section}>
                                    <StudentList
                                        students={students}
                                        title={t('menu.students') || 'Students'}
                                    />
                                </div>
                            </div>
                        </div>
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="At-Risk Students" key="risk">
                        <div className={styles.tabContent}>
                            <Card
                                title={
                                    <div className={styles.riskCardTitle}>
                                        <WarningOutlined /> Students Requiring Attention
                                    </div>
                                }
                                className={styles.riskCard}
                            >
                                {atRiskStudents.length > 0 ? (
                                    <div className={styles.riskStudentList}>
                                        {atRiskStudents.map(student => (
                                            <Card key={student.id} className={styles.riskStudentCard}>
                                                <div className={styles.riskStudentHeader}>
                                                    <h3>{student.name}</h3>
                                                    <div className={styles.riskScore}>
                                                        Risk Score:
                                                        <span className={
                                                            student.riskScore >= 80 ? styles.highRisk :
                                                                student.riskScore >= 60 ? styles.mediumRisk :
                                                                    styles.lowRisk
                                                        }>
                                                            {student.riskScore}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={styles.riskStudentStats}>
                                                    <div className={styles.riskStat}>
                                                        <span>Performance:</span>
                                                        <Progress
                                                            percent={student.performance}
                                                            size="small"
                                                            status={student.performance < 60 ? "exception" : "normal"}
                                                        />
                                                    </div>
                                                    <div className={styles.riskStat}>
                                                        <span>Completion:</span>
                                                        <Progress
                                                            percent={student.completion}
                                                            size="small"
                                                            status={student.completion < 50 ? "exception" : "normal"}
                                                        />
                                                    </div>
                                                    <div className={styles.riskStat}>
                                                        <span>Last Active:</span>
                                                        <span>{formatTimestampForDisplay(student.lastActive, 'date')}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    onClick={() => window.location.href = `/students/${student.id}`}
                                                >
                                                    View Details
                                                </Button>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty description="No at-risk students detected" />
                                )}
                            </Card>
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </div>
        </div>
    );
};

export default MainPage;