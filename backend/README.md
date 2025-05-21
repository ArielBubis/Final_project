# Student Risk Prediction Backend

This backend service uses a machine learning model to predict at-risk students based on their academic performance data.

## Setup

1. Install dependencies:
```
pip install -r requirements.txt
```

2. Run the server:
```
python app.py
```

The server will start on http://localhost:5000.

## API Endpoints

### POST /api/predict

Predicts risk level for a student based on their academic data.

**Request Body:**
```json
{
  "courses": [
    {
      "assignments": [
        {
          "type": "exam",
          "progress": {
            "submittedAt": "2025-05-01T14:30:00.000Z",
            "totalScore": 85,
            "totalTime": 120,
            "isLate": false
          }
        }
      ]
    }
  ],
  "averageScore": 78,
  "completionRate": 80
}
```

**Response:**
```json
{
  "is_at_risk": false,
  "probability": 0.23,
  "risk_score": 23,
  "intervention": {
    "risk_level": "Low Risk",
    "interventions": [
      "Share additional learning resources",
      "Provide self-monitoring tools",
      "Optional study sessions"
    ]
  },
  "risk_factors": [
    {
      "name": "assessmentScore_mean",
      "importance": 0.28
    }
  ]
}
```

## Integration with Frontend

The frontend includes a service (`riskPredictionService.js`) that communicates with this backend to enhance risk assessments. If the backend is unavailable, it falls back to rule-based risk calculation.

## Model Information

- Model file: `models/at_risk_model.joblib`
- Feature names: `models/feature_names.json`
- Data scaling: `models/scaler.pkl`
