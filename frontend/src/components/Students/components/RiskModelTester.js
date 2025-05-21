import React, { useState } from 'react';
import { getPrediction } from '../../services/riskPredictionService';
import { calculateRiskAssessment } from '../../utils/scoreCalculations';

/**
 * Test component to compare ML model predictions with rule-based predictions
 */
const RiskModelTester = () => {
  const [loading, setLoading] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [ruleResult, setRuleResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Sample student data for testing
  const sampleData = {
    firstName: "Jane",
    lastName: "Doe",
    averageScore: 68,
    completionRate: 75,
    courses: [
      {
        id: "course1",
        name: "Mathematics",
        assignments: [
          {
            id: "assignment1",
            name: "Midterm Exam",
            type: "exam",
            progress: {
              submittedAt: "2025-04-25T14:30:00.000Z",
              totalScore: 65,
              totalTime: 120,
              isLate: false
            }
          },
          {
            id: "assignment2",
            name: "Final Exam",
            type: "exam",
            progress: {
              submittedAt: "2025-05-15T15:45:00.000Z",
              totalScore: 72,
              totalTime: 180,
              isLate: false
            }
          },
          {
            id: "assignment3",
            name: "Weekly Quiz 1",
            type: "quiz",
            progress: {
              submittedAt: "2025-03-05T10:15:00.000Z",
              totalScore: 85,
              totalTime: 45,
              isLate: false
            }
          },
          {
            id: "assignment4",
            name: "Weekly Quiz 2",
            type: "quiz",
            progress: null // Missing assignment
          }
        ]
      }
    ]
  };

  const runTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get machine learning prediction
      const mlPrediction = await getPrediction(sampleData);
      setMlResult(mlPrediction);
      
      // Get rule-based prediction
      const rulePrediction = calculateRiskAssessment(sampleData, true);
      setRuleResult(rulePrediction);
    } catch (err) {
      setError(`Error testing risk models: ${err.message}`);
      console.error('Risk model test error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Risk Prediction Model Tester</h2>
      
      <button 
        onClick={runTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-3 border rounded">
          <h3 className="font-bold">Machine Learning Model</h3>
          {mlResult ? (
            <div className="mt-2">
              <p><span className="font-semibold">Risk Score:</span> {mlResult.risk_score}</p>
              <p><span className="font-semibold">Is At Risk:</span> {mlResult.is_at_risk ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Risk Level:</span> {mlResult.intervention?.risk_level}</p>
              <div className="mt-2">
                <p className="font-semibold">Interventions:</p>
                <ul className="list-disc pl-5">
                  {mlResult.intervention?.interventions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic mt-2">Run the test to see results</p>
          )}
        </div>
        
        <div className="p-3 border rounded">
          <h3 className="font-bold">Rule-Based Assessment</h3>
          {ruleResult ? (
            <div className="mt-2">
              <p><span className="font-semibold">Risk Score:</span> {ruleResult.score}</p>
              <p><span className="font-semibold">Is At Risk:</span> {ruleResult.isAtRisk ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Risk Level:</span> {ruleResult.level}</p>
              <div className="mt-2">
                <p className="font-semibold">Risk Factors:</p>
                <ul className="list-disc pl-5">
                  {ruleResult.factors.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic mt-2">Run the test to see results</p>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-bold mb-2">Sample Data:</h3>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
          {JSON.stringify(sampleData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default RiskModelTester;
