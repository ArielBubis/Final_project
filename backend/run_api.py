#!/usr/bin/env python3
"""
Main entry point for the Risk Prediction Backend API
Starts the Flask application from the reorganized structure
"""

import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Enable debug mode for development
os.environ['FLASK_ENV'] = 'development'
os.environ['FLASK_DEBUG'] = '1'

from api.app import app

if __name__ == '__main__':
    print("🚀 Starting Risk Prediction API...")
    print(f"📁 Backend directory: {backend_dir}")
    print("🌐 API will be available at: http://localhost:5000")
    print("📊 Health check at: http://localhost:5000/api/health")
    print("🔮 Prediction endpoint: http://localhost:5000/api/predict")
    
    # Run the Flask app
    app.run(debug=True, host='localhost', port=5000)