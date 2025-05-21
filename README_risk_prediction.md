# Student Dashboard with ML Risk Prediction

This project implements a machine learning backend for the Student Dashboard that predicts at-risk students based on their academic performance data using advanced analytics.

## Features

- **Machine Learning Risk Analysis:** Automatically identifies at-risk students using predictive modeling
- **Comparison with Rule-Based Analysis:** Compare ML predictions with traditional rule-based risk assessment
- **Intervention Suggestions:** Provides tailored interventions based on risk level
- **Interactive Dashboard:** Easy-to-use interface for teachers to monitor student risk

## Setup

1. Install backend dependencies:
```
cd backend
pip install -r requirements.txt
```

2. Install frontend dependencies (if not already installed):
```
cd frontend
npm install
```

## Running the Services

You can start both services using the provided batch file:
```
start_services.bat
```

Or manually start them:

1. Start backend with enhanced monitoring:
```
cd backend
python start_risk_backend.py
```

2. Or start backend directly (without monitoring):
```
cd backend
python app.py
```

3. Start frontend:
```
cd frontend
npm start
```

## Testing the Integration

### Backend API Test

Run the provided test script to check if the backend API is working correctly:
```
cd backend
python test_api.py
```

### Frontend Integration Test

After starting both services:

1. Navigate to the Student Dashboard page
2. You should see risk assessments for students powered by the ML model
3. If the backend is not available, the system will fall back to rule-based risk assessment

### Risk Model Tester Component

A test component has been added to compare ML predictions with rule-based assessments:
- Location: `frontend/src/components/Students/components/RiskModelTester.js`
- This can be included in any page for development/testing purposes

## Understanding Data Processing

The risk prediction process involves several steps:

1. **Data Collection**: Student data is collected from the frontend
2. **Feature Engineering**: Raw data is transformed into features expected by the model
3. **Model Prediction**: ML model predicts risk probability
4. **Risk Assessment**: Risk level and interventions are determined based on predictions
5. **Fallback Mechanism**: If ML prediction fails, system uses rule-based assessment

## Relevant Files

### Backend
- `app.py`: Flask API server
- `models/risk_utils.py`: Data preprocessing and risk assessment utilities
- `models/at_risk_model.joblib`: Serialized ML model
- `models/feature_names.json`: Expected model features
- `test_api.py`: API testing script

### Frontend
- `services/riskPredictionService.js`: Service to communicate with backend
- `utils/scoreCalculations.js`: Rule-based risk assessment (fallback)
- `components/Students/hooks/useStudentData.js`: Integration with student data loading
- `components/Students/components/RiskModelTester.js`: Test component

## Next Steps

1. **Model Improvement**: Collect feedback on prediction accuracy and retrain the model
2. **Feature Enhancement**: Add more features from student data for better predictions
3. **Visualization**: Add visualizations to explain risk assessments
4. **Intervention Tracking**: Track effectiveness of suggested interventions
