from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import os
import pandas as pd

from models.risk_utils import calculate_risk_score, suggest_interventions, preprocess_student_data

app = Flask(__name__)
# Enable CORS with more specific settings
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}}, 
     supports_credentials=True)

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Load the model and feature names
model_path = os.path.join(script_dir, 'models', 'at_risk_model.joblib')
feature_names_path = os.path.join(script_dir, 'models', 'feature_names.json')

model = joblib.load(model_path)
with open(feature_names_path, 'r') as f:
    feature_names = json.load(f)

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    
    try:
        # Preprocess student data using helper function
        processed_data = preprocess_student_data(data, feature_names)
        
        # Make prediction
        prediction = model.predict(processed_data)[0]
        probabilities = model.predict_proba(processed_data)[0].tolist()
        
        # Calculate risk score
        risk_score = int(probabilities[1] * 100)  # Assuming index 1 is the probability of being at risk
        
        # Get feature importance for this student
        feature_importances = None
        if hasattr(model, 'feature_importances_'):
            importances = dict(zip(feature_names, model.feature_importances_))
            feature_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Get suggested interventions
        interventions = suggest_interventions(risk_score)
        
        # Build response
        response = {
            'is_at_risk': bool(prediction),
            'probability': probabilities[1],
            'risk_score': risk_score,
            'intervention': interventions
        }
        
        # Add feature importances if available
        if feature_importances:
            response['risk_factors'] = [{'name': factor[0], 'importance': factor[1]} for factor in feature_importances]
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
