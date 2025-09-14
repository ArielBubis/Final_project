import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';
import { formatDate } from '../../../utils/firebaseUtils';
import BaseCard from '../../shared/cards/BaseCard';
import StudentDisplay from '../../shared/StudentDisplay';

/**
 * StudentCard Component (Refactored)
 * Displays student information using shared BaseCard and StudentDisplay components
 */
const StudentCard = ({ student }) => {
    const {
        id,
        name,
        grade,
        lastActive,
        performance
    } = student;

    // Create metadata and actions for the card
    const metadata = lastActive ? `Last active: ${formatDate(lastActive, 'short-date')}` : null;
    
    const actions = (
        <Button 
            type="primary" 
            size="small"
        >
            View Details
        </Button>
    );

    return (
        <BaseCard
            navigateTo={`/students/${id}`}
            metadata={metadata}
            actions={actions}
        >
            <StudentDisplay 
                student={student}
                showCourse={false}
                showGrade={true}
                showRiskInfo={false}
                showPerformance={true}
                showEngagement={false}
                showLastActive={false}
                compact={true}
            />
        </BaseCard>
    );
};

StudentCard.propTypes = {
    student: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        grade: PropTypes.string.isRequired,
        lastActive: PropTypes.string.isRequired,
        performance: PropTypes.number.isRequired
    }).isRequired
};

export default StudentCard;