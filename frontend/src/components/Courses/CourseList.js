import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import CourseCard from './CourseCard';
import styles from '../../styles/modules/CourseList.module.css';

const CourseList = ({ courses, title }) => {
    const navigate = useNavigate();    // Filter out courses with 0 overall score
    const filteredCourses = courses.filter(course => {
        // Check if course has summary with overallScore
        if (course.summary && typeof course.summary.overallScore === 'number') {
            return course.summary.overallScore > 0;
        }
        // Check if course has averageScore (for course stats)
        if (typeof course.averageScore === 'number') {
            return course.averageScore > 0;
        }
        // If no score data, include the course
        return true;
    });

    // Optional debug logging (can be disabled in production)
    if (process.env.NODE_ENV === 'development' && courses.length !== filteredCourses.length) {
        console.log(`CourseList: Filtered ${courses.length} courses down to ${filteredCourses.length} courses`);
    }

    return (
        <div className={styles.courseListContainer}>
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.courseGrid}>
                {filteredCourses.map((course) => (
                    <div key={course.id}>
                        <CourseCard course={course} />
                    </div>
                ))}
            </div>
        </div>
    );
};

CourseList.propTypes = {
    courses: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            description: PropTypes.string.isRequired,
            studentCount: PropTypes.number.isRequired,
            progress: PropTypes.number.isRequired,
            lastUpdated: PropTypes.string.isRequired
        })
    ).isRequired,
    title: PropTypes.string.isRequired
};

export default CourseList;