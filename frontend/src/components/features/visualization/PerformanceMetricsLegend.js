import React from 'react';
import PropTypes from 'prop-types';

/**
 * A reusable component for displaying performance metrics with visual indicators
 * This component provides a consistent way to display performance metrics across the application
 * 
 * @param {Object} props - Component props
 * @param {Array} props.metrics - Array of metric objects with name and value properties
 * @param {boolean} [props.showComparison=false] - Whether to show comparison data
 * @param {Object} [props.comparisonData] - Optional comparison data
 * @param {string} [props.title] - Optional title for the metrics display
 * @returns {JSX.Element} - The performance metrics legend component
 */
const PerformanceMetricsLegend = ({ 
  metrics = [], 
  showComparison = false,
  comparisonData = null,
  title = "Performance Metrics"
}) => {
  // Helper function to determine color based on value
  const getColorForValue = (value, metricName = '') => {
    // Special case for time spent which doesn't follow the "higher is better" rule
    if (metricName.toLowerCase().includes('time') || metricName.toLowerCase().includes('duration')) {
      return '#722ed1'; // Purple for neutral time metrics
    }
    // Coerce numeric value if provided as a string like '75%' or '3h'
    let numeric = value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.\-]/g, ''));
      numeric = Number.isFinite(parsed) ? parsed : NaN;
    }

    if (typeof numeric !== 'number' || Number.isNaN(numeric)) {
      return '#d9d9d9'; // neutral gray when unknown
    }

    if (numeric >= 80) return '#52c41a'; // Green for excellent
    if (numeric >= 60) return '#1890ff'; // Blue for good
    if (numeric >= 40) return '#faad14'; // Orange for average
    return '#f5222d'; // Red for poor
  };
  
  return (
    <div className="performance-metrics-legend" style={{ marginBottom: '20px' }}>
      {title && <h4 style={{ marginBottom: '10px' }}>{title}</h4>}
      
      <div className="metrics-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {metrics.map((metric, index) => (          <div 
            key={`metric-${index}`}
            className="metric-item"
            style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="metric-name" style={{ fontWeight: 500 }}>
                {metric.name}
              </span>
              {metric.explanation && (
                <span style={{ 
                  fontSize: '11px',
                  color: '#8c8c8c',
                  fontStyle: 'italic',
                  marginTop: '2px'
                }}>
                  {metric.explanation}
                </span>
              )}
            </div>
            
            <div className="metric-value-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Main metric value */}
              <div className="metric-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div 
                  className="metric-indicator" 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: getColorForValue(metric.value, metric.name) 
                  }}
                />
                  <span className="value">
                    {typeof metric.value === 'number' ? (
                      metric.name.toLowerCase().includes('time') ? `${Math.round(metric.value)}` : `${Math.round(metric.value)}%`
                    ) : metric.value}
                  </span>
              </div>
              
              {/* Comparison data if available and enabled */}
              {/* {showComparison && metric.comparisonValue !== undefined && (
                <div className="comparison-value" style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.7 }}>
                  <div 
                    className="comparison-indicator" 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: getColorForValue(metric.comparisonValue, metric.name) 
                    }}
                  />
                  <span className="value" style={{ fontSize: '0.9em' }}>
                    {typeof metric.comparisonValue === 'number' ? (
                      metric.name.toLowerCase().includes('time') ? `${Math.round(metric.comparisonValue)}` : `${Math.round(metric.comparisonValue)}%`
                    ) : metric.comparisonValue}
                  </span>
                  <span className="comparison-label" style={{ fontSize: '0.8em', opacity: 0.8 }}>
                    (avg)
                  </span>
                </div>
              )} */}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend for color indicators */}
      <div className="color-legend" style={{ marginTop: '15px', fontSize: '0.8em', color: '#666' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#52c41a' }}></div>
            <span>Excellent (80-100%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1890ff' }}></div>
            <span>Good (60-79%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#faad14' }}></div>
            <span>Average (40-59%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f5222d' }}></div>
            <span>Needs Improvement (0-39%)</span>
          </div>
        </div>
      </div>
      
    </div>
  );
};

PerformanceMetricsLegend.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    explanation: PropTypes.string,
    comparisonValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  })),
  showComparison: PropTypes.bool,
  comparisonData: PropTypes.object,
  title: PropTypes.string
};

export default React.memo(PerformanceMetricsLegend);