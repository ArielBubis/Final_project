import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import CourseList from './CourseList';
import styles from '../../styles/modules/CoursesPage.module.css';

const CoursesPage = () => {
    const { currentUser } = useAuth();
    const { fetchTeacherCourses } = useData();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadCourses = async () => {
            try {
                setLoading(true);
                const result = await fetchTeacherCourses(currentUser?.email);
                const teacherCourses = result || [];

                const formattedCourses = teacherCourses.map(course => ({
                    id: course.id || course.courseId,
                    name: course.courseName || course.name,
                    description: course.description || 'No description available',
                    studentCount: course.studentCount || 0,
                    progress: Math.round(course.averageCompletion || 0),
                    lastUpdated: course.lastUpdated || new Date().toISOString(),
                }));
                
                setCourses(formattedCourses);
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
            <h1 className={styles.title}>My Courses</h1>
            <CourseList courses={courses} title="Courses You Teach" />
        </div>
    );
};

export default CoursesPage;