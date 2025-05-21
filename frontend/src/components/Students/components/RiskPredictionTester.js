import React, { useState } from 'react';
import { Button, Card, Alert, Spin, Divider, Typography, Table, Tag, Progress } from 'antd';
import { getPrediction } from '../../services/riskPredictionService';
import { calculateRiskAssessment } from '../../utils/scoreCalculations';

const { Title, Text, Paragraph } = Typography;

/**
 * Component for testing and comparing ML model predictions with rule-based predictions
 */
const RiskPredictionTester = () => {
  const [loading, setLoading] = useState(false);
  const [mlResults, setMlResults] = useState(null);
  const [ruleResults, setRuleResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSample, setSelectedSample] = useState('average');

  // Sample student data for testing
  const sampleStudents = {
    average: {
      name: "Average Student",
      firstName: "Average",
      lastName: "Student",
      email: "average.student@university.edu",
      averageScore: 75,
      completionRate: 80,
      lastAccessed: new Date().toISOString(),
      courses: [
        {
          id: "math101",
          name: "Mathematics 101",
          assignments: [
            {
              id: "math_quiz1",
              name: "Quiz 1",
              type: "quiz",
              progress: {
                submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                totalScore: 80,
                totalTime: 45,
                isLate: false
              }
            },
            {
              id: "math_midterm",
              name: "Midterm Exam",
              type: "exam",
              progress: {
                submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                totalScore: 75,
                totalTime: 90,
                isLate: false
              }
            }
          ]
        }
      ]
    },
    
    atrisk: {
      name: "At Risk Student",
      firstName: "At-Risk",
      lastName: "Student",
      email: "atrisk.student@university.edu",
      averageScore: 58,
      completionRate: 45,
      lastAccessed: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      courses: [
        {
          id: "math101",
          name: "Mathematics 101",
          assignments: [
            {
              id: "math_quiz1",
              name: "Quiz 1",
              type: "quiz",
              progress: {
                submittedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
                totalScore: 45,
                totalTime: 55,
                isLate: true
              }
            },
            {
              id: "math_midterm",
              name: "Midterm Exam",
              type: "exam",
              progress: null // Missing assignment
            }
          ]
        }
      ]
    },
    
    borderline: {
      name: "Borderline Student",
      firstName: "Borderline",
      lastName: "Student",
      email: "borderline.student@university.edu",
      averageScore: 68,
      completionRate: 65,
      lastAccessed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      courses: [
        {
          id: "math101",
          name: "Mathematics 101",
          assignments: [
            {
              id: "math_quiz1",
              name: "Quiz 1",
              type: "quiz",
              progress: {
                submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                totalScore: 62,
                totalTime: 50,
                isLate: true
              }
            },
            {
              id: "math_midterm",
              name: "Midterm Exam",
              type: "exam",
              progress: {
                submittedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
                totalScore: 68,
                totalTime: 95,
                isLate: false
              }
            }
          ]
        }
      ]
    }
  };

  const runTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const student = sampleStudents[selectedSample];
      
      // Get ML prediction
      const mlPrediction = await getPrediction(student);
      setMlResults(mlPrediction);
      
      // Get rule-based prediction
      const rulePrediction = calculateRiskAssessment(student, true);
      setRuleResults(rulePrediction);
      
    } catch (err) {
      console.error('Error testing risk prediction:', err);
      setError(`Error testing risk prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Get risk level color
  const getRiskLevelColor = (level) => {
    if (!level) return "default";
    const lowerLevel = typeof level === 'string' ? level.toLowerCase() : level;
    switch (lowerLevel) {
      case 'high': return "red";
      case 'high risk': return "red";
      case 'medium': return "orange";
      case 'medium risk': return "orange";
      case 'low': return "green";
      case 'low risk': return "green";
      default: return "blue";
    }
  };
  
  // Format risk level for display
  const formatRiskLevel = (level) => {
    if (!level) return "Unknown";
    return level.charAt(0).toUpperCase() + level.slice(1) + " Risk";
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <Title level={2}>ML Risk Prediction Tester</Title>
      
      <Paragraph>
        This tool lets you test the machine learning risk prediction model with sample student data
        and compare it to the traditional rule-based risk assessment.
      </Paragraph>
      
      <Card title="Test Settings" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Select Sample Student:</Text>
          <div style={{ marginTop: 8 }}>
            <Button 
              type={selectedSample === 'average' ? 'primary' : 'default'} 
              onClick={() => setSelectedSample('average')}
              style={{ marginRight: 8 }}
            >
              Average Student
            </Button>
            <Button 
              type={selectedSample === 'atrisk' ? 'primary' : 'default'} 
              onClick={() => setSelectedSample('atrisk')}
              style={{ marginRight: 8 }}
              danger
            >
              At-Risk Student
            </Button>
            <Button 
              type={selectedSample === 'borderline' ? 'primary' : 'default'} 
              onClick={() => setSelectedSample('borderline')}
            >
              Borderline Student
            </Button>
          </div>
        </div>
        
        <Button 
          type="primary" 
          onClick={runTest} 
          loading={loading}
          size="large"
        >
          Run Risk Analysis
        </Button>
      </Card>
      
      {error && (
        <Alert 
          message="Error Testing Risk Prediction" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
        />
      )}
      
      {loading && (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Processing risk prediction...</p>
        </div>
      )}
      
      {!loading && (mlResults || ruleResults) && (
        <>
          <Title level={3}>Results Comparison</Title>
          
          <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <Card title="ML Model Prediction" style={{ flex: 1, minWidth: 300 }}>
              {mlResults ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Risk Score:</Text>{' '}
                    <Tag color={
                      mlResults.risk_score >= 70 ? 'red' : 
                      mlResults.risk_score >= 40 ? 'orange' : 'green'
                    }>
                      {mlResults.risk_score}
                    </Tag>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Risk Level:</Text>{' '}
                    <Tag color={getRiskLevelColor(mlResults.intervention?.risk_level)}>
                      {mlResults.intervention?.risk_level || 'Unknown'}
                    </Tag>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>At Risk:</Text>{' '}
                    <Tag color={mlResults.is_at_risk ? 'red' : 'green'}>
                      {mlResults.is_at_risk ? 'Yes' : 'No'}
                    </Tag>
                  </div>
                  
                  {mlResults.intervention?.interventions && (
                    <div>
                      <Text strong>Suggested Interventions:</Text>
                      <ul>
                        {mlResults.intervention.interventions.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <Text type="secondary">No ML prediction results available</Text>
              )}
            </Card>
            
            <Card title="Rule-Based Assessment" style={{ flex: 1, minWidth: 300 }}>
              {ruleResults ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Risk Score:</Text>{' '}
                    <Tag color={
                      ruleResults.score >= 50 ? 'red' : 
                      ruleResults.score >= 25 ? 'orange' : 'green'
                    }>
                      {ruleResults.score}
                    </Tag>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Risk Level:</Text>{' '}
                    <Tag color={getRiskLevelColor(ruleResults.level)}>
                      {formatRiskLevel(ruleResults.level)}
                    </Tag>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>At Risk:</Text>{' '}
                    <Tag color={ruleResults.isAtRisk ? 'red' : 'green'}>
                      {ruleResults.isAtRisk ? 'Yes' : 'No'}
                    </Tag>
                  </div>
                  
                  {ruleResults.factors && ruleResults.factors.length > 0 && (
                    <div>
                      <Text strong>Risk Factors:</Text>
                      <ul>
                        {ruleResults.factors.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <Text type="secondary">No rule-based assessment results available</Text>
              )}
            </Card>
          </div>
          
          <Divider />
          
          <Title level={3}>Student Profile</Title>
          <Card>
            <Table 
              dataSource={[sampleStudents[selectedSample]]}
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Average Score',
                  dataIndex: 'averageScore',
                  key: 'averageScore',
                  render: (score) => (
                    <Progress 
                      percent={score} 
                      status={score < 60 ? 'exception' : 'normal'}
                      size="small"
                    />
                  )
                },
                {
                  title: 'Completion Rate',
                  dataIndex: 'completionRate',
                  key: 'completionRate',
                  render: (rate) => (
                    <Progress 
                      percent={rate} 
                      status={rate < 50 ? 'exception' : 'normal'}
                      size="small"
                    />
                  )
                },
                {
                  title: 'Last Access',
                  dataIndex: 'lastAccessed',
                  key: 'lastAccessed',
                  render: (date) => {
                    const daysSince = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
                    let color = 'green';
                    if (daysSince > 14) color = 'red';
                    else if (daysSince > 7) color = 'orange';
                    
                    return (
                      <Tag color={color}>
                        {new Date(date).toLocaleDateString()} ({daysSince} days ago)
                      </Tag>
                    );
                  }
                }
              ]}
              pagination={false}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default RiskPredictionTester;
