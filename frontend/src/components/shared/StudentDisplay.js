import React from 'react';
import PropTypes from 'prop-types';
import { Tag, Progress } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { getStudentName } from '../../utils/studentUtils';
import { formatTimestampForDisplay } from '../../utils/firebaseUtils';
import { 
    getPerformanceColor, 
    getRiskLevelColor, 
    getRiskLevelText, 
    getRiskScoreClass,
    getConfidenceColor,
    formatDisplayValue 
} from './cardUtils';
import styles from '../../styles/base/BaseCard.module.css';

/**
 * StudentDisplay Component
 * Reusable component for displaying student information consistently across different card types
 */
const StudentDisplay = ({ 
    student, 
    showCourse = true, 
    showGrade = true, 
    showRiskInfo = false,
    showPerformance = true,
    showEngagement = true,
    showLastActive = false,
    showConfidence = false,
    showRiskFactors = false,
    compact = false
}) => {
    const studentName = getStudentName(student);
    
    return (
        <>
            {/* Student Header Information */}
            <div>
                <h3 className={styles.cardTitle}>{studentName}</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {showCourse && (student.courseName || student.courseId) && (
                        <Tag icon={<BookOutlined />} color="blue">
                            {student.courseName || student.courseId}
                        </Tag>
                    )}
                    {/* {showGrade && (student.gradeLevel || student.grade) && (
                        <Tag color="green">
                            Grade {student.gradeLevel || student.grade}
                        </Tag>
                    )} */}
                </div>
            </div>

            {/* Risk Information */}
            {showRiskInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Tag color={getRiskLevelColor(student.mlRiskLevel || student.risk_status)}>
                        {getRiskLevelText(student.mlRiskLevel || student.risk_status, student.isAtRisk)}
                    </Tag>
                    {student.mlRiskScore !== undefined && (
                        <span className={styles[getRiskScoreClass(student.mlRiskScore)]}>
                            {formatDisplayValue(student.mlRiskScore, true)}
                        </span>
                    )}
                </div>
            )}

            {/* Performance Metrics */}
            <div className={styles.cardStats}>
                {showPerformance && (student.performance !== undefined || student.finalScore !== undefined) && (
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Academic Performance:</span>
                        {compact ? (
                            <span className={`${styles.statValue} ${styles[getPerformanceColor(student.performance || student.finalScore || 0)]}`}>
                                {formatDisplayValue(student.performance || student.finalScore, true)}
                            </span>
                        ) : (
                            <Progress
                                percent={Math.round(student.performance || student.finalScore || 0)}
                                size="small"
                                status={(student.performance || student.finalScore || 0) < 60 ? 'exception' : 'normal'}
                            />
                        )}
                    </div>
                )}

                {showEngagement && (student.completion !== undefined || student.totalTimeSpentMinutes !== undefined) && (
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Engagement Score:</span>
                        {compact ? (
                            <span className={styles.statValue}>
                                {formatDisplayValue(student.completion || Math.min(100, (student.totalTimeSpentMinutes || 0) / 10), true)}
                            </span>
                        ) : (
                            <Progress
                                percent={Math.round(student.completion || Math.min(100, (student.totalTimeSpentMinutes || 0) / 10) || 0)}
                                size="small"
                            />
                        )}
                    </div>
                )}

                {showConfidence && student.confidence && (
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Prediction Confidence:</span>
                        <Tag color={getConfidenceColor(student.confidence)}>
                            {student.confidence}
                        </Tag>
                    </div>
                )}

                {showLastActive && student.lastActive && (
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Last Active:</span>
                        <span className={styles.cardMetadata}>
                            {formatTimestampForDisplay(student.lastActive, 'date')}
                        </span>
                    </div>
                )}
            </div>

            {/* Risk Factors */}
            {showRiskFactors && student.mlRiskFactors && student.mlRiskFactors.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#7f8c8d' }}>Risk Factors:</h4>
                    <div>
                        {student.mlRiskFactors.map((factor, factorIndex) => (
                            <Tag key={factorIndex} color="volcano" style={{ marginBottom: 4 }}>
                                {factor}
                            </Tag>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

StudentDisplay.propTypes = {
    student: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        courseName: PropTypes.string,
        courseId: PropTypes.string,
        gradeLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        grade: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        mlRiskLevel: PropTypes.string,
        risk_status: PropTypes.string,
        isAtRisk: PropTypes.bool,
        mlRiskScore: PropTypes.number,
        performance: PropTypes.number,
        finalScore: PropTypes.number,
        completion: PropTypes.number,
        totalTimeSpentMinutes: PropTypes.number,
        confidence: PropTypes.string,
        lastActive: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        mlRiskFactors: PropTypes.arrayOf(PropTypes.string)
    }).isRequired,
    /** Whether to show course information */
    showCourse: PropTypes.bool,
    /** Whether to show grade information */
    showGrade: PropTypes.bool,
    /** Whether to show risk level and score */
    showRiskInfo: PropTypes.bool,
    /** Whether to show performance metrics */
    showPerformance: PropTypes.bool,
    /** Whether to show engagement metrics */
    showEngagement: PropTypes.bool,
    /** Whether to show last active timestamp */
    showLastActive: PropTypes.bool,
    /** Whether to show prediction confidence */
    showConfidence: PropTypes.bool,
    /** Whether to show risk factors */
    showRiskFactors: PropTypes.bool,
    /** Whether to use compact display (text instead of progress bars) */
    compact: PropTypes.bool
};

export default StudentDisplay;