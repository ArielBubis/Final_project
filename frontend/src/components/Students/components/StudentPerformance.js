import React, { useState } from 'react';
import { Card as AntCard, Row, Col, Empty, Switch, Space } from 'antd';
import styles from '../../../styles/modules/Students.module.css';
import RadarChart from '../../Visualization/RadarChart';
import PerformanceMetricsLegend from '../../Visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../../utils/dataProcessingUtils';
import debugLogger from '../../../utils/debugLogger';
import { useLanguage } from '../../../contexts/LanguageContext';

const StudentPerformance = ({ student, classAverage = null, style }) => {
  const { t } = useLanguage();
  const [showClassAverage, setShowClassAverage] = useState(false);
  
  const radarChartData = student ? generateRadarChartData(student, classAverage) : [];
  
  debugLogger.logDebug('StudentPerformance', 'Render with data', { 
    hasStudent: !!student,
    studentId: student?.id,
    radarChartDataLength: radarChartData.length,
    hasClassAverage: !!classAverage,
    classAverageData: classAverage
  });
    const performanceMetrics = student ? [
    { 
      name: t('PerformanceMetrics', 'Overall Score'), 
      value: student.averageScore || 0,
      explanation: t('PerformanceMetrics', 'Average score across all courses weighted by course credits'),
      comparisonValue: classAverage?.averageScore || 0
    },
    { 
      name: t('PerformanceMetrics', 'Course Completion'), 
      value: student.completionRate || 0,
      explanation: t('PerformanceMetrics', 'Percentage of course material accessed and completed'),
      comparisonValue: classAverage?.completionRate || 0
    },
    { 
      name: t('PerformanceMetrics', 'Assignment Completion'), 
      value: student?.courses?.length ? 
      student.courses.reduce((sum, course) => {
        if (!Array.isArray(course?.assignments) || course.assignments.length === 0) return sum;
        const completedAssignments = course.assignments.filter(a => 
          a?.progress?.submittedAt || a?.progress?.submissionDate
        ).length;
        return sum + (completedAssignments / course.assignments.length * 100);
      }, 0) / student.courses.length : 0,
      explanation: t('PerformanceMetrics', 'Percentage of assignments submitted across all enrolled courses'),
      comparisonValue: classAverage?.submissionRate || 0
    }
  ] : [];

  return (
    <AntCard 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('PerformanceMetrics', 'Performance Metrics')}</span>
          <Space>
            <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
              {t('PerformanceMetrics', 'Show Class Average')}
            </span>
            <Switch
              checked={showClassAverage}
              onChange={setShowClassAverage}
              size="small"
              disabled={!classAverage || radarChartData.every(metric => metric.classAverage === 0)}
            />
          </Space>
        </div>
      }
      className={`${styles.chartCard} ${styles.cardContent}`}
      style={style}
      bodyStyle={{ padding: 24 }}
    >
      {radarChartData.length > 0 ? (
        <>
          <div className={styles.chartWrapper}>
            <RadarChart 
              data={radarChartData}
              width={500}
              height={300}
              showLegend={showClassAverage}
              studentColor="#722ed1"
              classColor="#82ca9d"
            />          </div>
          <div className={styles.legendWrapper}>
            <PerformanceMetricsLegend 
              metrics={performanceMetrics}
              showComparison={showClassAverage}
              comparisonData={classAverage}
            />
          </div>
        </>
      ) : (
        <Empty description={t('PerformanceMetrics', 'No performance data available')} />
      )}
    </AntCard>
  );
};

export default StudentPerformance;
