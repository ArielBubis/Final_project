import React from 'react';
import PropTypes from 'prop-types';
import CourseCard from './CourseCard';
import styles from '../../styles/modules/CourseList.module.css';

const CourseList = ({ courses, title }) => {
    return (
        <div className={styles.courseListContainer}>
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.courseGrid}>
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
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