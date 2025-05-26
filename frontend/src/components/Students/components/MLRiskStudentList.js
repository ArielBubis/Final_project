import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, Empty, Tag, Spin, Alert, Badge, Statistic, Row, Col } from 'antd';
import { ExclamationCircleOutlined, UserOutlined, BookOutlined, TrophyOutlined } from '@ant-design/icons';
import { formatTimestampForDisplay } from '../../../utils/firebaseUtils';
import { getAtRiskStudents, getCourseRiskData } from '../../../services/riskPredictionService';
import AtRiskStudentCard from '../../Students_At_Risk/AtRiskStudentCard';
import styles from '../../../styles/modules/MainPage.module.css';
import PropTypes from 'prop-types';

/**
 * Component to display students identified as at-risk by the ML model
 * Uses CSV prediction data when available, falls back to props
 */
const MLRiskStudentList = ({ students: propStudents, loading: propLoading, error: propError }) => {
  // Filter function to exclude "not at risk" students
  const filterAtRiskStudents = (studentList) => {
    if (!studentList || !Array.isArray(studentList)) return [];
    
    return studentList.filter(student => {
      const riskLevel = (student.mlRiskLevel || student.risk_status || '').toLowerCase();
      const isAtRisk = student.isAtRisk;
      
      // Exclude students who are explicitly "not at risk"
      if (riskLevel === 'not at risk' || riskLevel === 'low risk' || isAtRisk === false) {
        return false;
      }
      
      // Include students with high, medium risk, or explicitly at risk
      return riskLevel === 'high' || riskLevel === 'medium' || riskLevel === 'at risk' || isAtRisk === true;
    });
  };
  const [students, setStudents] = useState(filterAtRiskStudents(propStudents) || []);
  const [loading, setLoading] = useState(propLoading || false);
  const [error, setError] = useState(propError || null);
  const [summary, setSummary] = useState(null);
  const [usingCsvData, setUsingCsvData] = useState(false);
  const [courseRiskData, setCourseRiskData] = useState([]);
  // Fetch CSV data on component mount
  useEffect(() => {
    const fetchAtRiskStudents = async () => {
      setLoading(true);
      try {
        // Fetch both at-risk students and course risk data in parallel
        const [atRiskResponse, courseRiskResponse] = await Promise.all([
          getAtRiskStudents(),
          getCourseRiskData()
        ]);
        
        if (atRiskResponse.success) {
          setStudents(filterAtRiskStudents(atRiskResponse.students));
          setSummary(atRiskResponse.summary);
          setUsingCsvData(true);
          setError(null);
        } else {
          // Fall back to prop data if available
          if (propStudents) {
            setStudents(filterAtRiskStudents(propStudents));
            setUsingCsvData(false);
          }
          setError(atRiskResponse.message || 'Failed to load CSV predictions');
        }
        
        // Set course risk data
        setCourseRiskData(courseRiskResponse);
        
      } catch (err) {
        console.error('Error fetching at-risk students:', err);
        // Fall back to prop data if available
        if (propStudents) {
          setStudents(filterAtRiskStudents(propStudents));
          setUsingCsvData(false);
        }
        setError('Unable to load latest predictions. Using cached data if available.');
        setCourseRiskData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAtRiskStudents();
  }, [propStudents]);
  // Use prop data if it changes and we're not using CSV data
  useEffect(() => {
    if (!usingCsvData && propStudents) {
      setStudents(filterAtRiskStudents(propStudents));
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
      )}      {/* Student Risk Cards */}
      <div className={styles.riskStudentList}>
        {students.map((student, index) => {
          // Create a unique key by combining multiple identifiers
          const uniqueKey = `${student.id || 'no-id'}-${student.studentId || 'no-student-id'}-${index}`;
          
          return (
            <AtRiskStudentCard 
              key={uniqueKey} 
              student={student}
              courseRiskData={courseRiskData}
            />
          );
        })}
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
