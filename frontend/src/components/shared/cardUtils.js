/**
 * Shared utilities for card components
 * Contains common functions for performance colors, navigation, and formatting
 */

/**
 * Get performance color class based on score
 * @param {number} score - Performance score (0-100)
 * @returns {string} - CSS class name for performance level
 */
export const getPerformanceColor = (score) => {
    if (score >= 80) return 'performanceHigh';
    if (score >= 60) return 'performanceMedium';
    return 'performanceLow';
};

/**
 * Get risk level color based on risk level or status
 * @param {string} level - Risk level (high, medium, low, at risk, not at risk)
 * @returns {string} - Hex color code for risk level
 */
export const getRiskLevelColor = (level) => {
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
        case 'high': 
        case 'at risk': 
            return '#f5222d';
        case 'medium': 
            return '#fa8c16';
        case 'low': 
        case 'not at risk': 
            return '#52c41a';
        default: 
            return '#1890ff';
    }
};

/**
 * Get risk level text display
 * @param {string} level - Risk level
 * @param {boolean} isAtRisk - Whether student is at risk
 * @returns {string} - Formatted risk level text
 */
export const getRiskLevelText = (level, isAtRisk) => {
    if (isAtRisk) return 'AT RISK';
    const levelLower = (level || '').toLowerCase();
    switch (levelLower) {
        case 'high': return 'HIGH RISK';
        case 'medium': return 'MEDIUM RISK';
        case 'low': return 'LOW RISK';
        case 'at risk': return 'AT RISK';
        case 'not at risk': return 'NOT AT RISK';
        default: return level ? level.toUpperCase() : 'UNKNOWN';
    }
};

/**
 * Get risk level CSS class based on score
 * @param {number} score - Risk score (0-100)
 * @returns {string} - CSS class name for risk level
 */
export const getRiskScoreClass = (score) => {
    if (score >= 70) return 'riskHigh';
    if (score >= 40) return 'riskMedium';
    return 'riskLow';
};

/**
 * Navigate to a route using either navigate function or window location
 * @param {Function|null} navigate - React Router navigate function
 * @param {string} path - Path to navigate to
 */
export const navigateToRoute = (navigate, path) => {
    if (navigate && typeof navigate === 'function') {
        navigate(path);
    } else {
        window.location.href = path;
    }
};

/**
 * Format numeric value for display
 * @param {number} value - Numeric value
 * @param {boolean} isPercentage - Whether to display as percentage
 * @returns {string} - Formatted display value
 */
export const formatDisplayValue = (value, isPercentage = false) => {
    if (value === null || value === undefined) return 'N/A';
    const rounded = Math.round(value);
    return isPercentage ? `${rounded}%` : rounded.toString();
};

/**
 * Validate that required card props exist
 * @param {Object} props - Component props
 * @param {Array} requiredFields - Array of required field names
 * @throws {Error} - If required fields are missing
 */
export const validateCardProps = (props, requiredFields) => {
    const missing = requiredFields.filter(field => !props.hasOwnProperty(field));
    if (missing.length > 0) {
        throw new Error(`Missing required props: ${missing.join(', ')}`);
    }
};

/**
 * Get confidence level color for tags
 * @param {string} confidence - Confidence level (High, Medium, Low)
 * @returns {string} - Ant Design color name
 */
export const getConfidenceColor = (confidence) => {
    switch (confidence) {
        case 'High': return 'green';
        case 'Medium': return 'orange';
        case 'Low': return 'red';
        default: return 'default';
    }
};