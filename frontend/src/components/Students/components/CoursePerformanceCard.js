import React from 'react';
import { Card as AntCard, Row, Col, Statistic, Progress, Alert, Table, Badge, Divider } from 'antd';
import { WarningOutlined, SafetyOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import styles from '../../../styles/modules/Students.module.css';
import { getCourseRiskData, formatCourseRiskData, getCourseRiskColor, getCourseRiskIcon } from '../../../utils/courseRiskUtils';

const CoursePerformanceCard = ({ course, studentId, riskData }) => {
  // Get course-specific risk data
  const courseRisk = getCourseRiskData(riskData, studentId, course?.id);
  const formattedRiskData = courseRisk ? formatCourseRiskData(courseRisk) : null;

  return (
    <AntCard 
      key={course?.id} 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{course?.courseName || "Unnamed Course"}</span>
        </div>
      } 
      className={styles.courseCard}
    >
      {/* Course Risk Assessment Section */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          {courseRisk && formattedRiskData && (course?.summary?.overallScore || 0) <= 70 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <span style={{ marginLeft: 8 }}>Risk Assessment</span>
              </h4>
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={12}>
                  <Statistic
                    title="Confidence"
                    value={formattedRiskData.confidence || 'Unknown'}
                    suffix="%"
                    valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                  />
                </Col>
              </Row>
              {formattedRiskData?.riskFactors && formattedRiskData.riskFactors.length > 0 && (
                <Alert
                  message="Risk Factors"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {formattedRiskData.riskFactors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  icon={<WarningOutlined />}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
          )}
        </Col>
        
        <Col xs={24} md={12}>
          <Row gutter={[16, 16]}>
            <Col xs={12}>
              <Statistic
                title="Overall Score"
                value={`${Math.round(course?.summary?.overallScore || 0)}%`}
                valueStyle={{ color: (course?.summary?.overallScore || 0) > 70 ? '#3f8600' : ((course?.summary?.overallScore || 0) > 50 ? '#faad14' : '#cf1322') }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title="Total Time Spent"
                value={`${Math.round((course?.summary?.totalTimeSpent || 0) / 60)} Hours`}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </Col>
      </Row>

      <Divider />
      
      {/* Module Progress Section */}
      <h3>Module Progress</h3>
      <Row gutter={[16, 16]}>
        {Array.isArray(course.modules) && course.modules.length > 0 ? (
          course.modules.map((module) => (
            <Col xs={24} md={8} key={module?.id || Math.random()}>
              <AntCard title={module?.moduleTitle || "Unnamed Module"} size="small">
                <Progress 
                  percent={Math.round((module?.progress?.completion || 0))} 
                  status={(module?.progress?.completion || 0) === 100 ? "success" : "active"}
                />
                <p><strong>Module Score:</strong> {Math.round((module?.progress?.totalExpertiseRate || 0))}%</p>
                <p><strong>Last Activity:</strong> {
                  (module?.progress?.lastAccessed) ? 
                    (typeof module.progress.lastAccessed.toDate === 'function'
                      ? new Date(module.progress.lastAccessed.toDate()).toLocaleDateString()
                      : typeof module.progress.lastAccessed === 'string'
                        ? new Date(module.progress.lastAccessed).toLocaleDateString()
                        : 'Never')
                    : 'Never'
                }</p>
              </AntCard>
            </Col>
          ))
        ) : (
          <Col span={24}>
            <Alert message="No module data available" type="info" />
          </Col>
        )}
      </Row>
      
      <h3>Assignment Progress</h3>
      {Array.isArray(course.assignments) && course.assignments.length > 0 ? (
        <Table
          dataSource={course.assignments.map(a => ({...a, key: a?.id || Math.random()}))}
          columns={[
            {
              title: 'Assignment',
              dataIndex: 'title',
              key: 'title',
              render: (text) => text || 'Unnamed Assignment'
            },
            {
              title: 'Score',
              dataIndex: 'progress',
              key: 'score',
              render: (progress) => {
                if (!progress) return 'Not submitted';
                // Check for both possible score fields
                const score = progress.totalScore || progress.currentScore;
                return score ? `${Math.round(score)}%` : 'Not submitted';
              }
            },
            {
              title: 'Submitted',
              dataIndex: 'progress',
              key: 'submitted',
              render: (progress) => {
                try {
                  if (!progress) return 'Not submitted';
                  
                  // Check for both possible submission date fields
                  const submissionDate = progress.submittedAt || progress.submissionDate;
                  if (!submissionDate) return 'Not submitted';
                  
                  if (typeof submissionDate.toDate === 'function') {
                    return new Date(submissionDate.toDate()).toLocaleDateString();
                  } else if (typeof submissionDate === 'string') {
                    return new Date(submissionDate).toLocaleDateString();
                  } else if (submissionDate instanceof Date) {
                    return submissionDate.toLocaleDateString();
                  } else {
                    return 'Date format error';
                  }
                } catch (e) {
                  console.error('Error rendering submission date:', e, progress);
                  return 'Date error';
                }
              }
            },
            {
              title: 'Time Spent',
              dataIndex: 'progress',
              key: 'time',
              render: (progress) => {
                if (!progress) return 'N/A';
                // Check for both possible time fields
                const timeSpent = progress.totalTime || progress.timeSpentMinutes;
                return timeSpent ? `${Math.round(timeSpent / 60)} hours` : 'N/A';
              }
            }
          ]}
          pagination={false}
          size="small"
        />
      ) : (
        <Alert message="No assignment data available" type="info" />
      )}
    </AntCard>
  );
};

export default CoursePerformanceCard;
