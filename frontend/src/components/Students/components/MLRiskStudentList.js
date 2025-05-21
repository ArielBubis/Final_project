import React from 'react';
import { Card, Progress, Button, Empty, Tag, Spin, Alert } from 'antd';
import { formatTimestampForDisplay } from '../../../utils/firebaseUtils';
import styles from '../../../styles/modules/MainPage.module.css';
import PropTypes from 'prop-types';

/**
 * Component to display students identified as at-risk by the ML model
 */
const MLRiskStudentList = ({ students, loading, error }) => {
  // Render loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>Processing ML risk predictions...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert
        message="ML Risk Analysis Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  // If no students are at risk
  if (!students || students.length === 0) {
    return <Empty description="No students identified as at risk by the ML model" />;
  }

  // Map risk level to color
  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'high': return '#f5222d';
      case 'medium': return '#fa8c16';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };

  return (
    <div className={styles.riskStudentList}>
      {students.map(student => (
        <Card key={student.id} className={styles.riskStudentCard}>
          <div className={styles.riskStudentHeader}>
            <h3>{student.name || `${student.firstName} ${student.lastName}`}</h3>
            <div className={styles.riskScore}>
              <Tag color={getRiskLevelColor(student.mlRiskLevel)}>
                {student.mlRiskLevel?.toUpperCase()} RISK
              </Tag>
              <span className={
                student.mlRiskScore >= 80 ? styles.highRisk :
                student.mlRiskScore >= 40 ? styles.mediumRisk :
                styles.lowRisk
              }>
                {student.mlRiskScore}
              </span>
            </div>
          </div>
          
          <div className={styles.riskStudentStats}>
            <div className={styles.riskStat}>
              <span>Performance:</span>
              <Progress
                percent={student.performance || student.averageScore || 0}
                size="small"
                status={(student.performance || student.averageScore || 0) < 60 ? "exception" : "normal"}
              />
            </div>
            <div className={styles.riskStat}>
              <span>Completion:</span>
              <Progress
                percent={student.completion || student.completionRate || 0}
                size="small"
                status={(student.completion || student.completionRate || 0) < 50 ? "exception" : "normal"}
              />
            </div>
            <div className={styles.riskStat}>
              <span>Last Active:</span>
              <span>{formatTimestampForDisplay(student.lastActive || student.lastAccessed, 'date')}</span>
            </div>
          </div>

          {student.mlRiskFactors && student.mlRiskFactors.length > 0 && (
            <div className={styles.riskFactors}>
              <h4>Risk Factors:</h4>
              <div>
                {student.mlRiskFactors.map((factor, index) => (
                  <Tag key={index} color="volcano">{factor}</Tag>
                ))}
              </div>
            </div>
          )}
          
          <Button
            type="primary"
            size="small"
            onClick={() => window.location.href = `/students/${student.id}`}
            style={{ marginTop: '8px' }}
          >
            View Details
          </Button>
        </Card>
      ))}
    </div>
  );
};

MLRiskStudentList.propTypes = {
  students: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  error: PropTypes.string
};

MLRiskStudentList.defaultProps = {
  students: [],
  loading: false,
  error: null
};

export default MLRiskStudentList;
