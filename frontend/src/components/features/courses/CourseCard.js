import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';
import { formatDate } from '../../../utils/firebaseUtils';
import BaseCard from '../../shared/cards/BaseCard';

/**
 * CourseCard Component (Refactored)
 * Displays course information using shared BaseCard component
 */
const CourseCard = ({ course }) => {
    const {
        id,
        name,
        description,
        studentCount,
        lastUpdated
    } = course;

    // Create metadata and actions for the card
    const metadata = lastUpdated ? `Last updated: ${formatDate(lastUpdated)}` : null;
    
    const actions = (
        <Button type="primary" size="small">
            View Details
        </Button>
    );

    const subtitle = `${studentCount} Students`;

    return (
        <BaseCard
            title={name}
            subtitle={subtitle}
            description={description}
            navigateTo={`/courses/${id}`}
            metadata={metadata}
            actions={actions}
        />
    );
};

CourseCard.propTypes = {
    course: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        studentCount: PropTypes.number.isRequired,
        progress: PropTypes.number.isRequired,
        lastUpdated: PropTypes.string.isRequired
    }).isRequired
};

export default CourseCard;