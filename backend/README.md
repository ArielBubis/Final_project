# Revoducate ML Backend

Machine Learning backend service for the Revoducate Learning Management System. Provides student risk prediction capabilities using Random Forest models with comprehensive feature engineering.

## Architecture

```
backend/
├── api/           # Flask API server
│   └── app.py     # Main API endpoints
├── ml/            # Machine Learning pipeline
│   ├── predict.py         # Prediction pipeline
│   ├── pre_processing.py  # Data processing & feature engineering
│   └── train_model.py     # Model training pipeline
├── models/        # Trained ML models
│   ├── student_risk_model.pkl  # RandomForest classifier
│   ├── scaler.pkl            # Feature scaler
│   └── features.pkl          # Feature names & metadata
├── output/        # Generated prediction files
└── requirements.txt
```

## Quick Start

### 1. Environment Setup
```bash
# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Service
```bash
# From backend/api/ directory
python app.py
```

Server starts on http://localhost:5000 with CORS enabled for frontend integration.

### 3. Alternative: Use Start Script
From project root:
```bash
start_services.bat  # Starts both backend and frontend
```

## API Endpoints

### POST /api/predict
Real-time prediction for individual students.

**Request:**
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
      "Provide self-monitoring tools"
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

### POST /api/predict/csv
Batch prediction from CSV data (generates new prediction files).

**Request:**
```json
{
  "model_id": "default",  // optional
  "data_dir": "/path/to/csv"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated predictions for 147 students",
  "predictions_count": 147,
  "at_risk_count": 98,
  "output_file": "backend/output/risk_predictions_20250915_004407.csv",
  "model_used": "default",
  "timestamp": "20250915_004407",
  "summary": {
    "total_students": 147,
    "at_risk_students": 98,
    "at_risk_percentage": 66.7,
    "confidence_distribution": {...}
  }
}
```

### GET /api/risk/students
Retrieve at-risk students from latest prediction file.

**Response:**
```json
{
  "message": "Found 98 at-risk students from 147 analyzed",
  "students": [
    {
      "studentId": "170480112",
      "courseId": "CRS030597",
      "courseName": "Mathematics",
      "at_risk_probability": 0.64,
      "confidence": "Medium",
      "completion": 69.1,
      "risk_bucket": "medium"
    }
  ]
}
```

### GET /api/models
List available ML models.

## Machine Learning Pipeline

### Feature Engineering
The system generates 15+ features from student data:
- **Assessment Performance**: `assessmentScore_mean`, `assessmentScore_std`
- **Submission Patterns**: `submissionDelay_mean`, `onTimeSubmissionRate`
- **Engagement Metrics**: `weekendActivity_ratio`, `sessionDuration_mean`
- **Time-based Features**: `early_avg_score`, `early_trend`, `early_engagement`

### Model Details
- **Algorithm**: Random Forest Classifier (scikit-learn)
- **Training Data**: Monthly aggregated student performance metrics
- **Target Variable**: Binary at-risk classification based on performance thresholds
- **Features**: 17 engineered features with automated scaling
- **Cross-validation**: Stratified K-fold validation during training

### Prediction Modes
1. **Real-time**: Individual student predictions via `/api/predict`
2. **Batch Processing**: Full dataset predictions via `/api/predict/csv`
3. **Early Warning**: Risk detection from first 3 months of data

## Data Flow

1. **CSV Data Sources** (`data/`):
   - `students.csv`, `courses.csv`, `assignments.csv`
   - `studentAssignments.csv`, `studentCourses.csv`
   - `modules.csv`, etc.

2. **Feature Engineering** (`ml/pre_processing.py`):
   - Loads and merges CSV data
   - Creates monthly student performance aggregations
   - Generates ML-ready feature vectors

3. **Prediction Pipeline** (`ml/predict.py`):
   - Preprocesses features to match training data
   - Applies trained model and scaler
   - Generates risk probabilities and confidence levels

4. **Output Generation**:
   - Saves predictions to `backend/output/risk_predictions_TIMESTAMP.csv`
   - Provides detailed risk analysis and intervention recommendations

## Integration with Frontend

The frontend (`riskPredictionService.js`) integrates with this backend:
- **Primary Mode**: ML predictions from backend API
- **Fallback Mode**: Rule-based calculations if backend unavailable
- **User Interface**: `CreatePredictionPrompt.js` for generating new predictions

## Development & Training

### Retrain Model
```bash
cd backend/ml
python train_model.py
```

### Test Prediction Pipeline
```bash
cd backend/ml
python predict.py  # Runs complete pipeline
```

### Debug Mode
Set `logging.DEBUG` in `app.py` for detailed request/response logging.

## Model Files

- **`student_risk_model.pkl`**: Trained RandomForest classifier
- **`scaler.pkl`**: StandardScaler for feature normalization  
- **`features.pkl`**: Feature names and metadata for consistency
