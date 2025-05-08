import React from 'react';
import PropTypes from 'prop-types';
import StudentCard from './StudentCard';
import styles from '../../styles/modules/StudentList.module.css';

const StudentList = ({ students, title }) => {
    return (
        <div className={styles.studentListContainer}>
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.studentGrid}>
                {students.map((student) => (
                    <StudentCard key={student.id} student={student} />
                ))}
            </div>
        </div>
    );
};

StudentList.propTypes = {
    students: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            grade: PropTypes.string.isRequired,
            attendance: PropTypes.number.isRequired,
            lastActive: PropTypes.string.isRequired,
            performance: PropTypes.number.isRequired
        })
    ).isRequired,
    title: PropTypes.string.isRequired
};

export default StudentList; 