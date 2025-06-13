import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { usePerformance } from '../../contexts/PerformanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import StudentList from '../Students/StudentList';
import StatisticCard from './components/StatisticCard';
import BarChart from '../Visualization/BarChart';
import styles from '../../styles/modules/CoursePage.module.css';

const CoursePage = () => {
    const { courseId } = useParams();
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const { 
        fetchCourseStats,
        fetchTeacherCourses,
        fetchStudentsByTeacher
    } = useData();
    const { 
        getCourseAnalytics,
        loading: performanceLoading 
    } = usePerformance();

    const [courseData, setCourseData] = useState(null);
    const [students, setStudents] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);    
    const [scoreDistribution, setScoreDistribution] = useState([]);

    useEffect(() => {
        const loadCourseData = async () => {
            if (!currentUser?.uid || !courseId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Load base course data
                const courses = await fetchTeacherCourses(currentUser.uid);
                console.log('Fetched courses:', courses); // Debug log
                
                const currentCourse = courses?.find(course => course.id === courseId);
                console.log('Found course:', currentCourse); // Debug log
                
                if (!currentCourse) {
                    throw new Error('Course not found');
                }                // Load detailed course stats
                const stats = await fetchCourseStats(courseId);
                console.log('Course stats:', stats); // Debug log
                
                // Load enrolled students and course analytics in parallel
                const [enrolledStudents, analyticsData] = await Promise.all([
                    fetchStudentsByTeacher(currentUser.uid),
                    getCourseAnalytics(courseId)
                ]);

                // Get students enrolled in this course with their performance data
                const courseStudents = enrolledStudents?.filter(student => {
                    const hasEnrollment = student.courseIds?.includes(courseId);
                    const hasPerformanceData = analyticsData?.studentPerformance?.[student.id];
                    return hasEnrollment && hasPerformanceData;
                });

                // Ensure all required fields are present with fallbacks
                const courseDataWithDefaults = {
                    ...currentCourse,
                    ...stats,
                    name: currentCourse.courseName || currentCourse.name,
                    description: currentCourse.description || 'No description available',
                    studentCount: stats?.studentCount || 0,
                    averageCompletion: Math.round(stats?.averageCompletion || 0),
                    averageScore: Math.round(stats?.averageScore || 0),
                    lastUpdated: currentCourse.updatedAt || new Date().toISOString(),
                    createdAt: currentCourse.createdAt || currentCourse.updatedAt || new Date().toISOString(),
                    activeStudentsLast7Days: stats?.activeStudentsLast7Days || 0,
                    moduleCount: stats?.moduleCount || 0,
                    assignmentCount: stats?.assignmentCount || 0,
                };

                console.log('Setting course data:', courseDataWithDefaults); // Debug log
                setCourseData(courseDataWithDefaults);
                setAnalytics(analyticsData);
                setStudents(courseStudents || []);
            } catch (err) {
                console.error('Error loading course data:', err);
                setError(t('CoursePage.errorLoading', 'Failed to load course data: ' + err.message));
            } finally {
                setLoading(false);
            }
        };        
        loadCourseData();
    }, [courseId, currentUser, fetchCourseStats, fetchTeacherCourses, fetchStudentsByTeacher, getCourseAnalytics, t]);

    useEffect(() => {
        const calculateScoreDistribution = () => {
            if (!students || !Array.isArray(students)) return;

            const ranges = [
                { label: '0-50', min: 0, max: 50, count: 0 },
                { label: '51-60', min: 51, max: 60, count: 0 },
                { label: '61-70', min: 61, max: 70, count: 0 },
                { label: '71-80', min: 71, max: 80, count: 0 },
                { label: '81-90', min: 81, max: 90, count: 0 },
                { label: '91-100', min: 91, max: 100, count: 0 }
            ];            students.forEach(student => {
                if (!analytics?.studentPerformance?.[student.id]) return;
                
                const score = analytics.studentPerformance[student.id].overallScore;
                if (typeof score !== 'number') return;

                const range = ranges.find(r => score >= r.min && score <= r.max);
                if (range) {
                    range.count++;
                }
            });

            setScoreDistribution(ranges);
        };

        if (students.length > 0) {
            calculateScoreDistribution();
        }
    }, [students, courseId]);

    if (loading || performanceLoading) {
        return <div className={styles.loading}>{t('CoursePage.loading', 'Loading course data...')}</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!courseData) {
        return <div className={styles.error}>{t('CoursePage.notFound', 'Course not found')}</div>;
    }

    return (
        <div className={styles.coursePage}>
            {/* Breadcrumb Navigation */}
            <div className={styles.breadcrumb}>
                <Link to="/dashboard">{t('Common.dashboard', 'Dashboard')}</Link>
                <span className={styles.breadcrumbSeparator}>/</span>
                <Link to="/courses">{t('Common.courses', 'Courses')}</Link>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.currentPage}>{courseData.name}</span>
            </div>

            {/* Course Header Section */}
            <section className={styles.courseHeader}>
                <div className={styles.courseInfo}>
                    <h1 className={styles.courseTitle}>{courseData.name}</h1>
                    <p className={styles.courseDescription}>{courseData.description}</p>
                    <div className={styles.courseMetadata}>
                        <span className={styles.metadataItem}>
                            {t('CoursePage.createdAt', 'Created')}: {new Date(courseData.createdAt).toLocaleDateString()}
                        </span>
                        <span className={styles.metadataItem}>
                            {t('CoursePage.students', 'Students')}: {courseData.studentCount}
                        </span>
                    </div>
                </div>
            </section>

            {/* Course Statistics Dashboard */}
            <section className={styles.statsSection}>
                <h2 className={styles.sectionTitle}>{t('CoursePage.statistics', 'Course Statistics')}</h2>
                <div className={styles.statsGrid}>
                    <StatisticCard
                        title={t('CoursePage.averageCompletion', 'Average Completion')}
                        value={courseData.averageCompletion}
                        metricType="completion"
                    />
                    <StatisticCard
                        title={t('CoursePage.averageScore', 'Average Score')}
                        value={courseData.averageScore}
                        metricType="averageScore"
                    />
                    <StatisticCard
                        title={t('CoursePage.activeStudents', 'Active Students (7 days)')}
                        value={courseData.activeStudentsLast7Days}
                        metricType="activeStudents"
                    />
                </div>

                <div className={styles.chartSection}>
                    <BarChart 
                        data={scoreDistribution}
                        title={t('CoursePage.scoreDistribution', 'Student Score Distribution')}
                    />
                </div>
            </section>

            {/* Student List Section */}
            <section className={styles.studentsSection}>
                <h2 className={styles.sectionTitle}>{t('CoursePage.enrolledStudents', 'Enrolled Students')}</h2>
                <StudentList 
                    students={students}
                    courseId={courseId}
                />
            </section>

            {/* Course Content Overview */}
            <section className={styles.contentSection}>
                <h2 className={styles.sectionTitle}>{t('CoursePage.courseContent', 'Course Content')}</h2>
                <div className={styles.contentGrid}>
                    <StatisticCard
                        title={t('CoursePage.modules', 'Modules')}
                        value={courseData.moduleCount}
                        metricType="moduleCount"
                    />
                    <StatisticCard
                        title={t('CoursePage.assignments', 'Assignments')}
                        value={courseData.assignmentCount}
                        metricType="assignmentCount"
                    />
                </div>
            </section>
        </div>
    );
};

export default CoursePage;
