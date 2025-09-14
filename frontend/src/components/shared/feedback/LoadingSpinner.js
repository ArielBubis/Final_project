import React from 'react';
import PropTypes from 'prop-types';
import { Spin } from 'antd';
import styles from '../../../styles/base/BaseCard.module.css';

/**
 * LoadingSpinner - Consistent loading state component
 */
const LoadingSpinner = ({ 
    size = 'default',
    tip = 'Loading...',
    spinning = true,
    children,
    className = '',
    style = {}
}) => {
    if (children) {
        return (
            <Spin size={size} tip={tip} spinning={spinning} className={className} style={style}>
                {children}
            </Spin>
        );
    }

    return (
        <div className={`${styles.loadingContainer} ${className}`} style={style}>
            <Spin size={size} />
            {tip && <p style={{ marginTop: 16, color: '#7f8c8d' }}>{tip}</p>}
        </div>
    );
};

LoadingSpinner.propTypes = {
    size: PropTypes.oneOf(['small', 'default', 'large']),
    tip: PropTypes.string,
    spinning: PropTypes.bool,
    children: PropTypes.node,
    className: PropTypes.string,
    style: PropTypes.object
};

export default LoadingSpinner;