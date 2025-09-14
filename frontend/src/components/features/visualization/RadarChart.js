import React, { useMemo } from 'react';
import { 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Tooltip, 
  Legend 
} from 'recharts';
import styles from '../../../styles/modules/RadarChart.module.css';

/**
 * Reusable Radar Chart component for visualizing multi-dimensional performance data
 * This component encapsulates the configuration for a radar chart visualization
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - The data to visualize (array of metrics with name, value, and optional classAverage)
 * @param {number} [props.width=300] - Chart width
 * @param {number} [props.height=300] - Chart height
 * @param {boolean} [props.showLegend=true] - Whether to show the legend
 * @param {string} [props.title] - Optional title for the chart
 * @param {string} [props.studentColor='#8884d8'] - Color for student performance line
 * @param {string} [props.classColor='#82ca9d'] - Color for class average line
 * @returns {JSX.Element} - The radar chart component
 */
// import { useMemo } from 'react';

const RadarChart = ({ 
  data = [], 
  width = 300, 
  height = 300, 
  showLegend = true,
  title,
  studentColor = '#8884d8',
  classColor = '#82ca9d',
  // optional selected course (not used to change styling here but kept for memo deps)
  selectedCourse = null
}) => {
  // Transform data for the recharts radar chart; memoize to avoid unnecessary recalcs
  const formattedData = useMemo(() => data.map(item => ({
    metric: item.metric,
    student: item.value || 0,
    classAverage: item.classAverage || 0,
    // pass through raw minute values when provided for the Time Spent metric; ensure integers for display
    raw: typeof item.raw === 'number' ? Math.round(item.raw) : (item.raw || 0),
    classAverageRaw: typeof item.classAverageRaw === 'number' ? Math.round(item.classAverageRaw) : (item.classAverageRaw || 0)
  })), [data, selectedCourse]);

  // Check if we have any class average data to determine if we should show that line
  const hasClassAverageData = formattedData.some(item => item.classAverage > 0);
  
  return (    <div className={styles.container}>
      {title && <h4 className={styles.title}>{title}</h4>}
      <RechartsRadarChart 
        width={width} 
        height={height} 
        data={formattedData}
        cx="50%" 
        cy="50%"
        outerRadius="85%"  // Increased from 80%
      >
        <PolarGrid gridType="metric" />
        <PolarAngleAxis 
          dataKey="metric"
          tick={{ 
            fill: '#595959',
            fontSize: 12
          }} 
        />
        <PolarRadiusAxis 
          angle={18} 
          domain={[0, 100]}
          tick={{ 
            fill: '#595959',
            fontSize: 11 
          }}
          // ensure tick labels are integers when representing normalized percent values
          tickFormatter={(val) => Math.round(val)}
        />
        
        {/* Student performance radar */}
        <Radar 
          name="Student Performance" 
          dataKey="student" 
          stroke={studentColor} 
          fill={studentColor} 
          fillOpacity={0.6}
          strokeWidth={2}  // Added for better visibility
        />
        
        {/* Class average radar (only shown if data exists and showLegend is true) */}
        {showLegend && hasClassAverageData && (
          <Radar 
            name="Class Average" 
            dataKey="classAverage" 
            stroke={classColor} 
            fill={classColor} 
            fillOpacity={0.3} 
          />
        )}
        
        <Tooltip
          // Custom formatter: show raw minutes for Time Spent, otherwise percent label
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            // payload contains entries for student and classAverage if present
            const studentEntry = payload.find(p => p.dataKey === 'student');
            const classEntry = payload.find(p => p.dataKey === 'classAverage');
            // Determine if this is the Time Spent metric
            const isTimeSpent = label && label.toLowerCase().includes('time');

            return (
              <div style={{ background: '#fff', padding: 8, border: '1px solid #eee' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                {isTimeSpent ? (
                  <div>
                    {(() => {
                      const studentMinutes = studentEntry?.payload?.raw;
                      const classMinutes = classEntry?.payload?.classAverageRaw;
                      const hasStudentMinutes = typeof studentMinutes === 'number' && studentMinutes >= 0;
                      const hasClassMinutes = typeof classMinutes === 'number' && classMinutes >= 0;
                      return (
                        <>
                          <div style={{ color: studentEntry?.stroke || '#000' }}>
                            {hasStudentMinutes
                              ? `Student: ${Math.round(studentMinutes || 0)} mins`
                              : `Student: ${Math.round(studentEntry?.value || 0)}%`}
                          </div>
                          {classEntry && (
                            <div style={{ color: classEntry?.stroke || '#666' }}>
                              {hasClassMinutes
                                ? `Class Avg: ${Math.round(classMinutes || 0)} mins`
                                : `Class Avg: ${Math.round(classEntry?.value || 0)}%`}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div>
                    <div style={{ color: studentEntry?.stroke || '#000' }}>
                      Student: {Math.round(studentEntry?.value || 0)}%
                    </div>
                    {classEntry && (
                      <div style={{ color: classEntry?.stroke || '#666' }}>
                        Class Avg: {Math.round(classEntry?.value || 0)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }}
        />
        
        {/* Only show legend if specified */}
        {showLegend && <Legend />}
      </RechartsRadarChart>
    </div>
  );
};

export default React.memo(RadarChart);