import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { navigateToRoute } from '../cardUtils';
import styles from '../../../styles/base/BaseCard.module.css';

/**
 * BaseCard Component
 * Reusable card component with configurable sections and common styling patterns
 */
const BaseCard = ({
    title,
    subtitle,
    description,
    children,
    footer,
    metadata,
    actions,
    onClick,
    navigateTo,
    className = '',
    headerExtra,
    contentClassName = '',
    ...props
}) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        if (onClick) {
            onClick();
        } else if (navigateTo) {
            navigateToRoute(navigate, navigateTo);
        }
    };

    const cardContent = (
        <div className={`${styles.baseCard} ${className}`} onClick={handleCardClick} {...props}>
            {/* Card Header */}
            {(title || subtitle || headerExtra) && (
                <div className={styles.cardHeader}>
                    <div>
                        {title && <h3 className={styles.cardTitle}>{title}</h3>}
                        {subtitle && <span className={styles.cardSubtitle}>{subtitle}</span>}
                    </div>
                    {headerExtra && <div>{headerExtra}</div>}
                </div>
            )}

            {/* Card Content */}
            <div className={`${styles.cardContent} ${contentClassName}`}>
                {description && (
                    <p className={styles.cardDescription}>{description}</p>
                )}
                {children}
            </div>

            {/* Card Footer */}
            {(footer || metadata || actions) && (
                <div className={styles.cardFooter}>
                    <div className={styles.cardMetadata}>
                        {metadata}
                    </div>
                    <div className={styles.cardActions}>
                        {footer}
                        {actions}
                    </div>
                </div>
            )}
        </div>
    );

    return cardContent;
};

BaseCard.propTypes = {
    /** Card title displayed in header */
    title: PropTypes.string,
    /** Subtitle displayed next to title */
    subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    /** Description text displayed below header */
    description: PropTypes.string,
    /** Main card content */
    children: PropTypes.node,
    /** Footer content (will be on the right side) */
    footer: PropTypes.node,
    /** Metadata displayed on the left side of footer */
    metadata: PropTypes.node,
    /** Action buttons displayed in footer */
    actions: PropTypes.node,
    /** Click handler for entire card */
    onClick: PropTypes.func,
    /** Navigation path for card click */
    navigateTo: PropTypes.string,
    /** Additional CSS classes */
    className: PropTypes.string,
    /** Extra content for card header (right side) */
    headerExtra: PropTypes.node,
    /** Additional CSS classes for content area */
    contentClassName: PropTypes.string
};

export default BaseCard;