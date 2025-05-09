import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../styles/modules/CourseCard.module.css';

const CourseCard = ({ course }) => {
    const {
        name,
        description,
        studentCount,
        progress,
        lastUpdated
    } = course;

    return (
        <div className={styles.courseCard}>
            <div className={styles.courseHeader}>
                <h3 className={styles.courseName}>{name}</h3>
                <span className={styles.studentCount}>{studentCount} Students</span>
            </div>
            <p className={styles.description}>{description}</p>
            <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressFill} 
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className={styles.progressText}>{progress}% Complete</span>
            </div>
            <div className={styles.footer}>
                <span className={styles.lastUpdated}>
                    Last updated: {new Date(lastUpdated).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

CourseCard.propTypes = {
    course: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        studentCount: PropTypes.number.isRequired,
        progress: PropTypes.number.isRequired,
        lastUpdated: PropTypes.string.isRequired
    }).isRequired
};

export default CourseCard; 