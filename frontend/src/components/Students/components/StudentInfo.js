import React from 'react';
import { Card as AntCard } from 'antd';
import styles from '../../../styles/modules/Students.module.css';

const StudentInfo = ({ student, debugInfo = {} }) => {
  // Add logging for debugging
  console.log('StudentInfo component received:', { student, debugInfo });
  
  if (!student) {
    return <AntCard title="Student Info" className={styles.detailCard}>
      <p>No student data available</p>
    </AntCard>;
  }
  
  return (
    <AntCard title={`${student.firstName || 'Unknown'} ${student.lastName || 'Student'}`} className={styles.detailCard}>
      <p><strong>Email:</strong> {student.email || 'N/A'}</p>
      <p><strong>Gender:</strong> {student.gender || 'N/A'}</p>
      <p><strong>Courses Enrolled:</strong> {student.courseCount || 0}</p>
      <p><strong>Average Score:</strong> {student.averageScore !== undefined ? `${Math.round(student.averageScore)}%` : 'N/A'}</p>
      <p><strong>Data Load Time:</strong> {debugInfo?.loadTime ? `${debugInfo.loadTime.toFixed(2)}ms` : 'Not measured'}</p>
      <p><strong>Network Requests:</strong> {debugInfo?.requestCount || 'Not tracked'}</p>
      {student.isAtRisk && Array.isArray(student.riskReasons) && student.riskReasons.length > 0 && (
        <div className={styles.riskAlert}>
          <h3>At Risk</h3>
          <ul>
            {student.riskReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </AntCard>
  );
};

export default StudentInfo;
