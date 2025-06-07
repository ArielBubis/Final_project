import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import CourseList from './CourseList';
import styles from '../../styles/modules/CoursesPage.module.css';

const CoursesPage = () => {
    const { currentUser } = useAuth();
    const { fetchTeacherCourses } = useData();
    const { fetchCourseStats } = useData();
    const { t } = useLanguage();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadCourses = async () => {
            try {
                setLoading(true);
                const teacherCourses = await fetchTeacherCourses(currentUser?.uid);
                console.log('Found courses:', teacherCourses?.length || 0);
                
                if (!teacherCourses || teacherCourses.length === 0) {
                    console.log('No courses found for teacher');
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
                setCourses(coursesWithStats);
            } catch (err) {
                setError('Failed to load courses.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.email) {
            loadCourses();
        }
    }, [currentUser, fetchTeacherCourses]);

    if (loading) {
        return <div className={styles.loading}>Loading courses...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.coursesPageContainer}>
            <h1 className={styles.title}>{t("CoursesPage", "My courses")}</h1>
            <CourseList courses={courses} title="" />
        </div>
    );
};

export default CoursesPage;