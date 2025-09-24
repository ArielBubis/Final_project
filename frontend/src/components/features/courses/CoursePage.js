import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';

import styles from '../../../styles/modules/CoursePage.module.css';

const CoursePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { courses, fetchCourseStats, fetchStudentsByTeacher, fetchTeacherCourses } = useData();
    const [course, setCourse] = useState(null);
    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                // Try to find course in context cache first
                const found = (courses || []).find(c => c.id === id) || null;
                setCourse(found);

                const s = await fetchCourseStats(id);
                setStats(s);

                // Fetch students data for visualizations
                if (currentUser?.uid) {
                    const allStudents = await fetchStudentsByTeacher(currentUser.uid);
                    console.log('CoursePage: All students fetched:', allStudents.length);
                    
                    // Filter students enrolled in this specific course
                    const courseStudents = allStudents.filter(student => 
                        student.courses && student.courses.some(course => course.id === id)
                    );
                    console.log('CoursePage: Students in this course:', courseStudents.length);
                    console.log('CoursePage: Course ID being filtered:', id);
                    
                    // TEMPORARY: If no students found for this course, use all students for testing
                    const studentsToUse = courseStudents.length > 0 ? courseStudents : allStudents;
                    console.log('CoursePage: Using students for visualization:', studentsToUse.length);
                    
                    setStudents(studentsToUse);

                    // Fetch all teacher courses for comparison
                    const teacherCourses = await fetchTeacherCourses(currentUser.uid);
                    const coursesWithStats = await Promise.all(
                        teacherCourses.map(async (course) => {
                            try {
                                const courseStats = await fetchCourseStats(course.id);
                                return {
                                    id: course.id,
                                    name: course.courseName || course.name,
                                    averageScore: courseStats?.averageScore || 0,
                                    averageCompletion: courseStats?.averageCompletion || 0,
                                    activeRatio7Days: courseStats?.activeRatio7Days || 0,
                                    studentCount: courseStats?.studentCount || 0
                                };
                            } catch (err) {
                                console.error(`Error fetching stats for course ${course.id}:`, err);
                                return {
                                    id: course.id,
                                    name: course.courseName || course.name,
                                    averageScore: 0,
                                    averageCompletion: 0,
                                    activeRatio7Days: 0,
                                    studentCount: 0
                                };
                            }
                        })
                    );
                    setAllCourses(coursesWithStats);
                }
            } catch (err) {
                console.error('Error loading course details:', err);
                setError('Failed to load course details.');
            } finally {
                setLoading(false);
            }
        };

        if (id) load();
    }, [id, courses, fetchCourseStats, fetchStudentsByTeacher, fetchTeacherCourses, currentUser]);

    if (loading) return <div className={styles.loading}>Loading course...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!course && !stats) return <div className={styles.error}>Course not found.</div>;

    return (
        <div className={styles.coursePage}>
            <div className={styles.breadcrumb}>
                <a onClick={() => navigate('/courses')}>Courses</a>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.currentPage}>{(course && (course.courseName || course.name)) || (stats && stats.courseName) || 'Course'}</span>
            </div>

            <div className={styles.courseHeader}>
                <h1 className={styles.courseTitle}>{(course && (course.courseName || course.name)) || (stats && stats.courseName) || 'Course'}</h1>
                <p className={styles.courseDescription}>{(course && (course.description || 'No description available')) || ''}</p>
                <div className={styles.courseMetadata}>
                    <div className={styles.metadataItem}>Students: {stats?.studentCount ?? '—'}</div>
                    <div className={styles.metadataItem}>Assignments: {stats?.assignmentCount ?? 0}</div>
                    <div className={styles.metadataItem}>Modules: {stats?.moduleCount ?? 0}</div>
                </div>
            </div>

            <div className={styles.statsSection}>
                <div className={styles.sectionTitle}>Course statistics</div>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <h3>Avg Score</h3>
                        <div className={styles.statValue}>{Math.round(stats?.averageScore ?? 0)}</div>
                    </div>
                    <div className={styles.statCard}>
                        <h3>Avg Completion</h3>
                        <div className={styles.statValue}>{Math.round(stats?.averageCompletion ?? 0)}%</div>
                    </div>
                    <div className={styles.statCard}>
                        <h3>Active (7d)</h3>
                        <div className={styles.statValue}>{stats?.activeStudentsLast7Days ?? 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <h3>Active Ratio (7d)</h3>
                        <div className={styles.statValue}>{(stats?.activeRatio7Days ? Math.round(stats.activeRatio7Days * 100) : 0)}%</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursePage;