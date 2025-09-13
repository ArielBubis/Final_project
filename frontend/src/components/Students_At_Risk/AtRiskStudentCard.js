  import React from 'react';
import { Card, Progress, Button, Tag, Collapse } from 'antd';
import { BookOutlined, WarningOutlined } from '@ant-design/icons';
import { formatTimestampForDisplay } from '../../utils/firebaseUtils';
import { getCourseRiskData, formatCourseRiskData, getCourseRiskFactors, getCourseRiskLevelColor } from '../../utils/courseRiskUtils';
import styles from '../../styles/modules/MainPage.module.css';
import PropTypes from 'prop-types';

const { Panel } = Collapse;

/**
 * Individual At-Risk Student Card Component
 * Displays detailed information about a single at-risk student including course-specific risk data
 */
const AtRiskStudentCard = ({ student, courseRiskData = null }) => {
  // Map risk level to color
  const getRiskLevelColor = (level) => {
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
      case 'high': 
      case 'at risk': 
        return '#f5222d';
      case 'medium': 
        return '#fa8c16';
      case 'low': 
      case 'not at risk': 
        return '#52c41a';
      default: 
        return '#1890ff';
    }
  };

  // Get risk level text
  const getRiskLevelText = (level, isAtRisk) => {
    if (isAtRisk) return 'AT RISK';
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
      case 'high': return 'HIGH RISK';
      case 'medium': return 'MEDIUM RISK';
      case 'low': return 'LOW RISK';
      case 'at risk': return 'AT RISK';
      case 'not at risk': return 'NOT AT RISK';
      default: return level ? level.toUpperCase() : 'UNKNOWN';
    }
  };

  const getStudentName = (student) => {
    if (student.name) return student.name;
    if (student.firstName && student.lastName) return `${student.firstName} ${student.lastName}`;
    // NEW: handle CSV fields
    if (student.first_name && student.last_name) return `${student.first_name} ${student.last_name}`;
    if (student.student_name) return student.student_name;
    return `Student ${student.studentId || student.id}`;
  };
  
  return (
    <Card className={styles.riskStudentCard}>
      <div className={styles.riskStudentHeader}>
        <div>
          <h3>{getStudentName(student)}</h3>
          {(student.courseName || student.courseId) && (
            <Tag icon={<BookOutlined />} color="blue">
              {student.courseName || student.courseId}
            </Tag>
          )}
          {student.gradeLevel && (
            <Tag color="green">Grade {student.gradeLevel}</Tag>
          )}
        </div>
        <div className={styles.riskScore}>
          <Tag color={getRiskLevelColor(student.mlRiskLevel || student.risk_status)}>
            {getRiskLevelText(student.mlRiskLevel || student.risk_status, student.isAtRisk)}
          </Tag>
          <span className={
            (student.mlRiskScore || 0) >= 70 ? styles.highRisk :
            (student.mlRiskScore || 0) >= 40 ? styles.mediumRisk :
            styles.lowRisk
          }>
            {Math.round(student.mlRiskScore || 0)}%
          </span>
        </div>
      </div>
      
      <div className={styles.riskStudentStats}>
        <div className={styles.riskStat}>
          <span>Academic Performance:</span>
          <Progress
            percent={Math.round(student.performance || student.finalScore || 0)}
            size="small"
            status={(student.performance || student.finalScore || 0) < 60}
          />
        </div>
        <div className={styles.riskStat}>
          <span>Engagement Score:</span>
          <Progress
            percent={Math.round(student.completion || Math.min(100, (student.totalTimeSpentMinutes || 0) / 10) || 0)}
            size="small"
            status={(student.completion || Math.min(100, (student.totalTimeSpentMinutes || 0) / 10) || 0)}
          />
        </div>
        {/* {student.lateSubmissionRate !== undefined && (
          <div className={styles.riskStat}>
            <span>Late Submissions:</span>
            <span style={{ color: student.lateSubmissionRate > 0.3 ? '#f5222d' : '#52c41a' }}>
              {Math.round(student.lateSubmissionRate * 100)}%
            </span>
          </div>
        )} */}
        {student.confidence && (
          <div className={styles.riskStat}>
            <span>Prediction Confidence:</span>
            <Tag color={
              student.confidence === 'High' ? 'green' :
              student.confidence === 'Medium' ? 'orange' : 'red'
            }>
              {student.confidence}
            </Tag>
          </div>
        )}
        {student.lastActive && (
          <div className={styles.riskStat}>
            <span>Last Active:</span>
            <span>{formatTimestampForDisplay(student.lastActive, 'date')}</span>
          </div>
        )}
      </div>      {student.mlRiskFactors && student.mlRiskFactors.length > 0 && (
        <div className={styles.riskFactors}>
          <h4>Risk Factors:</h4>
          <div>
            {student.mlRiskFactors.map((factor, factorIndex) => (
              <Tag key={factorIndex} color="volcano" style={{ marginBottom: 4 }}>
                {factor}
              </Tag>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Button
          type="primary"
          size="small"
          onClick={() => window.location.href = `/students/${student.id || student.studentId}`}
        >
          View Details
        </Button>
        {/* {student.probability && (
          <Tag color="purple">
            Risk Probability: {Math.round(student.probability * 100)}%
          </Tag>
        )} */}
      </div>
    </Card>
  );
};

AtRiskStudentCard.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    courseName: PropTypes.string,
    courseId: PropTypes.string,
    gradeLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    mlRiskLevel: PropTypes.string,
    risk_status: PropTypes.string,
    isAtRisk: PropTypes.bool,
    mlRiskScore: PropTypes.number,
    performance: PropTypes.number,
    finalScore: PropTypes.number,
    completion: PropTypes.number,
    totalTimeSpentMinutes: PropTypes.number,
    lateSubmissionRate: PropTypes.number,
    confidence: PropTypes.string,
    lastActive: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    mlRiskFactors: PropTypes.arrayOf(PropTypes.string),
    probability: PropTypes.number
  }).isRequired,
  courseRiskData: PropTypes.arrayOf(PropTypes.object)
};

export default AtRiskStudentCard;