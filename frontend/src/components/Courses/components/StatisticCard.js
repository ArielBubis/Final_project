import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../../styles/modules/StatisticCard.module.css';

const StatisticCard = ({ title, value, metricType }) => {
  const getMetricColor = (type, val) => {
    const colorSchemes = {
      enrolledStudents: val >= 20 ? '#10B981' : val >= 10 ? '#F59E0B' : '#EF4444',
      completion: val >= 80 ? '#10B981' : val >= 60 ? '#F59E0B' : '#EF4444',
      averageScore: val >= 85 ? '#10B981' : val >= 70 ? '#F59E0B' : '#EF4444',
      activeStudents: val >= 5 ? '#10B981' : val >= 1 ? '#F59E0B' : '#EF4444'
    };
    return colorSchemes[type] || '#10B981';
  };

  const getTrendIcon = (type, val) => {
    const benchmarks = {
      enrolledStudents: 15,
      completion: 75,
      averageScore: 80,
      activeStudents: 3
    };
    const benchmark = benchmarks[type] || 0;
    
    if (val > benchmark) return '↑';
    if (val < benchmark) return '↓';
    return '→';
  };

  const getIconColor = (icon) => {
    switch (icon) {
      case '↑': return '#10B981'; // green
      case '↓': return '#EF4444'; // red
      default: return '#6B7280'; // gray
    }
  };

  const numericValue = parseFloat(value);
  const trendIcon = getTrendIcon(metricType, numericValue);
  const metricColor = getMetricColor(metricType, numericValue);
  return (
    <div className={styles.statisticCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>{title}</h3>
        {metricType !== 'enrolledStudents' && (
          <span 
            className={styles.trendIcon} 
            style={{ color: getIconColor(trendIcon) }}
            role="img" 
            aria-label={`Trend ${trendIcon === '↑' ? 'up' : trendIcon === '↓' ? 'down' : 'stable'}`}
          >
            {trendIcon}
          </span>
        )}
      </div>
      <div className={styles.valueContainer}>
        <span className={styles.value} style={{ color: metricColor }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      {metricType !== 'enrolledStudents' && (
        <div className={styles.benchmark}>
          Target: {metricType === 'completion' || metricType === 'averageScore' ? '80%' : 
                  metricType === 'activeStudents' ? '5 active' : 'N/A'}
        </div>
      )}
    </div>
  );
};

StatisticCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  metricType: PropTypes.oneOf(['enrolledStudents', 'completion', 'averageScore', 'activeStudents']).isRequired
};

export default StatisticCard;