from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import pandas as pd
import os
import logging
from datetime import datetime
from scipy import stats

# Custom Exception Classes
class ModelLoadError(Exception):
    """Raised when model fails to load"""
    pass

class DataValidationError(Exception):
    """Raised when input data is invalid"""
    pass

class PreprocessingError(Exception):
    """Raised when data preprocessing fails"""
    pass

class PredictionError(Exception):
    """Raised when model prediction fails"""
    pass

app = Flask(__name__)

# Configure logging
# logging.basicConfig(
#     level=logging.INFO,
#     format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
#     handlers=[
#         logging.FileHandler('app.log'),
#         logging.StreamHandler()
#     ]
# )
logger = logging.getLogger(__name__)

# Enable CORS with more permissive settings for development
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
        "supports_credentials": True
    }
})

def get_robust_models_path():
    """
    Get the models directory path with robust cross-platform handling
    """
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Try the standard path first (api/../models)
    models_dir = os.path.normpath(os.path.join(script_dir, '..', 'models'))
    
    if os.path.exists(models_dir):
        return models_dir
    
    # Try alternative path (backend/models)
    backend_dir = os.path.dirname(script_dir)
    models_dir = os.path.normpath(os.path.join(backend_dir, 'models'))
    
    if os.path.exists(models_dir):
        return models_dir
    
    # Try project root path
    project_root = os.path.dirname(backend_dir)
    models_dir = os.path.normpath(os.path.join(project_root, 'backend', 'models'))
    
    return models_dir

# Alternative: More permissive CORS for development (uncomment if above doesn't work)
# CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
#      supports_credentials=True, methods=["GET", "POST", "OPTIONS"])

# Add a simple health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    current_model = get_current_model()
    current_features = get_current_feature_names()
    
    return jsonify({
        'status': 'healthy',
        'message': 'Risk prediction API is running',
        'model_loaded': current_model is not None,
        'feature_count': len(current_features) if current_features is not None else 0,
        'current_model': current_model_type,
        'available_models': len(models),
        'models': {k: v['config'] for k, v in models.items()},
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/models', methods=['GET'])
def get_available_models():
    """Get list of available prediction models"""
    try:
        model_list = []
        for model_id, model_data in models.items():
            config = model_data['config']
            model_info = {
                'id': model_id,
                'name': config['name'],
                'description': config['description'],
                'months_required': config['months_required'],
                'is_current': model_id == current_model_type,
                'feature_count': len(model_data['feature_names'])
            }
            model_list.append(model_info)
        
        return jsonify({
            'models': model_list,
            'current_model': current_model_type,
            'multi_model_enabled': ENABLE_MULTI_MODEL
        })
    except Exception as e:
        logger.error(f"Error getting available models: {str(e)}")
        return jsonify({
            'error': 'Failed to get models',
            'message': str(e)
        }), 500

@app.route('/api/models/current', methods=['POST'])
def set_current_model():
    """Set the current active model"""
    try:
        # If multi-model is disabled, return appropriate response
        if not ENABLE_MULTI_MODEL:
            return jsonify({
                'error': 'Model switching disabled',
                'message': 'Multi-model feature is disabled. Using single model.',
                'current_model': current_model_type
            }), 400
        
        data = request.get_json()
        if not data or 'model_id' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'model_id is required'
            }), 400
        
        model_id = data['model_id']
        
        if set_current_model(model_id):
            model_name = models[model_id]['config']['name'] if model_id in models else model_id
            return jsonify({
                'success': True,
                'current_model': current_model_type,
                'message': f'Successfully switched to {model_name}'
            })
        else:
            return jsonify({
                'error': 'Invalid model',
                'message': f'Model {model_id} not found or not loaded'
            }), 404
            
    except Exception as e:
        logger.error(f"Error setting current model: {str(e)}")
        return jsonify({
            'error': 'Failed to set model',
            'message': str(e)
        }), 500

# Load shared configuration
def load_shared_config():
    """Load configuration from shared config.json file"""
    try:
        # Get the project root directory (two levels up from api/)
        project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
        config_path = os.path.join(project_root, 'config.json')
        
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        return config.get('features', {}).get('ENABLE_MULTI_MODEL', False)
    except Exception as e:
        logger.warning(f"Could not load shared config: {str(e)}, defaulting to single model mode")
        return False

# Configuration
ENABLE_MULTI_MODEL = load_shared_config()

# Global variables for models and features
models = {}  # Will store multiple models: {'1_3': {...}, '1_6': {...}, etc.}
current_model_type = '1_3'  # Default model
feature_names = None
scaler = None

# Available model configurations
AVAILABLE_MODELS = {
    '1_3': {
        'name': '1-3 Months Early Warning',
        'description': 'Predicts risk based on first 3 months of data',
        'months_required': 3,
        'folder': 'model_1_3_20250919_114922'
    },
    '1_6': {
        'name': '1-6 Months Prediction',
        'description': 'Predicts risk based on first 6 months of data',
        'months_required': 6,
        'folder': 'model_1_6_20250919_130455'
    },
    '1_9': {
        'name': '1-9 Months Prediction',
        'description': 'Predicts risk based on first 9 months of data',
        'months_required': 9,
        'folder': 'model_1_9_20250919_130809'
    },
    '1_12': {
        'name': '1-12 Months Full Academic Year',
        'description': 'Predicts risk based on full academic year data',
        'months_required': 12,
        'folder': 'model_1_12_20250919_131121'
    }
}

