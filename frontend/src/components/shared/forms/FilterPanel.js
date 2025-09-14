import React from 'react';
import PropTypes from 'prop-types';
import { Card, Space, Row, Col, Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';

/**
 * FilterPanel - Reusable filter panel component
 */
const FilterPanel = ({
    title = "Filters",
    children,
    collapsed = false,
    onToggle,
    onReset,
    onApply,
    showControls = true,
    size = 'small',
    className = '',
    ...props
}) => {
    const handleToggle = () => {
        if (onToggle) {
            onToggle(!collapsed);
        }
    };

    const handleReset = () => {
        if (onReset) {
            onReset();
        }
    };

    const handleApply = () => {
        if (onApply) {
            onApply();
        }
    };

    return (
        <Card
            size={size}
            className={className}
            title={
                <Space>
                    <FilterOutlined />
                    {title}
                </Space>
            }
            extra={
                onToggle && (
                    <Button type="link" onClick={handleToggle}>
                        {collapsed ? 'Show' : 'Hide'}
                    </Button>
                )
            }
            {...props}
        >
            {!collapsed && (
                <>
                    <div style={{ marginBottom: showControls ? 16 : 0 }}>
                        {children}
                    </div>
                    {showControls && (
                        <Row justify="end" gutter={8}>
                            <Col>
                                <Button onClick={handleReset}>
                                    Reset
                                </Button>
                            </Col>
                            <Col>
                                <Button type="primary" onClick={handleApply}>
                                    Apply
                                </Button>
                            </Col>
                        </Row>
                    )}
                </>
            )}
        </Card>
    );
};

FilterPanel.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
    collapsed: PropTypes.bool,
    onToggle: PropTypes.func,
    onReset: PropTypes.func,
    onApply: PropTypes.func,
    showControls: PropTypes.bool,
    size: PropTypes.oneOf(['small', 'default']),
    className: PropTypes.string
};

export default FilterPanel;