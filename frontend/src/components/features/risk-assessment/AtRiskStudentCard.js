import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';
import BaseCard from '../../shared/cards/BaseCard';
import StudentDisplay from '../../shared/StudentDisplay';
import styles from '../../../styles/components/RiskAssessment.module.css';

/**
 * AtRiskStudentCard Component (Refactored)
 * Displays at-risk student information using shared BaseCard and StudentDisplay components
 */
const AtRiskStudentCard = ({ student, courseRiskData = null }) => {
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
            navigateTo={`/students/${student.id || student.studentId}`}
            actions={actions}
            className={styles.riskStudentCard}
        >
            <StudentDisplay 
                student={student}
                showCourse={true}
                showGrade={true}
                showRiskInfo={true}
                showPerformance={true}
                showEngagement={true}
                showLastActive={true}
                showConfidence={true}
                showRiskFactors={true}
                compact={false}
            />
        </BaseCard>
    );
};

AtRiskStudentCard.propTypes = {
    student: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        courseName: PropTypes.string,
        courseId: PropTypes.string,
        gradeLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        mlRiskLevel: PropTypes.string,
        risk_status: PropTypes.string,
        isAtRisk: PropTypes.bool,
        mlRiskScore: PropTypes.number,
        performance: PropTypes.number,
        finalScore: PropTypes.number,
        completion: PropTypes.number,
        totalTimeSpentMinutes: PropTypes.number,
        lateSubmissionRate: PropTypes.number,
        confidence: PropTypes.string,
        lastActive: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        mlRiskFactors: PropTypes.arrayOf(PropTypes.string),
        probability: PropTypes.number
    }).isRequired,
    courseRiskData: PropTypes.arrayOf(PropTypes.object)
};

export default AtRiskStudentCard;