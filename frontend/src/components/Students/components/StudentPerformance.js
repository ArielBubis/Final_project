import React from 'react';
import { Card as AntCard, Row, Col, Empty } from 'antd';
import styles from '../../../styles/modules/Students.module.css';
import RadarChart from '../../Visualization/RadarChart';
import PerformanceMetricsLegend from '../../Visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../../utils/dataProcessingUtils';
import debugLogger from '../../../utils/debugLogger';

const StudentPerformance = ({ student, style }) => {
  const radarChartData = student ? generateRadarChartData(student) : [];
  
  debugLogger.logDebug('StudentPerformance', 'Render with data', { 
    hasStudent: !!student,
    studentId: student?.id,
    radarChartDataLength: radarChartData.length 
  });
    const performanceMetrics = student ? [
    { 
      name: 'Overall Score', 
      value: student.averageScore || 0,
      explanation: 'Average score across all courses weighted by course credits'
    },
    { 
      name: 'Course Completion', 
      value: student.completionRate || 0,
      explanation: 'Percentage of course material accessed and completed'
    },
    { 
      name: 'Assignment Completion', 
      value: student?.courses?.length ? 
      student.courses.reduce((sum, course) => {
        if (!Array.isArray(course?.assignments) || course.assignments.length === 0) return sum;
        
        const completedAssignments = course.assignments.filter(a => 
          a?.progress?.submittedAt || a?.progress?.submissionDate
        ).length;
          return sum + (completedAssignments / course.assignments.length * 100);
      }, 0) / student.courses.length : 0,
      explanation: 'Percentage of assignments submitted across all enrolled courses'
    }
  ] : [];

  return (    <AntCard 
      title="Performance Metrics" 
      className={`${styles.chartCard} ${styles.cardContent}`}
      style={style}
      bodyStyle={{ padding: 24 }}
    >
      {radarChartData.length > 0 ? (
        <>
          <div className={styles.chartWrapper}>
            <RadarChart 
              data={radarChartData}
              width={300}
              height={300}
              showLegend={false}
              studentColor="#722ed1"
            />          </div>
          <div className={styles.legendWrapper}>
            <PerformanceMetricsLegend metrics={performanceMetrics} />
          </div>
        </>
      ) : (
        <Empty description="No performance data available" />
      )}
    </AntCard>
  );
};

export default StudentPerformance;
