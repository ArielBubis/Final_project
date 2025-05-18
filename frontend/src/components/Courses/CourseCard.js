import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/modules/CourseCard.module.css';
// import buttonStyles from '../../styles/modules/Button.module.css';
import cardStyles from '../../styles/modules/CourseCard.module.css';

const CourseCard = ({ course }) => {
    const navigate = useNavigate();

    const {
        id,
        name,
        description,
        studentCount,
        progress,
        lastUpdated
    } = course;

    return (
        <div className={cardStyles.courseCard}>
            <div className={cardStyles.courseHeader}>
                <h3 className={cardStyles.courseName}>{name}</h3>
                <span className={cardStyles.studentCount}>{studentCount} Students</span>
            </div>
            <p className={cardStyles.description}>{description}</p>
            <div className={cardStyles.progressContainer}>
                <div className={cardStyles.progressBar}>
                    <div
                        className={cardStyles.progressFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className={cardStyles.progressText}>{progress}% Complete</span>
            </div>
            <div className={cardStyles.footer}>
                <span className={cardStyles.lastUpdated}>
                    Last updated: {new Date(lastUpdated).toLocaleDateString()}
                </span>
                <button
                    className={`${cardStyles.viewButton}`}
                    onClick={() => navigate(`/courses/${id}`)}
                >
                    View Details
                </button>
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