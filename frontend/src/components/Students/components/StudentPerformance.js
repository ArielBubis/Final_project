import React, { useState, useMemo } from 'react';
import { Card as AntCard, Row, Col, Empty, Switch, Space, Select } from 'antd';import styles from '../../../styles/modules/Students.module.css';
import RadarChart from '../../Visualization/RadarChart';
import PerformanceMetricsLegend from '../../Visualization/PerformanceMetricsLegend';
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
  // Build the metrics table values based on the currently selected course and toggle state.
  // Use radarChartData as the authoritative source for metric values (it is already computed
  // for the selected course via generateRadarChartData). When radarChartData is empty fall
  // back to existing student-level fields.
  const performanceMetrics = useMemo(() => {
    if (!student) return [];

    // Helper to find metric entry from radarChartData by normalized metric name
    const findMetric = (name) => radarChartData.find(m => m.metric.toLowerCase().includes(name.toLowerCase())) || null;

    const overall = findMetric('overall') || {};
    const completion = findMetric('completion') || {};
    const submission = findMetric('submission') || {};
    const expertise = findMetric('expertise') || {};
    const time = findMetric('time') || {};

    // Always display the student's values in the table (ignore showClassAverage toggle)
    const round = (v) => (typeof v === 'number' ? Math.round(v) : 0);

    const overallVal = round(overall.value ?? student.averageScore ?? 0);
    const completionVal = round(completion.value ?? student.completionRate ?? 0);
    const submissionVal = round(submission.value ?? student.submissionRate ?? 0);
    const expertiseVal = round(expertise.value ?? student.expertiseRate ?? 0);

    // Convert Time Spent from minutes -> hours for TABLE display only
    const studentTimeRaw = typeof time.raw === 'number' ? Math.round(time.raw) : Math.round(student.totalTimeSpent || student.timeSpent || 0);
    const studentHours = Math.round(studentTimeRaw / 60);
    const classTimeRaw = typeof time.classAverageRaw === 'number' ? Math.round(time.classAverageRaw) : Math.round(classAverage?.timeSpent || 0);
    const classHours = Math.round(classTimeRaw / 60);

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('PerformanceMetrics', 'Performance Metrics')}</span>
          </div>

          {/* Second Row: Course Filter and Toggle Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '8px' }}>
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
