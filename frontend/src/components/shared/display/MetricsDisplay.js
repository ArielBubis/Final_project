import React from 'react';
import PropTypes from 'prop-types';
import { Progress, Tag, Space } from 'antd';
import { 
    getPerformanceColor, 
    getRiskLevelColor, 
    formatDisplayValue 
} from '../cardUtils';
import styles from '../../../styles/base/BaseCard.module.css';

/**
 * MetricsDisplay - Reusable component for displaying performance metrics
 */
const MetricsDisplay = ({
    metrics = [],
    layout = 'horizontal', // horizontal, vertical, grid
    showProgress = true,
    showTags = false,
    compact = false,
    className = ''
}) => {
    const renderMetric = (metric, index) => {
        const {
            label,
            value,
            type = 'performance', // performance, risk, general
            unit = '',
            max = 100,
            showValue = true,
            color,
            status
        } = metric;

        const displayValue = formatDisplayValue(value, unit === '%');
        const numericValue = typeof value === 'number' ? value : 0;

        // Determine styling based on type
        const getMetricColor = () => {
            if (color) return color;
            switch (type) {
                case 'performance':
                    return getPerformanceColor(numericValue);
                case 'risk':
                    return getRiskLevelColor(value);
                default:
                    return 'default';
            }
        };

        const metricColor = getMetricColor();

        if (compact) {
            return (
                <div key={index} className={styles.statRow}>
                    <span className={styles.statLabel}>{label}:</span>
                    {showTags ? (
                        <Tag color={metricColor}>
                            {displayValue}{unit}
                        </Tag>
                    ) : (
                        <span 
                            className={`${styles.statValue} ${styles[metricColor]}`}
                            style={{ color: typeof metricColor === 'string' && metricColor.startsWith('#') ? metricColor : undefined }}
                        >
                            {displayValue}{unit}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div key={index} className={styles.statRow}>
                <span className={styles.statLabel}>{label}:</span>
                {showProgress ? (
                    <div style={{ flex: 1, marginLeft: 8 }}>
                        <Progress
                            percent={numericValue}
                            size="small"
                            status={status}
                            strokeColor={typeof metricColor === 'string' && metricColor.startsWith('#') ? metricColor : undefined}
                            showInfo={showValue}
                            format={() => `${displayValue}${unit}`}
                        />
                    </div>
                ) : showTags ? (
                    <Tag color={metricColor}>
                        {displayValue}{unit}
                    </Tag>
                ) : (
                    <span className={styles.statValue}>
                        {displayValue}{unit}
                    </span>
                )}
            </div>
        );
    };

    const getLayoutStyle = () => {
        switch (layout) {
            case 'vertical':
                return { display: 'flex', flexDirection: 'column', gap: '8px' };
            case 'grid':
                return { 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '8px' 
                };
            default:
                return { display: 'flex', flexDirection: 'column', gap: '4px' };
        }
    };

    return (
        <div 
            className={`${styles.cardStats} ${className}`}
            style={getLayoutStyle()}
        >
            {metrics.map(renderMetric)}
        </div>
    );
};

MetricsDisplay.propTypes = {
    metrics: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
            type: PropTypes.oneOf(['performance', 'risk', 'general']),
            unit: PropTypes.string,
            max: PropTypes.number,
            showValue: PropTypes.bool,
            color: PropTypes.string,
            status: PropTypes.oneOf(['normal', 'exception', 'active', 'success'])
        })
    ).isRequired,
    layout: PropTypes.oneOf(['horizontal', 'vertical', 'grid']),
    showProgress: PropTypes.bool,
    showTags: PropTypes.bool,
    compact: PropTypes.bool,
    className: PropTypes.string
};

export default MetricsDisplay;