def convert_to_json_serializable(obj):
    """
    Convert numpy/pandas data types to JSON-serializable Python native types
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Series):
        return obj.to_list()
    elif isinstance(obj, dict):
        return {key: convert_to_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_serializable(item) for item in obj]
    else:
        return obj

def load_model_and_features():
    """Load all available models and feature names with comprehensive error handling"""
    global models, feature_names, current_model_type
    
    try:
        # Use the robust path resolution function
        models_dir = get_robust_models_path()
        
        # Verify the models directory exists
        if not os.path.exists(models_dir):
            raise ModelLoadError(f"Models directory not found at: {models_dir}")
        
        logger.info(f"Using models directory: {models_dir}")
        
        # If multi-model is disabled, load single model directly
        if not ENABLE_MULTI_MODEL:
            logger.info("Multi-model feature is disabled. Loading single model.")
            
            # Load single model files directly from models directory
            model_path = os.path.normpath(os.path.join(models_dir, 'student_risk_model.pkl'))
            feature_names_path = os.path.normpath(os.path.join(models_dir, 'features.pkl'))
            scaler_path = os.path.normpath(os.path.join(models_dir, 'scaler.pkl'))
            
            # Check if required files exist with detailed error messages
            logger.info(f"Looking for single model at: {model_path}")
            if not os.path.exists(model_path):
                # List available files in the directory for debugging
                if os.path.exists(models_dir):
                    available_files = os.listdir(models_dir)
                    logger.error(f"Single model file not found at: {model_path}")
                    logger.error(f"Available files in {models_dir}: {available_files}")
                    raise ModelLoadError(f"Single model file not found: {model_path}. Available files: {available_files}")
                else:
                    raise ModelLoadError(f"Models directory does not exist: {models_dir}")
            
            logger.info(f"Looking for feature names at: {feature_names_path}")
            if not os.path.exists(feature_names_path):
                raise ModelLoadError(f"Feature names file not found: {feature_names_path}")
            
            # Load the single model
            logger.info(f"Loading single model from: {model_path}")
            model = joblib.load(model_path)
            
            if model is None:
                raise ModelLoadError("Single model loaded but is None")
            
            # Load feature names
            logger.info(f"Loading feature names from: {feature_names_path}")
            with open(feature_names_path, 'rb') as f:
                model_feature_names = joblib.load(f)
            
            if model_feature_names is None or len(model_feature_names) == 0:
                raise ModelLoadError("Feature names loaded but are empty")
            
            # Load scaler if available
            model_scaler = None
            if os.path.exists(scaler_path):
                logger.info(f"Loading scaler from: {scaler_path}")
                model_scaler = joblib.load(scaler_path)
            
            # Set up single model structure
            models = {
                'single': {
                    'model': model,
                    'feature_names': model_feature_names,
                    'scaler': model_scaler,
                    'config': {
                        'name': 'Student Risk Model',
                        'description': 'Single risk prediction model',
                        'months_required': 6,
                        'folder': 'single'
                    }
                }
            }
            
            current_model_type = 'single'
            feature_names = model_feature_names
            
            logger.info(f"Successfully loaded single model with {len(model_feature_names)} features")
            return
        
        # Multi-model loading logic (existing code)
        logger.info("Multi-model feature is enabled. Loading multiple models.")
        
        # Load each available model
        loaded_models = {}
        
        for model_id, model_config in AVAILABLE_MODELS.items():
            try:
                model_folder = os.path.normpath(os.path.join(models_dir, model_config['folder']))
                model_path = os.path.normpath(os.path.join(model_folder, 'student_risk_model.pkl'))
                feature_names_path = os.path.normpath(os.path.join(model_folder, 'features.pkl'))
                scaler_path = os.path.normpath(os.path.join(model_folder, 'scaler.pkl'))
                
                # Check if files exist with detailed logging
                logger.info(f"Looking for model {model_id} at: {model_path}")
                if not os.path.exists(model_path):
                    logger.warning(f"Model file not found for {model_id} at: {model_path}")
                    if os.path.exists(model_folder):
                        available_files = os.listdir(model_folder)
                        logger.warning(f"Available files in {model_folder}: {available_files}")
                    else:
                        logger.warning(f"Model folder does not exist: {model_folder}")
                    continue
                
                logger.info(f"Looking for feature names for {model_id} at: {feature_names_path}")
                if not os.path.exists(feature_names_path):
                    logger.warning(f"Feature names file not found for {model_id} at: {feature_names_path}")
                    continue
                
                # Load model
                logger.info(f"Loading model {model_id} from: {model_path}")
                model = joblib.load(model_path)
                
                if model is None:
                    logger.warning(f"Model {model_id} loaded but is None")
                    continue
                
                # Load feature names
                logger.info(f"Loading feature names for {model_id} from: {feature_names_path}")
                with open(feature_names_path, 'rb') as f:
                    model_feature_names = joblib.load(f)
                
                if model_feature_names is None or len(model_feature_names) == 0:
                    logger.warning(f"Feature names for {model_id} loaded but are empty")
                    continue
                
                # Load scaler if available
                model_scaler = None
                if os.path.exists(scaler_path):
                    model_scaler = joblib.load(scaler_path)
                
                # Store the loaded model data
                loaded_models[model_id] = {
                    'model': model,
                    'feature_names': model_feature_names,
                    'scaler': model_scaler,
                    'config': model_config
                }
                
                logger.info(f"Successfully loaded model {model_id} with {len(model_feature_names)} features")
                
            except Exception as e:
                logger.error(f"Error loading model {model_id}: {str(e)}")
                continue
        
        if not loaded_models:
            raise ModelLoadError("Model is missing from backend/models folder. "
                               "To train a model go to this link: "
                               "https://colab.research.google.com/drive/124Tc_TnAGpkGgHMw82S7wwZzxbUOz0EJ")
        
        # Set global variables
        models = loaded_models
        
        # Set feature_names to the first available model's features as default
        if current_model_type in models:
            feature_names = models[current_model_type]['feature_names']
        else:
            # If current_model_type is not available, use the first loaded model
            first_model_id = list(models.keys())[0]
            current_model_type = first_model_id
            feature_names = models[first_model_id]['feature_names']
        
        logger.info(f"Successfully loaded {len(models)} models. Current model: {current_model_type}")
        
        # Try to load legacy model as fallback (only in multi-model mode)
        if ENABLE_MULTI_MODEL:
            try:
                legacy_model_path = os.path.normpath(os.path.join(models_dir, 'student_risk_model.pkl'))
                legacy_feature_names_path = os.path.normpath(os.path.join(models_dir, 'features.pkl'))
                legacy_scaler_path = os.path.normpath(os.path.join(models_dir, 'scaler.pkl'))
                
                if os.path.exists(legacy_model_path) and os.path.exists(legacy_feature_names_path):
                    legacy_model = joblib.load(legacy_model_path)
                    legacy_features = joblib.load(legacy_feature_names_path)
                    legacy_scaler = joblib.load(legacy_scaler_path) if os.path.exists(legacy_scaler_path) else None
                    
                    if legacy_model is not None and legacy_features:
                        models['legacy'] = {
                            'model': legacy_model,
                            'feature_names': legacy_features,
                            'scaler': legacy_scaler,
                            'config': {
                                'name': 'Legacy Risk Model',
                                'description': 'Original risk prediction model',
                                'months_required': 3,
                                'folder': 'legacy'
                            }
                        }
                        logger.info("Legacy model loaded successfully as fallback")
            except Exception as e:
                logger.warning(f"Could not load legacy model: {str(e)}")
        
    except FileNotFoundError as e:
        error_msg = f"Model or feature file not found: {str(e)}"
        logger.error(error_msg)
        raise ModelLoadError(error_msg)
    
    except Exception as e:
        error_msg = f"Unexpected error loading models: {str(e)}"
        logger.error(error_msg)
        raise ModelLoadError(error_msg)

def get_current_model():
    """Get the currently active model"""
    if current_model_type in models:
        return models[current_model_type]['model']
    return None

def get_current_feature_names():
    """Get the feature names for the currently active model"""
    if current_model_type in models:
        return models[current_model_type]['feature_names']
    return feature_names

def get_current_scaler():
    """Get the scaler for the currently active model"""
    if current_model_type in models:
        return models[current_model_type]['scaler']
    return None

def set_current_model(model_type):
    """Set the current active model"""
    global current_model_type, feature_names
    if model_type in models:
        current_model_type = model_type
        feature_names = models[model_type]['feature_names']
        return True
    return False

def validate_data_for_model(data, model_type):
    """
    Validate if the student data has enough history for the specified model
    Returns (is_valid, months_available, error_message)
    """
    try:
        # Handle single model case
        if not ENABLE_MULTI_MODEL or model_type == 'single':
            # For single model, use a default requirement of 6 months
            required_months = 6
        elif model_type not in AVAILABLE_MODELS:
            return False, 0, f"Unknown model type: {model_type}"
        else:
            required_months = AVAILABLE_MODELS[model_type]['months_required']
        
        # Extract course data
        courses = data.get('courses', [])
        if not courses:
            return False, 0, "No course data provided"
        
        # Calculate available data months based on assignments
        total_assignments = 0
        for course in courses:
            if isinstance(course, dict):
                assignments = course.get('assignments', [])
                if isinstance(assignments, list):
                    total_assignments += len(assignments)
        
        # Adjusted logic: Since preprocessing simulates months by distributing assignments,
        # we need a more lenient validation. The key is having enough assignments to 
        # populate the required number of months, not actual chronological months.
        # For N months, we need at least N assignments to have some data in each month.
        estimated_months = min(required_months, max(1, total_assignments))
        
        # Allow the model to run if we have at least some assignments
        # The preprocessing will distribute them across the required months
        if total_assignments < required_months:
            # We'll allow it but warn that some months may be sparse
            logger.warning(f"Limited data: {total_assignments} assignments for {required_months}-month model")
        
        # Only reject if we have no assignments at all
        if total_assignments == 0:
            return False, 0, f"No assignments found. Need at least some assignment data for {AVAILABLE_MODELS[model_type]['name']}"
        
        return True, estimated_months, None
        
    except Exception as e:
        return False, 0, f"Error validating data: {str(e)}"

def validate_input_data(data):
    """Validate incoming request data"""
    if not data:
        raise DataValidationError("Request body is empty")
    
    if not isinstance(data, dict):
        raise DataValidationError("Request body must be a JSON object")
    
    # Check for required fields (courses)
    if 'courses' not in data:
        raise DataValidationError("Missing required field: courses")
    
    # Validate course structure
    courses = data['courses']
    if not isinstance(courses, list):
        raise DataValidationError("Courses must be an array")
    
    if len(courses) == 0:
        raise DataValidationError("At least one course is required")
    
    # Validate assignments
    for i, course in enumerate(courses):
        if not isinstance(course, dict):
            raise DataValidationError(f"Course {i} must be an object")
        
        if 'assignments' not in course:
            raise DataValidationError(f"Course {i} missing assignments field")
        
        assignments = course['assignments']
        if not isinstance(assignments, list):
            raise DataValidationError(f"Course {i} assignments must be an array")
    
    # Validate optional numeric fields
    numeric_fields = ['averageScore', 'completionRate', 'gradeLevel']
    for field in numeric_fields:
        if field in data:
            try:
                float(data[field])
            except (ValueError, TypeError):
                raise DataValidationError(f"Field {field} must be a number")
    
    return data
    """Validate incoming request data"""
    if not data:
        raise DataValidationError("Request body is empty")
    
    if not isinstance(data, dict):
        raise DataValidationError("Request data must be a JSON object")
    
    # Check for required fields or provide defaults
    if 'courses' not in data:
        logger.warning("No courses provided in request, using empty list")
        data['courses'] = []
    
    if not isinstance(data['courses'], list):
        raise DataValidationError("'courses' must be an array")
    
    # Validate course structure
    for i, course in enumerate(data['courses']):
        if not isinstance(course, dict):
            raise DataValidationError(f"Course {i} must be an object")
        
        if 'assignments' in course and not isinstance(course['assignments'], list):
            raise DataValidationError(f"Course {i} assignments must be an array")
        
        # Validate assignments
        assignments = course.get('assignments', [])
        for j, assignment in enumerate(assignments):
            if not isinstance(assignment, dict):
                raise DataValidationError(f"Course {i}, assignment {j} must be an object")
            
            progress = assignment.get('progress', {})
            if not isinstance(progress, dict):
                raise DataValidationError(f"Course {i}, assignment {j} progress must be an object")
    
    # Validate optional numeric fields
    numeric_fields = ['averageScore', 'completionRate', 'gradeLevel']
    for field in numeric_fields:
        if field in data:
            try:
                float(data[field])
            except (ValueError, TypeError):
                raise DataValidationError(f"'{field}' must be a number")
    
    return data

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
    Transform incoming student data to match the exact training data format.
    This function creates the same features as the training pipeline using 6-month features.
    
    Expected model features:
    - Score_Month_1, Score_Month_2, Score_Month_3, Score_Month_4, Score_Month_5, Score_Month_6
    - TimeSpent_Month_1, TimeSpent_Month_2, TimeSpent_Month_3, TimeSpent_Month_4, TimeSpent_Month_5, TimeSpent_Month_6
    - totalTimeSpentMinutes, gradeLevel, late_submission_rate
    - avg_score_month_1_to_6, avg_time_month_1_to_6, score_variance_month_1_to_6, time_variance_month_1_to_6
    - time_score_ratio_month_1_to_6, engagement_month_1_to_6, weighted_score_month_1_to_6, score_trend_month_1_to_6
    """
    if not feature_names:
        raise PreprocessingError("Feature names not available")
    
    if not isinstance(feature_names, (list, np.ndarray)):
        raise PreprocessingError("Feature names must be a list or array")
    
    try:
        # Validate feature names
        if len(feature_names) == 0:
            raise PreprocessingError("Feature names list is empty")
        
        # Initialize all features with default values
        processed_data = pd.DataFrame(columns=feature_names, dtype=float)
        processed_data.loc[0] = 0.0  # Initialize with zeros
        
        # Extract relevant information from the request
        courses = data.get('courses', [])
        
        if not courses:
            logger.info("No courses provided, using default values")
            return processed_data.values
        
        # Validate courses data
        if not isinstance(courses, list):
            raise PreprocessingError("Courses must be a list")
        
        # Process assignment data to simulate the CSV structure used in training
        # We'll aggregate assignment data by simulated months (first 6 months)
        monthly_scores = [[], [], [], [], [], []]  # For months 1, 2, 3, 4, 5, 6
        monthly_times = [[], [], [], [], [], []]   # For months 1, 2, 3, 4, 5, 6
        
        total_time = 0
        late_submissions = 0
        total_assignments = 0
        
        # Process each course and assignment
        for course_idx, course in enumerate(courses):
            if not isinstance(course, dict):
                logger.warning(f"Course {course_idx} is not a dictionary, skipping")
                continue
            
            assignments = course.get('assignments', [])
            
            if not isinstance(assignments, list):
                logger.warning(f"Course {course_idx} assignments is not a list, skipping")
                continue
            
            for assignment_idx, assignment in enumerate(assignments):
                try:
                    if not isinstance(assignment, dict):
                        logger.warning(f"Course {course_idx}, assignment {assignment_idx} is not a dictionary, skipping")
                        continue
                    
                    progress = assignment.get('progress', {})
                    
                    if not isinstance(progress, dict):
                        logger.warning(f"Course {course_idx}, assignment {assignment_idx} progress is not a dictionary, skipping")
                        continue
                    
                    # Get assignment data with validation
                    score = progress.get('totalScore', 0)
                    time_spent = progress.get('totalTime', 0)
                    is_late = progress.get('isLate', False)
                    
                    # Validate numeric values
                    try:
                        score = float(score) if score is not None else 0
                        time_spent = float(time_spent) if time_spent is not None else 0
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid numeric values in course {course_idx}, assignment {assignment_idx}, using defaults")
                        score = 0
                        time_spent = 0
                    
                    # Validate boolean value
                    if not isinstance(is_late, bool):
                        is_late = bool(is_late) if is_late is not None else False
                    
                    # Accumulate totals
                    total_time += time_spent
                    total_assignments += 1
                    if is_late:
                        late_submissions += 1
                    
                    # Distribute assignments across 6 months for early warning features
                    # Use assignment index to determine month (simulate chronological order)
                    month_idx = assignment_idx % 6  # Cycles through 0, 1, 2, 3, 4, 5 (representing months 1, 2, 3, 4, 5, 6)
                    monthly_scores[month_idx].append(score)
                    monthly_times[month_idx].append(time_spent)
                    
                except Exception as e:
                    logger.warning(f"Error processing course {course_idx}, assignment {assignment_idx}: {str(e)}")
                    continue
        
        # Calculate monthly cumulative scores and time spent for first 6 months
        cumulative_scores = []
        monthly_time_totals = []
        
        for month_idx in range(6):
            # Calculate cumulative average score up to this month
            all_scores_up_to_month = []
            all_time_up_to_month = 0
            
            for m in range(month_idx + 1):
                all_scores_up_to_month.extend(monthly_scores[m])
                all_time_up_to_month += sum(monthly_times[m])
            
            # Cumulative average score
            if all_scores_up_to_month:
                cumulative_avg = np.mean(all_scores_up_to_month)
            else:
                cumulative_avg = 0
            
            # Time spent in this specific month
            month_time = sum(monthly_times[month_idx])
            
            cumulative_scores.append(cumulative_avg)
            monthly_time_totals.append(month_time)
            
            # Set monthly features
            score_col = f'Score_Month_{month_idx + 1}'
            time_col = f'TimeSpent_Month_{month_idx + 1}'
            
            if score_col in feature_names:
                processed_data.loc[0, score_col] = cumulative_avg
            if time_col in feature_names:
                processed_data.loc[0, time_col] = month_time
        
        # Set basic features
        if 'totalTimeSpentMinutes' in feature_names:
            processed_data.loc[0, 'totalTimeSpentMinutes'] = total_time
        
        if 'gradeLevel' in feature_names:
            grade_level = data.get('gradeLevel', 12)
            try:
                grade_level = int(float(grade_level))
                processed_data.loc[0, 'gradeLevel'] = grade_level
            except (ValueError, TypeError):
                processed_data.loc[0, 'gradeLevel'] = 12
        
        if 'late_submission_rate' in feature_names:
            if total_assignments > 0:
                rate = late_submissions / total_assignments
                processed_data.loc[0, 'late_submission_rate'] = rate
            else:
                processed_data.loc[0, 'late_submission_rate'] = 0
        
        # Calculate early warning features (matching the training pipeline)
        try:
            # Early average score (first 6 months)
            if 'avg_score_month_1_to_6' in feature_names:
                non_zero_scores = [s for s in cumulative_scores if s > 0]
                if non_zero_scores:
                    processed_data.loc[0, 'avg_score_month_1_to_6'] = np.mean(non_zero_scores)
                else:
                    processed_data.loc[0, 'avg_score_month_1_to_6'] = 0
            
            # Early average time (first 6 months)
            if 'avg_time_month_1_to_6' in feature_names:
                processed_data.loc[0, 'avg_time_month_1_to_6'] = np.mean(monthly_time_totals)
            
            # Early score variance (consistency indicator)
            if 'score_variance_month_1_to_6' in feature_names:
                non_zero_scores = [s for s in cumulative_scores if s > 0]
                if len(non_zero_scores) > 1:
                    processed_data.loc[0, 'score_variance_month_1_to_6'] = np.var(non_zero_scores)
                else:
                    processed_data.loc[0, 'score_variance_month_1_to_6'] = 0
            
            # Early time variance
            if 'time_variance_month_1_to_6' in feature_names:
                if len(monthly_time_totals) > 1:
                    processed_data.loc[0, 'time_variance_month_1_to_6'] = np.var(monthly_time_totals)
                else:
                    processed_data.loc[0, 'time_variance_month_1_to_6'] = 0
            
            # Time-to-score efficiency ratio
            if 'time_score_ratio_month_1_to_6' in feature_names:
                avg_score = processed_data.loc[0, 'avg_score_month_1_to_6'] if 'avg_score_month_1_to_6' in feature_names else np.mean([s for s in cumulative_scores if s > 0]) or 1
                avg_time = processed_data.loc[0, 'avg_time_month_1_to_6'] if 'avg_time_month_1_to_6' in feature_names else np.mean(monthly_time_totals)
                
                if avg_score > 0:
                    processed_data.loc[0, 'time_score_ratio_month_1_to_6'] = avg_time / avg_score
                else:
                    processed_data.loc[0, 'time_score_ratio_month_1_to_6'] = 0
            
            # Early engagement (proportion of months with activity)
            if 'engagement_month_1_to_6' in feature_names:
                active_months = sum(1 for t in monthly_time_totals if t > 0)
                processed_data.loc[0, 'engagement_month_1_to_6'] = active_months / 6
            
            # Weighted early score (more recent months weighted higher)
            if 'weighted_score_month_1_to_6' in feature_names:
                weights = np.array([1, 2, 3, 4, 5, 6])
                valid_scores = [(score, weight) for score, weight in zip(cumulative_scores, weights) if score > 0]
                
                if valid_scores:
                    weighted_sum = sum(score * weight for score, weight in valid_scores)
                    weight_sum = sum(weight for _, weight in valid_scores)
                    processed_data.loc[0, 'weighted_score_month_1_to_6'] = weighted_sum / weight_sum
                else:
                    processed_data.loc[0, 'weighted_score_month_1_to_6'] = 0
            
            # Early trend (slope of scores over first 6 months)
            if 'score_trend_month_1_to_6' in feature_names:
                valid_data = [(i+1, score) for i, score in enumerate(cumulative_scores) if score > 0]
                
                if len(valid_data) >= 2:
                    months, scores = zip(*valid_data)
                    slope, _, _, _, _ = stats.linregress(months, scores)
                    processed_data.loc[0, 'score_trend_month_1_to_6'] = slope if np.isfinite(slope) else 0
                else:
                    processed_data.loc[0, 'score_trend_month_1_to_6'] = 0
            
            # Override with provided summary data if available
            if 'averageScore' in data:
                try:
                    avg_score = float(data['averageScore'])
                    if 'avg_score_month_1_to_6' in feature_names and np.isfinite(avg_score):
                        processed_data.loc[0, 'avg_score_month_1_to_6'] = avg_score
                except (ValueError, TypeError):
                    logger.warning("Invalid averageScore provided, ignoring")
            
            if 'completionRate' in data:
                try:
                    completion_rate = float(data['completionRate'])
                    if 0 <= completion_rate <= 100:
                        completion_ratio = completion_rate / 100.0
                        if 'engagement_month_1_to_6' in feature_names:
                            processed_data.loc[0, 'engagement_month_1_to_6'] = completion_ratio
                    else:
                        logger.warning("Completion rate out of range (0-100), ignoring")
                except (ValueError, TypeError):
                    logger.warning("Invalid completionRate provided, ignoring")
            
        except Exception as e:
            logger.error(f"Error calculating early warning features: {str(e)}")
            # Continue with default values
        
        # Fill any remaining NaN values with 0
        processed_data = processed_data.fillna(0)
        
        # Validate final data
        result = processed_data.values
        if result.shape[1] != len(feature_names):
            raise PreprocessingError(f"Processed data has {result.shape[1]} features but expected {len(feature_names)}")
        
        # Check for any remaining invalid values
        if not np.all(np.isfinite(result)):
            logger.warning("Some non-finite values found, replacing with zeros")
            result = np.nan_to_num(result, nan=0.0, posinf=0.0, neginf=0.0)
        
        return result
        
    except PreprocessingError:
        raise
    except Exception as e:
        error_msg = f"Unexpected error in preprocessing: {str(e)}"
        logger.error(error_msg)
        raise PreprocessingError(error_msg)

