import React, { useState, useMemo } from 'react';
import { Card as AntCard, Row, Col, Empty, Switch, Space, Select } from 'antd';
import styles from '../../../styles/modules/StudentPerformance.module.css';
import RadarChart from '../visualization/RadarChart';
import PerformanceMetricsLegend from '../visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../../utils/dataProcessingUtils';
import debugLogger from '../../../utils/debugLogger';
import { useLanguage } from '../../../contexts/LanguageContext';

const StudentPerformance = ({ student, classAverage = null, style, selectedCourse = 'all', onCourseChange = () => {} }) => {
  const { t } = useLanguage();
  const [showClassAverage, setShowClassAverage] = useState(false);
  
  const radarChartData = student ? generateRadarChartData(student, classAverage, { selectedCourseId: selectedCourse }) : [];
  // Diagnostic: log imported component types to help catch undefined imports that cause React to crash
  // (This will be removed after root cause is fixed)
  if (process.env.NODE_ENV !== 'production') {
    try {
      // eslint-disable-next-line no-console
      console.log('StudentPerformance imports types:', {
        RadarChartType: typeof RadarChart,
        PerformanceMetricsLegendType: typeof PerformanceMetricsLegend,
        AntCardType: typeof AntCard,
        SelectType: typeof Select
      });
    } catch (e) {
      // ignore
    }
  }

  // Provide graceful fallbacks to avoid the "Element type is invalid" React crash
  const RadarChartSafe = typeof RadarChart === 'function' || typeof RadarChart === 'object' ? RadarChart : (() => {
    // eslint-disable-next-line no-console
    console.error('RadarChart import is undefined or invalid. Rendering placeholder.');
    return <div style={{ padding: 16, color: '#f00' }}>Radar chart failed to load</div>;
  });

  const PerformanceMetricsLegendSafe = typeof PerformanceMetricsLegend === 'function' || typeof PerformanceMetricsLegend === 'object' ? PerformanceMetricsLegend : (() => {
    // eslint-disable-next-line no-console
    console.error('PerformanceMetricsLegend import is undefined or invalid. Rendering placeholder.');
    return <div style={{ padding: 16, color: '#f00' }}>Performance legend failed to load</div>;
  });

  debugLogger.logDebug('StudentPerformance', 'Render with data', { 
    hasStudent: !!student,
    studentId: student?.id,
    radarChartDataLength: radarChartData.length,
    hasClassAverage: !!classAverage,
    classAverageData: classAverage
  });
  // Build the metrics table values based on the currently selected course.
  // The table must always show the student's metrics (ignore the Show Class Average toggle).
  const performanceMetrics = useMemo(() => {
    if (!student) return [];

    // Helper to find metric entry from radarChartData by normalized metric name
    const findMetric = (name) => radarChartData.find(m => m.metric.toLowerCase().includes(name.toLowerCase())) || null;

    const overall = findMetric('overall') || {};
    const completion = findMetric('completion') || {};
    const submission = findMetric('submission') || {};
    const expertise = findMetric('expertise') || {};
    const time = findMetric('time') || {};

    // Use student values only (prefer radarChartData student values when present)
    const overallVal = typeof overall.value === 'number' ? Math.round(overall.value) : Math.round(student.averageScore || 0);
    const completionVal = typeof completion.value === 'number' ? Math.round(completion.value) : Math.round(student.completionRate || 0);
    const submissionVal = typeof submission.value === 'number' ? Math.round(submission.value) : Math.round(student.submissionRate || 0);
    const expertiseVal = typeof expertise.value === 'number' ? Math.round(expertise.value) : Math.round(student.expertiseRate || 0);

    // Time: convert minutes -> hours for the TABLE only and display as an integer with 'h' suffix
    const studentTimeMinutes = typeof time.raw === 'number' ? time.raw : (student.totalTimeSpent || student.timeSpent || 0);
    const studentHours = Math.round(studentTimeMinutes / 60);
    const classTimeMinutes = typeof time.classAverageRaw === 'number' ? time.classAverageRaw : (classAverage?.timeSpent || 0);
    const classHours = Math.round(classTimeMinutes / 60);

    return [
      {
        name: t('PerformanceMetrics', 'Overall Score'),
        value: overallVal,
        explanation: t('PerformanceMetrics', 'Average score across all courses weighted by course credits'),
        comparisonValue: classAverage?.averageScore ?? 0
      },
      {
        name: t('PerformanceMetrics', 'Course Completion'),
        value: completionVal,
        explanation: t('PerformanceMetrics', 'Percentage of course material accessed and completed'),
        comparisonValue: classAverage?.completion ?? 0
      },
      {
        name: t('PerformanceMetrics', 'Assignment Completion'),
        value: submissionVal,
        explanation: t('PerformanceMetrics', 'Percentage of assignments submitted across all enrolled courses'),
        comparisonValue: classAverage?.submissionRate ?? 0
      },
      {
        name: t('PerformanceMetrics', 'Time Spent'),
        // Display hours with 'h' suffix in the TABLE only
        value: `${studentHours}h`,
        explanation: t('PerformanceMetrics', 'Total time spent (hours)'),
        comparisonValue: `${classHours}h`
      }
    ];
  }, [radarChartData, selectedCourse, student, classAverage, t]);

  return (
    <AntCard 
      title={
        <div>
          {/* First Row: Title */}
          <div className={styles.titleRow}>
            <span>{t('PerformanceMetrics', 'Performance Metrics')}</span>
          </div>

          {/* Second Row: Course Filter and Toggle Button */}
          <div className={styles.filterRow}>
            <Select
              value={selectedCourse}
              onChange={onCourseChange}
              placeholder={t('PerformanceMetrics', 'Select a course')}
              options={[
                { value: 'all', label: t('PerformanceMetrics', 'All Courses') },
                ...(student?.courses?.map(course => ({
                  value: course.id,
                  label: course.courseName || t('PerformanceMetrics', 'Unnamed Course'),
                })) || [])
              ]}
              style={{ width: 200, marginRight: '16px' }}
            />
            <Space>
              <span className={styles.toggleLabel}>
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
        </div>
      }
      className={`${styles.chartCard} ${styles.cardContent}`}
      style={style}
      bodyStyle={{ padding: 24 }}
    >
      {radarChartData.length > 0 ? (
        <>
          <div className={styles.chartWrapper}>
            <RadarChartSafe 
              data={radarChartData}
              width={500}
              height={300}
              showLegend={showClassAverage}
              studentColor="#722ed1"
              classColor="#82ca9d"
            />
          </div>
          <div className={styles.legendWrapper}>
            <PerformanceMetricsLegendSafe 
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
