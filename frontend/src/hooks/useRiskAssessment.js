import { useMemo } from 'react';

export const useRiskAssessment = (studentData) => {
  const riskAssessment = useMemo(() => {
    if (!studentData) return { isAtRisk: false, score: 0, level: 'low', factors: [] };
    
    const factors = [];
    let score = 0;
    
    // Performance-based risk factors
    if (studentData.averageScore < 60) {
      factors.push('Low average score');
      score += 25;
    }
    
    if (studentData.submissionRate < 70) {
      factors.push('Low submission rate');
      score += 20;
    }
    
    if (studentData.missingAssignments > 3) {
      factors.push('Multiple missing assignments');
      score += 30;
    }
    
    // Time-based risk factors
    if (studentData.daysSinceLastAccess > 7) {
      factors.push('Inactive for over a week');
      score += 15;
    }
    
    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    
    return {
      isAtRisk: score >= 40,
      score,
      level,
      factors
    };
  }, [studentData]);
  
  return riskAssessment;
};

// Export a non-hook version for direct usage in server or non-component code
export const calculateRiskAssessment = (studentData) => {
  if (!studentData) return { isAtRisk: false, score: 0, level: 'low', factors: [] };
  
  const factors = [];
  let score = 0;
  
  // Performance-based risk factors
  if (studentData.averageScore < 60) {
    factors.push('Low average score');
    score += 25;
  }
  
  if (studentData.submissionRate < 70) {
    factors.push('Low submission rate');
    score += 20;
  }
  
  if (studentData.missingAssignments > 3) {
    factors.push('Multiple missing assignments');
    score += 30;
  }
  
  // Time-based risk factors
  if (studentData.daysSinceLastAccess > 7) {
    factors.push('Inactive for over a week');
    score += 15;
  }
  
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  
  return {
    isAtRisk: score >= 40,
    score,
    level,
    factors
  };
};
