import React from 'react';
import PropTypes from 'prop-types';
import { Button as AntButton } from 'antd';

/**
 * BaseButton - Consistent button styling and behavior
 */
const BaseButton = ({ 
    variant = 'primary',
    size = 'default',
    loading = false,
    disabled = false,
    children,
    onClick,
    className = '',
    ...props 
}) => {
    const getButtonProps = () => {
        const baseProps = {
            size,
            loading,
            disabled,
            onClick,
            className,
            ...props
        };

        switch (variant) {
            case 'primary':
                return { ...baseProps, type: 'primary' };
            case 'secondary':
                return { ...baseProps, type: 'default' };
            case 'danger':
                return { ...baseProps, type: 'primary', danger: true };
            case 'ghost':
                return { ...baseProps, ghost: true };
            case 'link':
                return { ...baseProps, type: 'link' };
            default:
                return baseProps;
        }
    };

    return (
        <AntButton {...getButtonProps()}>
            {children}
        </AntButton>
    );
};

BaseButton.propTypes = {
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost', 'link']),
    size: PropTypes.oneOf(['small', 'default', 'large']),
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    className: PropTypes.string
};

export default BaseButton;