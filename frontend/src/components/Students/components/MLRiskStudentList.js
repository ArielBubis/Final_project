import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, Empty, Tag, Spin, Alert, Badge, Statistic, Row, Col } from 'antd';
import { ExclamationCircleOutlined, UserOutlined, BookOutlined, TrophyOutlined } from '@ant-design/icons';
import { formatTimestampForDisplay } from '../../../utils/firebaseUtils';
import { getAtRiskStudents } from '../../../services/riskPredictionService';
import styles from '../../../styles/modules/MainPage.module.css';
import PropTypes from 'prop-types';

/**
 * Component to display students identified as at-risk by the ML model
 * Uses CSV prediction data when available, falls back to props
 */
const MLRiskStudentList = ({ students: propStudents, loading: propLoading, error: propError }) => {
  const [students, setStudents] = useState(propStudents || []);
  const [loading, setLoading] = useState(propLoading || false);
  const [error, setError] = useState(propError || null);
  const [summary, setSummary] = useState(null);
  const [usingCsvData, setUsingCsvData] = useState(false);

  // Fetch CSV data on component mount
  useEffect(() => {
    const fetchAtRiskStudents = async () => {
      setLoading(true);
      try {
        const response = await getAtRiskStudents();
        if (response.success) {
          setStudents(response.students);
          setSummary(response.summary);
          setUsingCsvData(true);
          setError(null);
        } else {
          // Fall back to prop data if available
          if (propStudents) {
            setStudents(propStudents);
            setUsingCsvData(false);
          }
          setError(response.message || 'Failed to load CSV predictions');
        }
      } catch (err) {
        console.error('Error fetching at-risk students:', err);
        // Fall back to prop data if available
        if (propStudents) {
          setStudents(propStudents);
          setUsingCsvData(false);
        }
        setError('Unable to load latest predictions. Using cached data if available.');
      } finally {
        setLoading(false);
      }
    };

    fetchAtRiskStudents();
  }, [propStudents]);

  // Use prop data if it changes and we're not using CSV data
  useEffect(() => {
    if (!usingCsvData && propStudents) {
      setStudents(propStudents);
    }
  }, [propStudents, usingCsvData]);

  // Use prop loading state if we're not using CSV data
  useEffect(() => {
    if (!usingCsvData) {
      setLoading(propLoading);
    }
  }, [propLoading, usingCsvData]);

  // Use prop error if we're not using CSV data
  useEffect(() => {
    if (!usingCsvData && propError) {
      setError(propError);
    }
  }, [propError, usingCsvData]);  // Render loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>{usingCsvData ? 'Loading ML risk predictions from CSV...' : 'Processing ML risk predictions...'}</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert
        message="ML Risk Analysis Error"
        description={error}
        type={usingCsvData ? "warning" : "error"}
        showIcon
      />
    );
  }

  // If no students are at risk
  if (!students || students.length === 0) {
    return (
      <div>
        <Alert
          message="No At-Risk Students Found"
          description={usingCsvData ? 
            "Great news! No students are currently flagged as at-risk by the ML model." :
            "No students identified as at risk by the ML model"
          }
          type="success"
          showIcon
        />
        {summary && (
          <Card style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Total Students" value={summary.total_students_analyzed} />
              </Col>
              <Col span={6}>
                <Statistic title="At Risk" value={summary.at_risk_count} />
              </Col>
              <Col span={6}>
                <Statistic title="Risk %" value={summary.at_risk_percentage} precision={1} suffix="%" />
              </Col>
              <Col span={6}>
                <Badge status="success" text={`Using ${summary.prediction_file}`} />
              </Col>
            </Row>
          </Card>
        )}
      </div>
    );
  }
  // Map risk level to color
  const getRiskLevelColor = (level) => {
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
      case 'high': case 'at risk': return '#f5222d';
      case 'medium': return '#fa8c16';
      case 'low': case 'not at risk': return '#52c41a';
      default: return '#1890ff';
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
    <div>
      {/* Summary Statistics */}
      {summary && usingCsvData && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic 
                title="Total Analyzed" 
                value={summary.total_students_analyzed} 
                prefix={<UserOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="At Risk" 
                value={summary.at_risk_count} 
                valueStyle={{ color: '#f5222d' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="Risk Rate" 
                value={summary.at_risk_percentage} 
                precision={1} 
                suffix="%" 
                valueStyle={{ color: summary.at_risk_percentage > 20 ? '#f5222d' : '#52c41a' }}
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="High Risk" 
                value={summary.high_risk_count} 
                valueStyle={{ color: '#f5222d' }}
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="Medium Risk" 
                value={summary.medium_risk_count} 
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
            <Col span={4}>
              <Badge 
                status="processing" 
                text={`Data: ${summary.prediction_file?.replace('risk_predictions_', '').replace('.csv', '') || 'Latest'}`} 
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Student Risk Cards */}
      <div className={styles.riskStudentList}>
        {students.map((student, index) => (
          <Card key={student.id || student.studentId || index} className={styles.riskStudentCard}>
            <div className={styles.riskStudentHeader}>
              <div>
                <h3>{getStudentName(student)}</h3>
                {student.courseId && (
                  <Tag icon={<BookOutlined />} color="blue">
                    {student.courseId}
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
            </div>

            {student.mlRiskFactors && student.mlRiskFactors.length > 0 && (
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
              {student.probability && (
                <Tag color="purple">
                  Risk Probability: {Math.round(student.probability * 100)}%
                </Tag>
              )}
            </div>
          </Card>
        ))}
      </div>
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
