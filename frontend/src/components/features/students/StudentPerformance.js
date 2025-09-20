import React, { useMemo } from 'react';
import { Card as AntCard, Row, Col, Empty, Select } from 'antd';
import styles from '../../../styles/modules/StudentPerformance.module.css';
import RadarChart from '../visualization/RadarChart';
import PerformanceMetricsLegend from '../visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../../utils/dataProcessingUtils';
import debugLogger from '../../../utils/debugLogger';
import { useLanguage } from '../../../contexts/LanguageContext';

const StudentPerformance = ({ student, style, selectedCourse = 'all', onCourseChange = () => {} }) => {
  const { t } = useLanguage();
  
  const radarChartData = student ? generateRadarChartData(student, null, { selectedCourseId: selectedCourse }) : [];
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
    radarChartDataLength: radarChartData.length
  });
  // Build the metrics table values based on the currently selected course.
  // The table must always show the student's metrics (ignore the Show Class Average toggle).
  const performanceMetrics = useMemo(() => {
    if (!student) return [];

    // Helper to find metric entry from radarChartData by normalized metric name
    const findMetric = (name) => radarChartData.find(m => m.metric.toLowerCase().includes(name.toLowerCase())) || null;

    // Calculate average score excluding courses with grade = 0
    const calculateAverageScore = (studentData) => {
        const courses = studentData.courses || [];
        let totalScore = 0;
        let validCourses = 0;
        
        courses.forEach(course => {
            // Try multiple possible grade fields
            let grade = null;
            if (course?.summary) {
                grade = course.summary.overallScore ?? course.summary.averageScore ?? course.summary.average ?? null;
            }
            if (grade === null) {
                grade = course.averageScore ?? course.grade ?? course.finalGrade ?? course.average ?? course.score ?? null;
            }
            
            // Only count courses with valid grades > 0
            if (typeof grade === 'number' && grade > 0) {
                totalScore += grade;
                validCourses++;
            }
        });
        
        if (validCourses === 0) return 0;
        return totalScore / validCourses;
    };

    // Calculate total time spent across all courses when "All Courses" is selected
    const calculateTotalTimeSpent = (studentData) => {
        const courses = studentData.courses || [];
        let totalTime = 0;
        
        courses.forEach(course => {
            // Try multiple possible time fields
            let timeSpent = null;
            if (course?.summary) {
                timeSpent = course.summary.totalTimeSpent ?? course.summary.timeSpent ?? null;
            }
            if (timeSpent === null) {
                timeSpent = course.totalTimeSpent ?? course.timeSpent ?? 0;
            }
            
            // Add time if it's a valid number
            if (typeof timeSpent === 'number' && timeSpent > 0) {
                totalTime += timeSpent;
            }
        });
        
        return totalTime;
    };

    const overall = findMetric('overall') || {};
    const completion = findMetric('completion') || {};
    const submission = findMetric('submission') || {};
    const expertise = findMetric('expertise') || {};
    const time = findMetric('time') || {};

  // Use corrected average calculation when showing all courses
    const overallVal = selectedCourse === 'all' 
        ? Math.round(calculateAverageScore(student))
        : (typeof overall.value === 'number' ? Math.round(overall.value) : Math.round(student.averageScore || 0));
    
    const completionVal = typeof completion.value === 'number' ? Math.round(completion.value) : Math.round(student.completionRate || 0);
    const submissionVal = typeof submission.value === 'number' ? Math.round(submission.value) : Math.round(student.submissionRate || 0);
    const expertiseVal = typeof expertise.value === 'number' ? Math.round(expertise.value) : Math.round(student.expertiseRate || 0);

    // Time: calculate total when "All Courses" selected, otherwise use radar chart data
    const studentTimeMinutes = selectedCourse === 'all' 
        ? calculateTotalTimeSpent(student)
        : (typeof time.raw === 'number' ? time.raw : (student.totalTimeSpent || student.timeSpent || 0));
    const studentHours = Math.round(studentTimeMinutes / 60);

    return [
      {
        name: t('PerformanceMetrics', 'Overall Score'),
        value: `${overallVal}/100`,
        explanation: t('PerformanceMetrics', 'Average score across all courses weighted by course credits')
      },
      {
        name: t('PerformanceMetrics', 'Course Completion'),
        value: completionVal,
        explanation: t('PerformanceMetrics', 'Percentage of course material accessed and completed')
      },
      {
        name: t('PerformanceMetrics', 'Assignment Completion'),
        value: submissionVal,
        explanation: t('PerformanceMetrics', 'Percentage of assignments submitted across all enrolled courses')
      },
      {
        name: t('PerformanceMetrics', 'Time Spent'),
        // Display hours with 'h' suffix in the TABLE only
        value: `${studentHours}h`,
        explanation: t('PerformanceMetrics', 'Total time spent (hours)')
      }
    ];
  }, [radarChartData, selectedCourse, student, t]);

  return (
    <AntCard 
      title={
        <div>
          {/* First Row: Title */}
          <div className={styles.titleRow}>
            <span>{t('PerformanceMetrics', 'Performance Metrics')}</span>
          </div>

          {/* Course Filter */}
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
              style={{ width: 200 }}
            />
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
              showLegend={false}
              studentColor="#722ed1"
            />
          </div>
          <div className={styles.legendWrapper}>
            <PerformanceMetricsLegendSafe 
              metrics={performanceMetrics}
              showComparison={false}
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
