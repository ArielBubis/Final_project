import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Spin, Alert, Badge, Statistic, Row, Col, Input, Select, Slider, Checkbox, Button, Space, Divider } from 'antd';
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
  // Show all students that have ML scores; downstream UI will color by level
  const filterAtRiskStudents = (studentList) => {
    if (!studentList || !Array.isArray(studentList)) return [];
    return studentList.filter(s => s.mlRiskScore !== undefined);
  };
  // raw (unfiltered) students
  const [rawStudents, setRawStudents] = useState(filterAtRiskStudents(propStudents) || []);
  // filtered students for display
  const [students, setStudents] = useState(filterAtRiskStudents(propStudents) || []);
  const [loading, setLoading] = useState(propLoading || false);
  const [error, setError] = useState(propError || null);
  const [summary, setSummary] = useState(null);
  const [usingCsvData, setUsingCsvData] = useState(false);
  const [courseRiskData, setCourseRiskData] = useState([]);
  // Filter state
  const [nameQuery, setNameQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(undefined);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState([]); // e.g. ['high','medium']
  const [riskScoreRange, setRiskScoreRange] = useState([0,100]);
  const [academicScoreRange, setAcademicScoreRange] = useState([0,100]);
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
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
          const clean = filterAtRiskStudents(atRiskResponse.students);
          setRawStudents(clean);
          setStudents(clean);
          setSummary(atRiskResponse.summary);
          setUsingCsvData(true);
          setError(null);
        } else {
          // Fall back to prop data if available
          if (propStudents) {
            const clean = filterAtRiskStudents(propStudents);
            setRawStudents(clean);
            setStudents(clean);
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
          const clean = filterAtRiskStudents(propStudents);
          setRawStudents(clean);
          setStudents(clean);
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
      const clean = filterAtRiskStudents(propStudents);
      setRawStudents(clean);
      setStudents(clean);
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

  // Derive available courses (from courseRiskData or student objects)
  const courseOptions = useMemo(() => {
    const names = new Set();
    courseRiskData.forEach(c => { if (c?.courseName) names.add(c.courseName); });
    rawStudents.forEach(s => {
      if (Array.isArray(s.courses)) {
        s.courses.forEach(c => { if (c?.courseName) names.add(c.courseName); });
      } else if (s.courseName) names.add(s.courseName);
    });
    return Array.from(names).sort();
  }, [courseRiskData, rawStudents]);

  // Derive risk levels from data
  const riskLevelOptions = useMemo(() => {
    const levels = new Set();
    rawStudents.forEach(s => {
      if (s.mlRiskLevel) levels.add(String(s.mlRiskLevel).toLowerCase());
      else if (s.riskLevel) levels.add(String(s.riskLevel).toLowerCase());
      else if (s.isAtRisk) levels.add('at risk');
    });
    return Array.from(levels).sort();
  }, [rawStudents]);

  // Filtering logic
  const applyFilters = useCallback(() => {
    let filtered = [...rawStudents];
    if (nameQuery.trim()) {
      const q = nameQuery.trim().toLowerCase();
      filtered = filtered.filter(s => {
        const parts = [s.name, s.firstName, s.lastName, s.email, s.studentId, s.id]
          .filter(Boolean).map(x => String(x).toLowerCase());
        return parts.some(p => p.includes(q));
      });
    }
    if (selectedCourse) {
      filtered = filtered.filter(s => {
        if (Array.isArray(s.courses)) return s.courses.some(c => c?.courseName === selectedCourse);
        return s.courseName === selectedCourse;
      });
    }
    if (selectedRiskLevels.length > 0) {
      filtered = filtered.filter(s => {
        const level = (s.mlRiskLevel || s.riskLevel || (s.isAtRisk ? 'at risk' : '') || '').toLowerCase();
        return selectedRiskLevels.includes(level);
      });
    }
    if (atRiskOnly) {
      filtered = filtered.filter(s => {
        const level = (s.mlRiskLevel || s.riskLevel || '').toLowerCase();
        return level === 'high' || level === 'at risk' || s.isAtRisk === true;
      });
    }
    // ML risk score range
    filtered = filtered.filter(s => {
      const score = typeof s.mlRiskScore === 'number' ? s.mlRiskScore : (typeof s.riskScore === 'number' ? s.riskScore : null);
      if (score === null) return true; // keep if unknown
      return score >= riskScoreRange[0] && score <= riskScoreRange[1];
    });
    // Academic / performance score range (using scores.average or overallScore)
    filtered = filtered.filter(s => {
      const perf = (s.scores && typeof s.scores.average === 'number') ? s.scores.average : (typeof s.overallScore === 'number' ? s.overallScore : null);
      if (perf === null) return true;
      return perf >= academicScoreRange[0] && perf <= academicScoreRange[1];
    });
    setStudents(filtered);
  }, [rawStudents, nameQuery, selectedCourse, selectedRiskLevels, atRiskOnly, riskScoreRange, academicScoreRange]);

  // Re-apply filters when dependencies change
  useEffect(() => { applyFilters(); }, [applyFilters]);

  const resetFilters = () => {
    setNameQuery('');
    setSelectedCourse(undefined);
    setSelectedRiskLevels([]);
    setRiskScoreRange([0,100]);
    setAcademicScoreRange([0,100]);
    setAtRiskOnly(false);
  };
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

  const noStudents = !students || students.length === 0;
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
      {/* Filters Panel */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={<Space wrap>Filters <Badge count={students.length} style={{ backgroundColor: '#1890ff' }} /><span style={{ fontSize:12, color:'#888' }}>showing / {rawStudents.length} total</span></Space>}
        extra={<Button type="link" onClick={() => setFiltersExpanded(!filtersExpanded)}>{filtersExpanded ? 'Hide' : 'Show'}</Button>}
      >
        {filtersExpanded && (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <label style={{ fontSize:12, fontWeight:600 }}>Student Name / Email / ID</label>
                <Input
                  allowClear
                  placeholder="Search students..."
                  value={nameQuery}
                  onChange={e => setNameQuery(e.target.value)}
                />
              </Col>
              <Col xs={24} md={6}>
                <label style={{ fontSize:12, fontWeight:600 }}>Course</label>
                <Select
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Select course"
                  value={selectedCourse}
                  onChange={v => setSelectedCourse(v)}
                  options={courseOptions.map(c => ({ label: c, value: c }))}
                />
              </Col>
              <Col xs={24} md={6}>
                <label style={{ fontSize:12, fontWeight:600 }}>Risk Levels</label>
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Risk levels"
                  value={selectedRiskLevels}
                  onChange={v => setSelectedRiskLevels(v)}
                  options={riskLevelOptions.map(l => ({ label: l.toUpperCase(), value: l }))}
                />
              </Col>
              <Col xs={24} md={4}>
                <label style={{ fontSize:12, fontWeight:600 }}>At-Risk Only</label>
                <div><Checkbox checked={atRiskOnly} onChange={e => setAtRiskOnly(e.target.checked)}>Only high/at risk</Checkbox></div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <label style={{ fontSize:12, fontWeight:600 }}>ML Risk Score Range ({riskScoreRange[0]} - {riskScoreRange[1]})</label>
                <Slider
                  range
                  min={0}
                  max={100}
                  value={riskScoreRange}
                  onChange={setRiskScoreRange}
                  tooltip={{ open: false }}
                />
              </Col>
              <Col xs={24} md={12}>
                <label style={{ fontSize:12, fontWeight:600 }}>Academic Score Range ({academicScoreRange[0]} - {academicScoreRange[1]})</label>
                <Slider
                  range
                  min={0}
                  max={100}
                  value={academicScoreRange}
                  onChange={setAcademicScoreRange}
                  tooltip={{ open: false }}
                />
              </Col>
            </Row>
            <Space>
              <Button onClick={resetFilters}>Reset Filters</Button>
              <Button type="primary" onClick={applyFilters}>Apply Now</Button>
            </Space>
          </Space>
        )}
      </Card>
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
            {/* <Col span={4}>
              <Statistic 
                title="At Risk" 
                value={summary.at_risk_count} 
                valueStyle={{ color: '#f5222d' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col> */}
            {/* <Col span={4}>
              <Statistic 
                title="Risk Rate" 
                value={summary.at_risk_percentage} 
                precision={1} 
                suffix="%" 
                valueStyle={{ color: summary.at_risk_percentage > 20 ? '#f5222d' : '#52c41a' }}
              />
            </Col> */}
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
      {noStudents && (
        <Alert
          style={{ marginBottom: 16 }}
          message="No At-Risk Students Found"
          description={usingCsvData ? 
            "Great news! No students are currently flagged as at-risk by the ML model." :
            "No students identified as at risk by the ML model (adjust filters to broaden results)."
          }
          type="success"
          showIcon
        />
      )}
      {!noStudents && (
        <div className={styles.riskStudentList}>
          {students.map((student, index) => {
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
      )}
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
