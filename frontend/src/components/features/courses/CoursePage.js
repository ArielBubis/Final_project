import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';

import styles from '../../../styles/modules/CoursePage.module.css';

const CoursePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { courses, fetchCourseStats } = useData();
    const [course, setCourse] = useState(null);
    const [stats, setStats] = useState(null);
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
            } catch (err) {
                console.error('Error loading course details:', err);
                setError('Failed to load course details.');
            } finally {
                setLoading(false);
            }
        };

        if (id) load();
    }, [id, courses, fetchCourseStats]);

    if (loading) return <div className={styles.loading}>Loading course...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!course && !stats) return <div className={styles.error}>Course not found.</div>;

    return (
        <div className={styles.coursePage}>
            <div className={styles.breadcrumb}>
                <button 
                    type="button"
                    onClick={() => navigate('/courses')}
                    className={styles.breadcrumbLink}
                >
                    Courses
                </button>
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