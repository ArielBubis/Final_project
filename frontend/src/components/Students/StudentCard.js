// import React from 'react';
// import PropTypes from 'prop-types';
// import { useNavigate } from 'react-router-dom';
// import { Button } from 'antd';
// import { formatDate } from '../../utils/firebaseUtils';
// import styles from '../../styles/modules/StudentCard.module.css';

// const StudentCard = ({ student }) => {
//     const navigate = useNavigate();
//     const {
//         id,
//         name,
//         grade,
//         lastActive,
//         performance
//     } = student;

//     const getPerformanceColor = (score) => {
//         if (score >= 80) return styles.high;
//         if (score >= 60) return styles.medium;
//         return styles.low;
//     };

//     const handleViewDetails = () => {
//         navigate(`/students/${id}`);
//     };

//     return (
//         <div className={styles.studentCard}>
//             <div className={styles.studentHeader}>
//                 <h3 className={styles.studentName}>{name}</h3>
//                 <span className={styles.grade}>{grade}</span>
//             </div>
//             <div className={styles.stats}>
//                 <div className={styles.stat}>
//                     <span className={styles.statLabel}>Performance</span>
//                     <span className={`${styles.statValue} ${getPerformanceColor(performance)}`}>
//                         {Math.round(performance)}%
//                     </span>
//                 </div>
//             </div>
//             <div className={styles.footer}>
//                 <span className={styles.lastActive}>
//                     Last active: {formatDate(lastActive, 'short-date')}
//                 </span>
//                 <Button 
//                     type="primary" 
//                     size="small" 
//                     onClick={handleViewDetails}
//                     className={styles.viewButton}
//                 >
//                     View Details
//                 </Button>
//             </div>
//         </div>
//     );
// };

// StudentCard.propTypes = {
//     student: PropTypes.shape({
//         id: PropTypes.string.isRequired,
//         name: PropTypes.string.isRequired,
//         grade: PropTypes.string.isRequired,
//         lastActive: PropTypes.string.isRequired,
//         performance: PropTypes.number.isRequired
//     }).isRequired
// };

// export default StudentCard; 