from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import pandas as pd
import os
from scipy import stats

app = Flask(__name__)
# Enable CORS with more specific settings
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}}, 
     supports_credentials=True)

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Load the model and feature names
model_path = os.path.join(script_dir, 'models', 'at_risk_rf_model.pkl')
feature_names_path = os.path.join(script_dir, 'models', 'features.pkl')

model = joblib.load(model_path)
with open(feature_names_path, 'rb') as f:
    feature_names = joblib.load(f)

def suggest_interventions(risk_score):
    """
    Suggest interventions based on student risk score.
    
    Args:
        risk_score: Integer from 0-100 representing probability of being at risk
        
    Returns:
        Dictionary with intervention suggestions
    """
    if risk_score >= 80:
        return {
            "level": "High Risk",
            "urgency": "Immediate",
            "suggestions": [
                "Schedule immediate one-on-one meeting with student",
                "Contact parents/guardians immediately",
                "Develop personalized learning plan",
                "Consider tutoring or additional support services",
                "Monitor daily progress",
                "Reduce assignment load if necessary"
            ],
            "timeline": "Within 24 hours"
        }
    elif risk_score >= 60:
        return {
            "level": "Moderate Risk",
            "urgency": "High",
            "suggestions": [
                "Schedule meeting within 3 days",
                "Provide additional learning resources",
                "Implement weekly check-ins",
                "Consider peer mentoring",
                "Review study habits and time management",
                "Offer extended deadlines if needed"
            ],
            "timeline": "Within 3 days"
        }
    elif risk_score >= 40:
        return {
            "level": "Low Risk",
            "urgency": "Moderate",
            "suggestions": [
                "Send encouraging message",
                "Provide study tips and resources",
                "Monitor bi-weekly progress",
                "Encourage participation in study groups",
                "Offer optional review sessions"
            ],
            "timeline": "Within 1 week"
        }
    else:
        return {
            "level": "Minimal Risk",
            "urgency": "Low",
            "suggestions": [
                "Continue current support level",
                "Recognize good performance",
                "Encourage peer mentoring opportunities",
                "Monthly progress check-ins"
            ],
            "timeline": "Ongoing monitoring"
        }

