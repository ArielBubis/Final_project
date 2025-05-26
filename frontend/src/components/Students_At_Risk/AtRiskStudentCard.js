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

  // Format student name
  const getStudentName = (student) => {
    if (student.name) return student.name;
    if (student.firstName && student.lastName) return `${student.firstName} ${student.lastName}`;
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
            status={(student.performance || student.finalScore || 0) < 60 ? "exception" : "normal"}
          />
        </div>
        <div className={styles.riskStat}>
          <span>Engagement Score:</span>
          <Progress
            percent={Math.round(student.completion || Math.min(100, (student.totalTimeSpentMinutes || 0) / 10) || 0)}
            size="small"
            status={(student.completion || Math.min(100, (student.totalTimeSpentMinutes || 0) / 10) || 0) < 50 ? "exception" : "normal"}
          />
        </div>
        {student.lateSubmissionRate !== undefined && (
          <div className={styles.riskStat}>
            <span>Late Submissions:</span>
            <span style={{ color: student.lateSubmissionRate > 0.3 ? '#f5222d' : '#52c41a' }}>
              {Math.round(student.lateSubmissionRate * 100)}%
            </span>
          </div>
        )}
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

      {/* Course-specific risk information */}
      {courseRiskData && (
        <div style={{ marginTop: 16 }}>
          <Collapse size="small" ghost>
            <Panel 
              header={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WarningOutlined style={{ color: '#fa8c16' }} />
                  Course-Specific Risk Analysis
                  <Tag color="blue" size="small">
                    {courseRiskData.length} course{courseRiskData.length > 1 ? 's' : ''}
                  </Tag>
                </span>
              } 
              key="courseRisk"
            >
              {courseRiskData.map((courseRisk, index) => {
                const formattedRisk = formatCourseRiskData(courseRisk);
                const riskFactors = getCourseRiskFactors(courseRisk);
                
                return (
                  <div key={`${courseRisk.courseId}-${index}`} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Tag icon={<BookOutlined />} color="blue">
                        {courseRisk.courseId}
                      </Tag>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={getCourseRiskLevelColor(formattedRisk?.riskLevel)}>
                          {formattedRisk?.isAtRisk ? 'AT RISK' : 'SAFE'}
                        </Tag>
                        <span style={{ 
                          fontWeight: 'bold',
                          color: formattedRisk?.riskScore >= 70 ? '#f5222d' : 
                                formattedRisk?.riskScore >= 40 ? '#fa8c16' : '#52c41a'
                        }}>
                          {formattedRisk?.riskScore}%
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                      <div>Final Score: {formattedRisk?.finalScore}%</div>
                      <div>Confidence: {formattedRisk?.confidence}</div>
                      <div>Late Submissions: {Math.round((formattedRisk?.lateSubmissionRate || 0) * 100)}%</div>
                      <div>Time Spent: {Math.round((formattedRisk?.totalTimeSpent || 0) / 60)}h</div>
                    </div>
                    
                    {riskFactors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {riskFactors.map((factor, factorIndex) => (
                          <Tag key={factorIndex} color="red" size="small" style={{ marginBottom: 2 }}>
                            {factor}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </Panel>
          </Collapse>
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
        {student.probability && (
          <Tag color="purple">
            Risk Probability: {Math.round(student.probability * 100)}%
          </Tag>
        )}
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