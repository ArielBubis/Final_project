import React from 'react';
import PropTypes from 'prop-types';
import { Card, Statistic } from 'antd';

/**
 * StatCard - Reusable statistics display card
 */
const StatCard = ({
    title,
    value,
    prefix,
    suffix,
    precision,
    valueStyle,
    loading = false,
    bordered = true,
    size = 'default',
    className = '',
    ...props
}) => {
    return (
        <Card 
            bordered={bordered}
            loading={loading}
            size={size}
            className={className}
            {...props}
        >
            <Statistic
                title={title}
                value={value}
                prefix={prefix}
                suffix={suffix}
                precision={precision}
                valueStyle={valueStyle}
            />
        </Card>
    );
};

StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    prefix: PropTypes.node,
    suffix: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    precision: PropTypes.number,
    valueStyle: PropTypes.object,
    loading: PropTypes.bool,
    bordered: PropTypes.bool,
    size: PropTypes.oneOf(['small', 'default']),
    className: PropTypes.string
};

export default StatCard;