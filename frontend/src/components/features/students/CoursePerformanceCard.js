import React from 'react';
import { Card as AntCard, Row, Col, Statistic, Progress, Alert, Table, Divider, Tag } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import styles from '../../../styles/modules/Students.module.css';
import { getCourseRiskData, formatCourseRiskData } from '../../../utils/courseRiskUtils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { formatSubmissionDate, formatLastActivity } from '../../../utils/firebaseUtils';
import { 
  getRiskLevelText, 
  getConfidenceColor,
  formatDisplayValue 
} from '../../shared/cardUtils';

const CoursePerformanceCard = ({ course, studentId, riskData, mlRiskData }) => {
  const { t } = useLanguage();
  // Get course-specific risk data
  const courseRisk = getCourseRiskData(riskData, studentId, course?.id);
  const formattedRiskData = courseRisk ? formatCourseRiskData(courseRisk) : null;
  
  // Get ML-specific risk data for this course
  const courseMLRisk = mlRiskData ? getCourseRiskData(mlRiskData, studentId, course?.id) : null;
  
  // Helper function to get ML risk level color
  const getMLRiskLevelColor = (level) => {
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
      case 'high': return '#f5222d';
      case 'medium': return '#fa8c16';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };
  
  // Helper function to get ML risk icon
  const getMLRiskIcon = (level) => {
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
      case 'high': return <ExclamationCircleOutlined />;
      case 'medium': return <WarningOutlined />;
      case 'low': return <SafetyOutlined />;
      default: return <ExclamationCircleOutlined />;
    }
  };

  return (
    <AntCard 
      key={course?.id} 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{course?.courseName || t('PerformanceMetrics', 'Unnamed Course')}</span>
        </div>
      } 
      className={styles.courseCard}
    >
      {/* ML Risk Assessment Section */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          {courseMLRisk && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {getMLRiskIcon(courseMLRisk.mlRiskLevel)}
                <span>{t('PerformanceMetrics', 'ML Risk Assessment')}</span>
                <Tag color={getMLRiskLevelColor(courseMLRisk.mlRiskLevel)}>
                  {getRiskLevelText(courseMLRisk.mlRiskLevel, courseMLRisk.isAtRisk)}
                </Tag>
              </h4>
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={12}>
                  <Statistic
                    title={t('PerformanceMetrics', 'Risk Score')}
                    value={formatDisplayValue(courseMLRisk.mlRiskScore, true)}
                    suffix="%"
                    valueStyle={{ 
                      color: getMLRiskLevelColor(courseMLRisk.mlRiskLevel), 
                      fontSize: '16px' 
                    }}
                  />
                </Col>
                {courseMLRisk.confidence && (
                  <Col xs={12}>
                    <Statistic
                      title={t('PerformanceMetrics', 'Confidence')}
                      value={courseMLRisk.confidence}
                      suffix=""
                      valueStyle={{ 
                        color: getConfidenceColor ? getConfidenceColor(courseMLRisk.confidence) : '#1890ff', 
                        fontSize: '16px' 
                      }}
                    />
                  </Col>
                )}
              </Row>
              {courseMLRisk.mlRiskFactors && courseMLRisk.mlRiskFactors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#7f8c8d' }}>Risk Factors:</h5>
                  <div>
                    {courseMLRisk.mlRiskFactors.map((factor, index) => (
                      <Tag key={index} color="volcano" style={{ marginBottom: 4 }}>
                        {factor}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Fallback to traditional risk assessment if no ML data */}
          {!courseMLRisk && courseRisk && formattedRiskData && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <WarningOutlined style={{ marginRight: 8 }} />
                <span>{t('PerformanceMetrics', 'Risk Assessment')}</span>
              </h4>
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={12}>
                  <Statistic
                    title={t('PerformanceMetrics', 'Confidence')}
                    value={formattedRiskData.confidence || 'Unknown'}
                    suffix=""
                    valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                  />
                </Col>
              </Row>
              {formattedRiskData?.riskFactors && formattedRiskData.riskFactors.length > 0 && (
                <Alert
                  message={t('PerformanceMetrics', 'Risk Factors')}
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
                title={t('PerformanceMetrics', 'Overall Score')}
                value={`${Math.round(course?.summary?.overallScore || 0)}`}
                valueStyle={{ color: (course?.summary?.overallScore || 0) > 70 ? '#3f8600' : ((course?.summary?.overallScore || 0) > 50 ? '#faad14' : '#cf1322') }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title={t('PerformanceMetrics', 'Time spent')}
                value={`${Math.round((course?.summary?.totalTimeSpent || 0) / 60)} ${t('PerformanceMetrics', 'Hours')}`}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </Col>
      </Row>

      <Divider />
      
      {/* Module Progress Section */}
      <h3>{t('PerformanceMetrics', 'Module Progress')}</h3>
      <Row gutter={[16, 16]}>
        {Array.isArray(course.modules) && course.modules.length > 0 ? (
          course.modules.map((module) => (
            <Col xs={24} md={8} key={module?.id || Math.random()}>
              <AntCard title={module?.moduleTitle || t('PerformanceMetrics', 'Unnamed Module')} size="small">
                <Progress 
                  percent={Math.round((module?.progress?.completion || 0))} 
                  status={(module?.progress?.completion || 0) === 100 ? "success" : "active"}
                />
                <p><strong>{t('PerformanceMetrics', 'Module Score')}:</strong> {Math.round((module?.progress?.totalExpertiseRate || 0))}</p>
                <p><strong>{t('PerformanceMetrics', 'Last Activity')}:</strong> {
                  formatLastActivity(module?.progress?.lastAccessed)
                }</p>
              </AntCard>
            </Col>
          ))
        ) : (
          <Col span={24}>
            <Alert message={t('PerformanceMetrics', 'No module data available')} type="info" />
          </Col>
        )}
      </Row>
      
      <h3>{t('PerformanceMetrics', 'Assignment Progress')}</h3>
      {Array.isArray(course.assignments) && course.assignments.length > 0 ? (
        <Table
          dataSource={course.assignments.map(a => ({...a, key: a?.id || Math.random()}))}
          columns={[
            {
              title: t('PerformanceMetrics', 'Assignment'),
              dataIndex: 'title',
              key: 'title',
              render: (text) => text || t('PerformanceMetrics', 'Unnamed Assignment')
            },
            {
              title: t('PerformanceMetrics', 'Score'),
              dataIndex: 'progress',
              key: 'score',
              render: (progress) => {
                if (!progress) return t('PerformanceMetrics', 'Not submitted');
                // Check for both possible score fields
                const score = progress.totalScore || progress.currentScore;
                return score ? `${Math.round(score)}` : t('PerformanceMetrics', 'Not submitted');
              }
            },
            {
              title: t('PerformanceMetrics', 'Submitted'),
              dataIndex: 'progress',
              key: 'submitted',
              render: (progress) => formatSubmissionDate(progress, t)
            },
            {
              title: t('PerformanceMetrics', 'Time Spent'),
              dataIndex: 'progress',
              key: 'time',
              render: (progress) => {
                if (!progress) return 'N/A';
                // Check for both possible time fields
                const timeSpent = progress.totalTime || progress.timeSpentMinutes;
                return timeSpent ? `${Math.round(timeSpent / 60)} ${t('PerformanceMetrics', 'Hours')}` : 'N/A';
              }
            }
          ]}
          pagination={false}
          size="small"
        />
      ) : (
        <Alert message={t('PerformanceMetrics', 'No assignment data available')} type="info" />
      )}
    </AntCard>
  );
};

export default CoursePerformanceCard;
