import React from 'react';
import { 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Tooltip, 
  Legend 
} from 'recharts';

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
const RadarChart = ({ 
  data = [], 
  width = 300, 
  height = 300, 
  showLegend = true,
  title,
  studentColor = '#8884d8',
  classColor = '#82ca9d'
}) => {
  // Transform data for the recharts radar chart
  const formattedData = data.map(item => ({
    metric: item.metric,
    student: item.value || 0,
    classAverage: item.classAverage || 0
  }));

  // Check if we have any class average data to determine if we should show that line
  const hasClassAverageData = formattedData.some(item => item.classAverage > 0);
  
  return (
    <div className="radar-chart-container" style={{ width: '100%', height: 'auto' }}>
      {title && <h4 style={{ textAlign: 'center', marginBottom: '10px' }}>{title}</h4>}
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
        
        <Tooltip formatter={(value) => `${Math.round(value)}%`} />
        
        {/* Only show legend if specified */}
        {showLegend && <Legend />}
      </RechartsRadarChart>
    </div>
  );
};

export default React.memo(RadarChart);