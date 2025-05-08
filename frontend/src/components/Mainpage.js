import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import CourseList from './Courses/CourseList';
import StudentList from './Students/StudentList';
import styles from '../styles/modules/MainPage.module.css';

const MainPage = () => {
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const { 
        fetchTeacherCourses, 
        fetchStudentsByTeacher,
        fetchCourseStats,
        loading: dataLoading,
        error: dataError 
    } = useData();
    
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch teacher's courses
                const teacherCourses = await fetchTeacherCourses(currentUser?.email);
                
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
                            lastUpdated: course.lastUpdated || new Date().toISOString()
                        };
                    })
                );
                
                // Fetch students for the teacher
                const teacherStudents = await fetchStudentsByTeacher(currentUser?.email);
                
                // Transform student data to match the required format
                const formattedStudents = teacherStudents.map(student => ({
                    id: student.id || student.studentId,
                    name: `${student.firstName} ${student.lastName}`,
                    grade: calculateGrade(student.scores?.average || 0),
                    attendance: Math.round(student.attendance || 95), // Default to 95 if not available
                    lastActive: student.lastAccessed ? new Date(student.lastAccessed).toISOString() : new Date().toISOString(),
                    performance: Math.round(student.scores?.average || 0)
                }));

                setCourses(coursesWithStats);
                setStudents(formattedStudents);
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
    }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats]);

    // Helper function to calculate grade based on score
    const calculateGrade = (score) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    };

    if (loading || dataLoading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error || dataError) {
        return <div className={styles.error}>{error || dataError}</div>;
    }

    return (
        <div className={styles.mainPage}>
            <div className={styles.welcomeSection}>
                <h1>{t('Welcome')}, {currentUser?.displayName || 'Teacher'}</h1>
                <p>{t('mainPageDescription')}</p>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <CourseList 
                        courses={courses} 
                        title={t('courses') || 'Courses'} 
                    />
                </div>

                <div className={styles.section}>
                    <StudentList 
                        students={students} 
                        title={t('students') || 'Students'} 
                    />
                </div>
            </div>
        </div>
    );
};

export default MainPage;