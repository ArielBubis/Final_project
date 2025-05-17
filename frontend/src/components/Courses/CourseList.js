import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import CourseCard from './CourseCard';
import styles from '../../styles/modules/CourseList.module.css';

const CourseList = ({ courses, title }) => {
    const navigate = useNavigate();

    return (
        <div className={styles.courseListContainer}>
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.courseGrid}>
                {courses.map((course) => (
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