def preprocess_student_data_for_prediction(data, feature_names):
    """
    Transform incoming student data to match the training data format.
    This function simulates the preprocessing pipeline used during training.
    """
    try:
        # Initialize all features with default values
        processed_data = pd.DataFrame(columns=feature_names)
        processed_data.loc[0] = 0  # Initialize with zeros
        
        # Extract relevant information from the request
        courses = data.get('courses', [])
        
        if not courses:
            # If no courses provided, return default values
            return processed_data.values
        
        # Simulate monthly aggregation for the first 3 months
        monthly_scores = {1: [], 2: [], 3: []}
        monthly_times = {1: [], 2: [], 3: []}
        
        total_score_sum = 0
        total_assignments = 0
        total_time = 0
        late_submissions = 0
        
        # Process each course
        for course in courses:
            assignments = course.get('assignments', [])
            
            for assignment in assignments:
                progress = assignment.get('progress', {})
                
                # Get assignment data
                score = progress.get('totalScore', 0)
                time_spent = progress.get('totalTime', 0)
                is_late = progress.get('isLate', False)
                
                # Accumulate totals
                total_score_sum += score
                total_assignments += 1
                total_time += time_spent
                if is_late:
                    late_submissions += 1
                
                # Simulate monthly distribution (randomly assign to first 3 months for now)
                # In real implementation, you'd use submission dates
                month = np.random.choice([1, 2, 3])
                monthly_scores[month].append(score)
                monthly_times[month].append(time_spent)
        
        # Calculate early period features (first 3 months)
        early_scores = []
        early_times = []
        
        for month in [1, 2, 3]:
            if monthly_scores[month]:
                avg_score = np.mean(monthly_scores[month])
                total_time_month = np.sum(monthly_times[month])
            else:
                avg_score = 0
                total_time_month = 0
            
            early_scores.append(avg_score)
            early_times.append(total_time_month)
            
            # Set monthly features if they exist in feature_names
            score_col = f'Score_Month_{month}'
            time_col = f'TimeSpent_Month_{month}'
            
            if score_col in feature_names:
                processed_data.loc[0, score_col] = avg_score
            if time_col in feature_names:
                processed_data.loc[0, time_col] = total_time_month
        
        # Calculate engineered features
        # Early average score
        if 'early_avg_score' in feature_names:
            processed_data.loc[0, 'early_avg_score'] = np.mean([s for s in early_scores if s > 0]) if any(s > 0 for s in early_scores) else 0
        
        # Early average time
        if 'early_avg_time' in feature_names:
            processed_data.loc[0, 'early_avg_time'] = np.mean(early_times)
        
        # Early score variance
        if 'early_score_variance' in feature_names:
            non_zero_scores = [s for s in early_scores if s > 0]
            processed_data.loc[0, 'early_score_variance'] = np.var(non_zero_scores) if len(non_zero_scores) > 1 else 0
        
        # Early time variance
        if 'early_time_variance' in feature_names:
            processed_data.loc[0, 'early_time_variance'] = np.var(early_times) if len(early_times) > 1 else 0
        
        # Early time score ratio
        if 'early_time_score_ratio' in feature_names:
            avg_score = np.mean([s for s in early_scores if s > 0]) if any(s > 0 for s in early_scores) else 1
            avg_time = np.mean(early_times)
            processed_data.loc[0, 'early_time_score_ratio'] = avg_time / avg_score if avg_score > 0 else 0
        
        # Early engagement (proportion of active months)
        if 'early_engagement' in feature_names:
            active_months = sum(1 for t in early_times if t > 0)
            processed_data.loc[0, 'early_engagement'] = active_months / 3
        
        # Weighted early score
        if 'weighted_early_score' in feature_names:
            weights = np.array([1, 2, 3])  # Give more weight to later months
            weighted_sum = sum(score * weight for score, weight in zip(early_scores, weights) if score > 0)
            weight_sum = sum(weight for score, weight in zip(early_scores, weights) if score > 0)
            processed_data.loc[0, 'weighted_early_score'] = weighted_sum / weight_sum if weight_sum > 0 else 0
        
        # Early trend (slope of scores over first 3 months)
        if 'early_trend' in feature_names:
            non_zero_scores = [(i+1, score) for i, score in enumerate(early_scores) if score > 0]
            if len(non_zero_scores) >= 2:
                months, scores = zip(*non_zero_scores)
                slope, _, _, _, _ = stats.linregress(months, scores)
                processed_data.loc[0, 'early_trend'] = slope
            else:
                processed_data.loc[0, 'early_trend'] = 0
        
        # Late submission rate
        if 'late_submission_rate' in feature_names:
            processed_data.loc[0, 'late_submission_rate'] = late_submissions / total_assignments if total_assignments > 0 else 0
        
        # Grade level (default to 12 if not provided)
        if 'gradeLevel' in feature_names:
            processed_data.loc[0, 'gradeLevel'] = data.get('gradeLevel', 12)
        
        # Use provided averageScore and completionRate if available
        if 'averageScore' in data:
            # Map averageScore to relevant features
            if 'early_avg_score' in feature_names:
                processed_data.loc[0, 'early_avg_score'] = data['averageScore']
        
        if 'completionRate' in data:
            # Map completionRate to engagement features
            completion_ratio = data['completionRate'] / 100.0
            if 'early_engagement' in feature_names:
                processed_data.loc[0, 'early_engagement'] = completion_ratio
        
        # Fill any remaining NaN values with 0
        processed_data = processed_data.fillna(0)
        
        return processed_data.values
        
    except Exception as e:
        print(f"Error in preprocessing: {str(e)}")
        # Return zero array as fallback
        return np.zeros((1, len(feature_names)))

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    
    try:
        # Preprocess student data using the new function
        processed_data = preprocess_student_data_for_prediction(data, feature_names)
        
        # Make prediction
        prediction = model.predict(processed_data)[0]
        probabilities = model.predict_proba(processed_data)[0].tolist()
        
        # Calculate risk score (probability of being at risk * 100)
        # Note: Your model predicts 1 for NOT at risk, 0 for at risk
        # So we use probabilities[0] for at-risk probability
        risk_score = int(probabilities[0] * 100)
        
        # Get feature importance for this student
        feature_importances = None
        if hasattr(model, 'feature_importances_'):
            importances = dict(zip(feature_names, model.feature_importances_))
            feature_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Get suggested interventions
        interventions = suggest_interventions(risk_score)
        
        # Build response
        response = {
            'is_at_risk': prediction == 0,  # 0 means at risk in your model
            'probability': probabilities[0],  # Probability of being at risk
            'risk_score': risk_score,
            'intervention': interventions
        }
        
        # Add feature importances if available
        if feature_importances:
            response['risk_factors'] = [{'name': factor[0], 'importance': factor[1]} for factor in feature_importances]
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