# Handle preflight OPTIONS requests
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    try:
        # Check if model is loaded
        current_model = get_current_model()
        current_features = get_current_feature_names()
        
        if current_model is None or current_features is None:
            logger.error("Model or feature names not loaded")
            return jsonify({
                'error': 'Model not available',
                'message': 'The prediction model is not loaded. Please contact the administrator.'
            }), 503
        
        # Get and validate request data
        try:
            data = request.get_json(force=True)
        except Exception as e:
            logger.error(f"Invalid JSON in request: {str(e)}")
            return jsonify({
                'error': 'Invalid JSON',
                'message': 'Request body must contain valid JSON data'
            }), 400

        # Check for model selection parameter
        requested_model_id = data.get('model_id', current_model_type)
        
        # If a specific model is requested, validate it and temporarily switch
        original_model_type = current_model_type
        model_switched = False
        
        if requested_model_id != current_model_type:
            if requested_model_id not in models:
                return jsonify({
                    'error': 'Invalid model',
                    'message': f'Model {requested_model_id} not available. Available models: {list(models.keys())}'
                }), 400
            
            # Validate data for the requested model
            is_valid, months_available, validation_error = validate_data_for_model(data, requested_model_id)
            if not is_valid:
                return jsonify({
                    'error': 'Insufficient data',
                    'message': validation_error,
                    'months_available': months_available,
                    'months_required': AVAILABLE_MODELS[requested_model_id]['months_required']
                }), 422
            
            # Temporarily switch to the requested model
            set_current_model(requested_model_id)
            model_switched = True
            logger.info(f"Temporarily switched to model {requested_model_id} for this prediction")

        # Get current model and features (may have been switched)
        current_model = get_current_model()
        current_features = get_current_feature_names()

        # Validate input data
        try:
            validated_data = validate_input_data(data)
        except DataValidationError as e:
            # Restore original model if switched
            if model_switched:
                set_current_model(original_model_type)
            logger.error(f"Data validation failed: {str(e)}")
            return jsonify({
                'error': 'Invalid input data',
                'message': str(e)
            }), 400

        # Preprocess student data
        try:
            processed_data = preprocess_student_data_for_prediction(validated_data, current_features)
        except PreprocessingError as e:
            # Restore original model if switched
            if model_switched:
                set_current_model(original_model_type)
            logger.error(f"Preprocessing failed: {str(e)}")
            return jsonify({
                'error': 'Data preprocessing failed',
                'message': str(e)
            }), 422

        # Make prediction
        try:
            prediction = current_model.predict(processed_data)[0] if not hasattr(current_model, 'named_steps') else current_model.predict(pd.DataFrame(processed_data, columns=current_features))[0]
            if hasattr(current_model, 'predict_proba'):
                if hasattr(current_model, 'named_steps'):
                    proba = current_model.predict_proba(pd.DataFrame(processed_data, columns=current_features))[0]
                    classes = list(current_model.classes_)
                else:
                    proba = current_model.predict_proba(processed_data)[0]
                    classes = list(current_model.classes_)
            else:
                raise PredictionError("Model lacks predict_proba")
            at_risk_index = classes.index(1)
            not_at_risk_index = classes.index(0)
        except Exception as e:
            error_msg = f"Model prediction failed: {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': 'Prediction failed',
                'message': 'The model could not make a prediction. Please try again.'
            }), 500
        
        # Calculate risk score (probability of being at risk * 100)
        try:
            risk_score = int(proba[at_risk_index] * 100)
            if not 0 <= risk_score <= 100:
                risk_score = max(0, min(100, risk_score))
        except Exception as e:
            logger.error(f"Error calculating risk score: {str(e)}")
            risk_score = 50  # Default fallback
        
        # Get feature importance
        feature_importances = None
        try:
            if hasattr(current_model, 'feature_importances_'):
                importances = dict(zip(current_features, current_model.feature_importances_))
                feature_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
        except Exception as e:
            logger.warning(f"Could not get feature importances: {str(e)}")

        # Get suggested interventions
        try:
            interventions = suggest_interventions(risk_score)
        except Exception as e:
            logger.error(f"Error getting interventions: {str(e)}")
            interventions = {
                "level": "Unknown",
                "urgency": "Unknown",
                "suggestions": ["Unable to generate suggestions at this time"],
                "timeline": "Please contact support"
            }
          # Build response
        response = {
            'is_at_risk': bool(prediction == 1),
            'probability': float(proba[at_risk_index]),
            'risk_score': risk_score,
            'risk_level': interventions['level'],
            'intervention': interventions,
            'model_used': requested_model_id,
            'model_name': AVAILABLE_MODELS[requested_model_id]['name']
        }

        # Add feature importances if available
        if feature_importances:
            response['risk_factors'] = [{'name': factor[0], 'importance': float(factor[1])} for factor in feature_importances]

        # Restore original model if switched
        if model_switched:
            set_current_model(original_model_type)
            logger.info(f"Restored original model {original_model_type}")

        logger.info(f"Prediction successful - Risk Score: {risk_score}, At Risk: {prediction == 1}, Model: {requested_model_id}")
        return jsonify(response)
        
    except Exception as e:
        # Restore original model if switched
        if 'model_switched' in locals() and model_switched:
            set_current_model(original_model_type)
        error_msg = f"Unexpected error in predict endpoint: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict risk for multiple students at once
    
    Expected format:
    {
        "students": [
            {
                "studentId": "123",
                "studentName": "John Doe",
                "gradeLevel": 12,
                "courses": [...],
                ...
            },
            ...
        ]
    }
    """
    try:
        # Check if model is loaded
        current_model = get_current_model()
        current_features = get_current_feature_names()
        
        if current_model is None or current_features is None:
            logger.error("Model or feature names not loaded")
            return jsonify({
                'error': 'Model not available',
                'message': 'The prediction model is not loaded. Please contact the administrator.'
            }), 503
        
        # Get and validate request data
        try:
            data = request.get_json(force=True)
        except Exception as e:
            logger.error(f"Invalid JSON in request: {str(e)}")
            return jsonify({
                'error': 'Invalid JSON',
                'message': 'Request body must contain valid JSON data'
            }), 400
        
        # Validate batch data structure
        if not isinstance(data, dict) or 'students' not in data:
            return jsonify({
                'error': 'Invalid input data',
                'message': 'Request must contain a "students" array'
            }), 400
        
        students = data['students']
        if not isinstance(students, list):
            return jsonify({
                'error': 'Invalid input data',
                'message': '"students" must be an array'
            }), 400
        
        if len(students) == 0:
            return jsonify({
                'error': 'Invalid input data',
                'message': 'Students array cannot be empty'
            }), 400
        
        if len(students) > 100:  # Limit batch size
            return jsonify({
                'error': 'Batch size too large',
                'message': 'Maximum 100 students per batch request'
            }), 400
        
        # Process each student
        results = []
        failed_predictions = []
        
        for i, student_data in enumerate(students):
            try:
                # Validate student data
                validated_data = validate_input_data(student_data)
                
                # Preprocess student data
                processed_data = preprocess_student_data_for_prediction(validated_data, current_features)
                
                # Make prediction
                prediction = current_model.predict(processed_data)[0] if not hasattr(current_model, 'named_steps') else current_model.predict(pd.DataFrame(processed_data, columns=current_features))[0]
                proba = current_model.predict_proba(pd.DataFrame(processed_data, columns=current_features))[0] if hasattr(current_model, 'named_steps') else current_model.predict_proba(processed_data)[0]
                classes = list(current_model.classes_)
                at_risk_index = classes.index(1)
                risk_score = int(proba[at_risk_index] * 100)
                
                # Get interventions
                interventions = suggest_interventions(risk_score)
                
                # Build result for this student
                student_result = {
                    'studentId': student_data.get('studentId', f'student_{i}'),
                    'studentName': student_data.get('studentName', 'Unknown'),
                    'is_at_risk': prediction == 1,
                    'probability': proba[at_risk_index],
                    'risk_score': risk_score,
                    'risk_level': interventions['level'],
                    'intervention': interventions
                }
                
                results.append(student_result)
                
            except Exception as e:
                error_info = {
                    'studentId': student_data.get('studentId', f'student_{i}'),
                    'studentName': student_data.get('studentName', 'Unknown'),
                    'error': str(e)
                }
                failed_predictions.append(error_info)
                logger.warning(f"Failed to predict for student {i}: {str(e)}")
        
        # Calculate summary statistics
        total_students = len(results)
        at_risk_count = sum(1 for r in results if r['is_at_risk'])
        
        summary = {
            'total_students': total_students,
            'successful_predictions': len(results),
            'failed_predictions': len(failed_predictions),
            'at_risk_count': at_risk_count,
            'at_risk_percentage': (at_risk_count / total_students * 100) if total_students > 0 else 0
        }
        
        # Build response
        response = {
            'success': True,
            'summary': summary,
            'predictions': results
        }
        
        if failed_predictions:
            response['failed_predictions'] = failed_predictions
        
        logger.info(f"Batch prediction completed - {len(results)} successful, {len(failed_predictions)} failed")
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Unexpected error in batch predict endpoint: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

@app.route('/api/predict/csv', methods=['POST'])
def predict_from_csv():
    """
    Generate predictions using the complete CSV data pipeline
    This endpoint uses the trained preprocessing pipeline to generate predictions
    """
    try:
        # Check if model is loaded
        current_model = get_current_model()
        current_features = get_current_feature_names()
        
        if current_model is None or current_features is None:
            logger.error("Model or feature names not loaded")
            return jsonify({
                'error': 'Model not available',
                'message': 'The prediction model is not loaded. Please contact the administrator.'
            }), 503
        
        # Import prediction functions
        try:
            import sys
            import os
            # Add the parent directory to Python path to find ml module
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.insert(0, parent_dir)
            from ml.predict import predict_risk_from_raw_data
        except ImportError as e:
            logger.error(f"Could not import prediction functions: {str(e)}")
            return jsonify({
                'error': 'Prediction pipeline not available',
                'message': 'The CSV prediction pipeline is not available.'
            }), 503
        
        # Get optional parameters from request
        data = request.get_json(force=True) if request.is_json else {}
        data_dir = data.get('data_dir', None)  # Optional custom data directory
        model_id = data.get('model_id', None)  # Optional model selection
        
        # Set model paths if specific model is requested
        model_path = None
        scaler_path = None
        features_path = None
        
        if model_id:
            # Use the robust path resolution function
            models_dir = get_robust_models_path()
            
            # Construct model file paths
            if not model_id.endswith('.pkl'):
                model_id_file = f"{model_id}.pkl"
            else:
                model_id_file = model_id
                
            potential_model_path = os.path.normpath(os.path.join(models_dir, model_id_file))
            
            if os.path.exists(potential_model_path):
                model_path = potential_model_path
                # Look for corresponding scaler and features files
                model_name = model_id.replace('.pkl', '').replace('_model', '')
                scaler_path = os.path.normpath(os.path.join(models_dir, 'scaler.pkl'))
                features_path = os.path.normpath(os.path.join(models_dir, 'features.pkl'))
                logger.info(f"Using custom model: {model_path}")
            else:
                logger.warning(f"Requested model {model_id} not found at {potential_model_path}, using default model")
        
        # Run the complete prediction pipeline
        try:
            logger.info("Starting CSV-based prediction pipeline...")
            
            # Ensure we have the ml module in path and import the prediction function
            import sys
            import os
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.insert(0, parent_dir)
            from ml.predict import predict_risk_from_raw_data
            
            # Generate timestamp for output file and ensure it goes to output directory
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'output')
            
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            output_path = os.path.join(output_dir, f"risk_predictions_{timestamp}.csv")
            
            # Call the prediction function with custom parameters if provided
            predictions_df = predict_risk_from_raw_data(
                data_dir=data_dir, 
                output_path=output_path,
                model_path=model_path,
                scaler_path=scaler_path if model_path else None,
                features_path=features_path if model_path else None
            )
            
            if predictions_df is None:
                return jsonify({
                    'error': 'Prediction failed',
                    'message': ('Could not generate predictions from CSV data. '
                               'Please ensure CSV files are available in the "/data" directory. '
                               'You can generate new sample data from the repository: '
                               'https://github.com/ArielBubis/simulating_student_data')
                }), 500
        except Exception as e:
            error_msg = f"CSV prediction pipeline failed: {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': 'Prediction pipeline failed',
                'message': str(e)
            }), 500
        
        # Convert predictions to JSON-friendly format
        try:
            # Select relevant columns for the response
            response_columns = [
                'studentId', 'student_name', 'courseId', 'course_name', 'gradeLevel',
                'at_risk_prediction', 'at_risk_probability', 'risk_status', 'prediction_confidence'
            ]
            
            # Keep only columns that exist in the dataframe
            available_columns = [col for col in response_columns if col in predictions_df.columns]
            response_data = predictions_df[available_columns].copy()
            
            # Convert to records format and ensure JSON serializable types
            predictions_list = response_data.to_dict('records')
            predictions_list = convert_to_json_serializable(predictions_list)
            
            # Calculate summary statistics
            total_predictions = len(predictions_df)
            # Check for at risk using the risk_status column (more reliable)
            if 'risk_status' in predictions_df.columns:
                at_risk_count = (predictions_df['risk_status'] == 'At Risk').sum()
            else:
                # Fallback to at_risk_prediction column
                at_risk_count = (predictions_df['at_risk_prediction'] == 1).sum()
                
            # Convert confidence distribution to JSON serializable format
            confidence_distribution = predictions_df['prediction_confidence'].value_counts().to_dict()
            confidence_distribution = convert_to_json_serializable(confidence_distribution)

            # Ensure we have a risk score probability for class 1
            if 'risk_score' in predictions_df.columns:
                risk_probs = predictions_df['risk_score'].astype(float)
            elif 'at_risk_probability' in predictions_df.columns:
                risk_probs = predictions_df['at_risk_probability'].astype(float)
            else:
                # Fallback: use 0 vector
                risk_probs = pd.Series([0.0]*len(predictions_df))

            # Define bucket thresholds (probability scale 0-1)
            high_mask = risk_probs >= 0.70
            medium_mask = (risk_probs >= 0.55) & (risk_probs < 0.70)
            low_mask = (risk_probs >= 0.45) & (risk_probs < 0.55)
            minimal_mask = risk_probs < 0.45

            bucket_counts = {
                'high': int(high_mask.sum()),
                'medium': int(medium_mask.sum()),
                'low': int(low_mask.sum()),
                'minimal': int(minimal_mask.sum())
            }
            # Ensure bucket counts are JSON serializable
            bucket_counts = convert_to_json_serializable(bucket_counts)

            # Optional: annotate each prediction with bucket
            def bucket_label(p):
                if p >= 0.70: return 'high'
                if p >= 0.55: return 'medium'
                if p >= 0.45: return 'low'
                return 'minimal'
            # Add only if not already present
            if 'risk_bucket' not in response_data.columns and len(response_data):
                response_data['risk_bucket'] = risk_probs.apply(bucket_label)
                predictions_list = response_data.to_dict('records')
                predictions_list = convert_to_json_serializable(predictions_list)

            # Convert summary data to JSON serializable format
            summary = {
                'total_student_courses': convert_to_json_serializable(total_predictions),
                'at_risk_count': convert_to_json_serializable(at_risk_count),
                'at_risk_percentage': convert_to_json_serializable(at_risk_count / total_predictions * 100) if total_predictions > 0 else 0,
                'confidence_distribution': confidence_distribution,
                'risk_bucket_counts': bucket_counts
            }
            
            # Build final response with JSON serializable data
            final_response = {
                'success': True,
                'message': f'Generated predictions for {total_predictions} students',
                'predictions_count': convert_to_json_serializable(total_predictions),
                'at_risk_count': convert_to_json_serializable(at_risk_count),
                'output_file': output_path,
                'timestamp': timestamp,
                'model_used': model_id if model_id else 'default',
                'data_directory': data_dir if data_dir else 'default',
                'summary': {
                    'total_students': convert_to_json_serializable(total_predictions),
                    'at_risk_students': convert_to_json_serializable(at_risk_count),
                    'not_at_risk_students': convert_to_json_serializable(total_predictions - at_risk_count),
                    'at_risk_percentage': convert_to_json_serializable(round((at_risk_count / total_predictions) * 100, 1)) if total_predictions > 0 else 0,
                    'confidence_distribution': confidence_distribution,
                    'risk_bucket_counts': bucket_counts
                },
                'predictions': predictions_list[:50] if len(predictions_list) > 50 else predictions_list  # Limit response size
            }
            
            logger.info(f"CSV prediction completed - {total_predictions} predictions generated")
            return jsonify(final_response)
            
        except Exception as e:
            error_msg = f"Error formatting CSV prediction results: {str(e)}"
            logger.error(error_msg)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error details: {repr(e)}")
            # Try to provide more specific error information
            if "JSON" in str(e) or "serializable" in str(e):
                logger.error("JSON serialization error detected - likely caused by numpy/pandas data types")
            return jsonify({
                'error': 'Response formatting failed',
                'message': 'Predictions were generated but could not be formatted for response.',
                'details': str(e) if app.debug else None
            }), 500
        
    except Exception as e:
        error_msg = f"Unexpected error in CSV predict endpoint: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

@app.route('/api/risk/students', methods=['GET'])
def get_at_risk_students():
    """
    Get at-risk students from the latest CSV predictions file
    Returns students with high risk scores or flagged as at-risk
    """
    try:
        # Find the latest CSV prediction file in the output directory
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'output')
        csv_files = []
        
        if os.path.exists(output_dir):
            for file in os.listdir(output_dir):
                if file.startswith('risk_predictions_') and file.endswith('.csv'):
                    csv_files.append(file)
        else:
            logger.error(f"Output directory not found: {output_dir}")
            return jsonify({
                'error': 'Output directory not found',
                'message': 'Predictions output directory does not exist'
            }), 404
        
        if not csv_files:
            return jsonify({
                'error': 'No predictions available',
                'message': 'No risk prediction CSV files found. Please run predictions first.'
            }), 404
        
        # Get the latest file (sorted by name which includes timestamp)
        latest_file = sorted(csv_files, reverse=True)[0]
        latest_file_path = os.path.join(output_dir, latest_file)
        
        # Read the CSV file
        try:
            df = pd.read_csv(latest_file_path)
        except Exception as e:
            logger.error(f"Error reading CSV file {latest_file_path}: {str(e)}")
            return jsonify({
                'error': 'File read error',
                'message': f'Could not read predictions file: {str(e)}'
            }), 500
        
        # Load student and course lookup data
        try:
            # Read students CSV for name mapping
            students_df = pd.read_csv('../../data/students.csv')
            student_lookup = dict(zip(students_df['id'].astype(str), students_df['name']))
            
            # Read courses CSV for course name mapping
            courses_df = pd.read_csv('../../data/courses.csv')
            course_lookup = dict(zip(courses_df['id'], courses_df['name']))
            
            logger.info(f"Loaded {len(student_lookup)} student names and {len(course_lookup)} course names")
        except Exception as e:
            logger.warning(f"Could not load student/course lookup data: {str(e)}")
            student_lookup = {}
            course_lookup = {}
        
        # Filter for at-risk students: prediction == 1 (at risk) OR probability threshold
        at_risk_df = df[
            (df['at_risk_prediction'] == 1) |
            (df.get('risk_score', df.get('at_risk_probability', 0)) >= 0.70)
        ].copy()
          # Convert to list of dictionaries for frontend consumption
        at_risk_students = []
        for _, row in at_risk_df.iterrows():
            student_id = str(row.get('studentId', ''))
            course_id = str(row.get('courseId', ''))
            
            # Get actual names from lookup tables
            student_name = student_lookup.get(student_id, f'Student {student_id}')
            course_name = course_lookup.get(course_id, f'Course {course_id}')
            
            student = {
                'id': student_id,
                'studentId': student_id,
                'name': student_name,  # Add the actual student name
                'courseId': course_id,
                'courseName': course_name,  # Add the actual course name
                'gradeLevel': convert_to_json_serializable(row.get('gradeLevel', 12)),
                'mlRiskScore': convert_to_json_serializable(row.get('risk_score', 0) * 100),  # Convert to percentage
                'mlRiskLevel': str(row.get('risk_status', 'Unknown')).lower(),
                'isAtRisk': convert_to_json_serializable(row.get('at_risk_prediction', 0) == 1),
                'probability': convert_to_json_serializable(row.get('at_risk_probability', 0)),
                'confidence': str(row.get('prediction_confidence', 'Unknown')),
                'finalScore': convert_to_json_serializable(row.get('finalScore', 0)),
                'totalTimeSpentMinutes': convert_to_json_serializable(row.get('totalTimeSpentMinutes', 0)),
                'lateSubmissionRate': convert_to_json_serializable(row.get('late_submission_rate', 0)),
                'performance': convert_to_json_serializable(row.get('finalScore', 0)),
                'completion': convert_to_json_serializable(min(100, float(row.get('totalTimeSpentMinutes', 0)) / 10)),  # Rough estimate
                'lastActive': None,  # Not available in CSV
                'mlRiskFactors': []  # We'll populate this based on data patterns
            }
            
            # Generate risk factors based on the data
            risk_factors = []
            if row.get('late_submission_rate', 0) > 0.3:
                risk_factors.append('High Late Submission Rate')
            if row.get('finalScore', 100) < 60:
                risk_factors.append('Low Academic Performance')
            if row.get('totalTimeSpentMinutes', 1000) < 300:
                risk_factors.append('Low Engagement')
            if row.get('declining_performance', 0) == 1:
                risk_factors.append('Declining Performance')
            if row.get('inconsistent_performance', 0) == 1:
                risk_factors.append('Inconsistent Performance')
            if row.get('low_engagement', 0) == 1:
                risk_factors.append('Low Engagement Pattern')
            
            student['mlRiskFactors'] = risk_factors
            at_risk_students.append(student)
        
        # Sort by risk score (highest first)
        at_risk_students.sort(key=lambda x: x['mlRiskScore'], reverse=True)
        
        # Calculate summary statistics
        total_students = len(df)
        at_risk_count = len(at_risk_students)
        
        summary = {
            'total_students_analyzed': convert_to_json_serializable(total_students),
            'at_risk_count': convert_to_json_serializable(at_risk_count),
            'at_risk_percentage': convert_to_json_serializable((at_risk_count / total_students * 100) if total_students > 0 else 0),
            'prediction_file': latest_file,
            'high_risk_count': convert_to_json_serializable(len([s for s in at_risk_students if s['mlRiskScore'] >= 70])),
            'medium_risk_count': convert_to_json_serializable(len([s for s in at_risk_students if 55 <= s['mlRiskScore'] < 70])),
            'low_risk_count': convert_to_json_serializable(len([s for s in at_risk_students if 45 <= s['mlRiskScore'] < 55])),
            'minimal_risk_count': convert_to_json_serializable(len([s for s in at_risk_students if s['mlRiskScore'] < 45]))
        }
        
        response = {
            'success': True,
            'summary': summary,
            'students': at_risk_students,
            'message': f'Found {at_risk_count} at-risk students from {total_students} analyzed'
        }
        
        logger.info(f"At-risk students query completed - {at_risk_count} students found")
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_at_risk_students: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

@app.route('/api/risk/course-data', methods=['GET'])
def get_course_risk_data():
    """
    Get all course-specific risk data from the latest CSV predictions file
    Returns raw course-risk data for student-course combinations
    """
    try:
        # Find the latest CSV prediction file
        csv_files = []
        for file in os.listdir('.'):
            if file.startswith('risk_predictions_') and file.endswith('.csv'):
                csv_files.append(file)
        
        if not csv_files:
            return jsonify([])  # Return empty array if no files found
        
        # Get the latest file (sorted by name which includes timestamp)
        latest_file = sorted(csv_files, reverse=True)[0]
        
        # Read the CSV file
        try:
            df = pd.read_csv(latest_file)
        except Exception as e:
            logger.error(f"Error reading CSV file {latest_file}: {str(e)}")
            return jsonify([])  # Return empty array on error
        
        # Convert to list of dictionaries for frontend consumption
        course_risk_data = []
        for _, row in df.iterrows():
            risk_entry = {
                'studentId': str(row.get('studentId', '')),
                'courseId': str(row.get('courseId', '')),
                'risk_score': convert_to_json_serializable(row.get('risk_score', 0)),
                'at_risk_prediction': convert_to_json_serializable(row.get('at_risk_prediction', 1)),
                'at_risk_probability': convert_to_json_serializable(row.get('at_risk_probability', 0)),
                'risk_status': str(row.get('risk_status', 'Unknown')),
                'prediction_confidence': str(row.get('prediction_confidence', 'Unknown')),
                'finalScore': convert_to_json_serializable(row.get('finalScore', 0)),
                'late_submission_rate': convert_to_json_serializable(row.get('late_submission_rate', 0)),
                'totalTimeSpentMinutes': convert_to_json_serializable(row.get('totalTimeSpentMinutes', 0)),
                'declining_performance': convert_to_json_serializable(row.get('declining_performance', 0)),
                'low_engagement': convert_to_json_serializable(row.get('low_engagement', 0)),
                'inconsistent_performance': convert_to_json_serializable(row.get('inconsistent_performance', 0))
            }
            course_risk_data.append(risk_entry)
        
        logger.info(f"Course risk data query completed - {len(course_risk_data)} entries found")
        return jsonify(course_risk_data)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_course_risk_data: {str(e)}"
        logger.error(error_msg)
        return jsonify([])  # Return empty array on error

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not found',
        'message': 'The requested endpoint does not exist'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'error': 'Method not allowed',
        'message': 'The HTTP method is not allowed for this endpoint'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

# Initialize model on startup
try:
    load_model_and_features()
    logger.info("Application started successfully")
except ModelLoadError as e:
    logger.error(f"Failed to load model: {str(e)}")
    # Continue running but with degraded functionality

if __name__ == '__main__':
    app.run(debug=True, port=5000)
