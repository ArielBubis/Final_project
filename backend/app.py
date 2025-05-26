from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import pandas as pd
import os
import logging
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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Enable CORS with more specific settings
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}}, 
     supports_credentials=True)

# Global variables for model and features
model = None
feature_names = None

def load_model_and_features():
    """Load model and feature names with comprehensive error handling"""
    global model, feature_names
    
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Define paths
        model_path = os.path.join(script_dir, 'models', 'at_risk_rf_model.pkl')
        feature_names_path = os.path.join(script_dir, 'models', 'features.pkl')
        
        # Check if files exist
        if not os.path.exists(model_path):
            raise ModelLoadError(f"Model file not found at: {model_path}")
        
        if not os.path.exists(feature_names_path):
            raise ModelLoadError(f"Feature names file not found at: {feature_names_path}")
        
        # Load model
        logger.info(f"Loading model from: {model_path}")
        model = joblib.load(model_path)
        
        if model is None:
            raise ModelLoadError("Model loaded but is None")
        
        # Load feature names
        logger.info(f"Loading feature names from: {feature_names_path}")
        with open(feature_names_path, 'rb') as f:
            feature_names = joblib.load(f)
        
        if feature_names is None or len(feature_names) == 0:
            raise ModelLoadError("Feature names loaded but are empty")
        
        logger.info(f"Successfully loaded model with {len(feature_names)} features")
        
    except FileNotFoundError as e:
        error_msg = f"Model or feature file not found: {str(e)}"
        logger.error(error_msg)
        raise ModelLoadError(error_msg)
    
    except Exception as e:
        error_msg = f"Unexpected error loading model: {str(e)}"
        logger.error(error_msg)
        raise ModelLoadError(error_msg)

def validate_input_data(data):
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
    This function creates the same features as the training pipeline using early warning features.
    
    Expected model features:
    - Score_Month_1, Score_Month_2, Score_Month_3
    - TimeSpent_Month_1, TimeSpent_Month_2, TimeSpent_Month_3
    - totalTimeSpentMinutes, gradeLevel, late_submission_rate
    - early_avg_score, early_avg_time, early_score_variance, early_time_variance
    - early_time_score_ratio, early_engagement, weighted_early_score, early_trend
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
        # We'll aggregate assignment data by simulated months (first 3 months)
        monthly_scores = [[], [], []]  # For months 1, 2, 3
        monthly_times = [[], [], []]   # For months 1, 2, 3
        
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
                    
                    # Distribute assignments across 3 months for early warning features
                    # Use assignment index to determine month (simulate chronological order)
                    month_idx = assignment_idx % 3  # Cycles through 0, 1, 2 (representing months 1, 2, 3)
                    monthly_scores[month_idx].append(score)
                    monthly_times[month_idx].append(time_spent)
                    
                except Exception as e:
                    logger.warning(f"Error processing course {course_idx}, assignment {assignment_idx}: {str(e)}")
                    continue
        
        # Calculate monthly cumulative scores and time spent for first 3 months
        cumulative_scores = []
        monthly_time_totals = []
        
        for month_idx in range(3):
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
            # Early average score (first 3 months)
            if 'early_avg_score' in feature_names:
                non_zero_scores = [s for s in cumulative_scores if s > 0]
                if non_zero_scores:
                    processed_data.loc[0, 'early_avg_score'] = np.mean(non_zero_scores)
                else:
                    processed_data.loc[0, 'early_avg_score'] = 0
            
            # Early average time (first 3 months)
            if 'early_avg_time' in feature_names:
                processed_data.loc[0, 'early_avg_time'] = np.mean(monthly_time_totals)
            
            # Early score variance (consistency indicator)
            if 'early_score_variance' in feature_names:
                non_zero_scores = [s for s in cumulative_scores if s > 0]
                if len(non_zero_scores) > 1:
                    processed_data.loc[0, 'early_score_variance'] = np.var(non_zero_scores)
                else:
                    processed_data.loc[0, 'early_score_variance'] = 0
            
            # Early time variance
            if 'early_time_variance' in feature_names:
                if len(monthly_time_totals) > 1:
                    processed_data.loc[0, 'early_time_variance'] = np.var(monthly_time_totals)
                else:
                    processed_data.loc[0, 'early_time_variance'] = 0
            
            # Time-to-score efficiency ratio
            if 'early_time_score_ratio' in feature_names:
                avg_score = processed_data.loc[0, 'early_avg_score'] if 'early_avg_score' in feature_names else np.mean([s for s in cumulative_scores if s > 0]) or 1
                avg_time = processed_data.loc[0, 'early_avg_time'] if 'early_avg_time' in feature_names else np.mean(monthly_time_totals)
                
                if avg_score > 0:
                    processed_data.loc[0, 'early_time_score_ratio'] = avg_time / avg_score
                else:
                    processed_data.loc[0, 'early_time_score_ratio'] = 0
            
            # Early engagement (proportion of months with activity)
            if 'early_engagement' in feature_names:
                active_months = sum(1 for t in monthly_time_totals if t > 0)
                processed_data.loc[0, 'early_engagement'] = active_months / 3
            
            # Weighted early score (more recent months weighted higher)
            if 'weighted_early_score' in feature_names:
                weights = np.array([1, 2, 3])
                valid_scores = [(score, weight) for score, weight in zip(cumulative_scores, weights) if score > 0]
                
                if valid_scores:
                    weighted_sum = sum(score * weight for score, weight in valid_scores)
                    weight_sum = sum(weight for _, weight in valid_scores)
                    processed_data.loc[0, 'weighted_early_score'] = weighted_sum / weight_sum
                else:
                    processed_data.loc[0, 'weighted_early_score'] = 0
            
            # Early trend (slope of scores over first 3 months)
            if 'early_trend' in feature_names:
                valid_data = [(i+1, score) for i, score in enumerate(cumulative_scores) if score > 0]
                
                if len(valid_data) >= 2:
                    months, scores = zip(*valid_data)
                    slope, _, _, _, _ = stats.linregress(months, scores)
                    processed_data.loc[0, 'early_trend'] = slope if np.isfinite(slope) else 0
                else:
                    processed_data.loc[0, 'early_trend'] = 0
            
            # Override with provided summary data if available
            if 'averageScore' in data:
                try:
                    avg_score = float(data['averageScore'])
                    if 'early_avg_score' in feature_names and np.isfinite(avg_score):
                        processed_data.loc[0, 'early_avg_score'] = avg_score
                except (ValueError, TypeError):
                    logger.warning("Invalid averageScore provided, ignoring")
            
            if 'completionRate' in data:
                try:
                    completion_rate = float(data['completionRate'])
                    if 0 <= completion_rate <= 100:
                        completion_ratio = completion_rate / 100.0
                        if 'early_engagement' in feature_names:
                            processed_data.loc[0, 'early_engagement'] = completion_ratio
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

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Check if model is loaded
        if model is None or feature_names is None:
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
        
        # Validate input data
        try:
            validated_data = validate_input_data(data)
        except DataValidationError as e:
            logger.error(f"Data validation failed: {str(e)}")
            return jsonify({
                'error': 'Invalid input data',
                'message': str(e)
            }), 400
        
        # Preprocess student data
        try:
            processed_data = preprocess_student_data_for_prediction(validated_data, feature_names)
        except PreprocessingError as e:
            logger.error(f"Preprocessing failed: {str(e)}")
            return jsonify({
                'error': 'Data preprocessing failed',
                'message': str(e)
            }), 422
        
        # Make prediction
        try:
            prediction = model.predict(processed_data)[0]
            probabilities = model.predict_proba(processed_data)[0]
            
            # Validate prediction results
            if not isinstance(prediction, (int, np.integer)):
                raise PredictionError(f"Invalid prediction type: {type(prediction)}")
            
            if not isinstance(probabilities, np.ndarray) or len(probabilities) != 2:
                raise PredictionError("Invalid probabilities array")
            
            if not np.all(np.isfinite(probabilities)):
                raise PredictionError("Non-finite values in probabilities")
            
            probabilities = probabilities.tolist()
            
        except Exception as e:
            error_msg = f"Model prediction failed: {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': 'Prediction failed',
                'message': 'The model could not make a prediction. Please try again.'
            }), 500
        
        # Calculate risk score (probability of being at risk * 100)
        try:
            risk_score = int(probabilities[0] * 100)  # probabilities[0] is probability of being at risk (class 0)
            if not 0 <= risk_score <= 100:
                risk_score = max(0, min(100, risk_score))
        except Exception as e:
            logger.error(f"Error calculating risk score: {str(e)}")
            risk_score = 50  # Default fallback
        
        # Get feature importance
        feature_importances = None
        try:
            if hasattr(model, 'feature_importances_'):
                importances = dict(zip(feature_names, model.feature_importances_))
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
            'is_at_risk': bool(prediction == 0),  # Class 0 = at risk, Class 1 = not at risk
            'probability': float(probabilities[0]),  # Probability of being at risk
            'risk_score': risk_score,
            'risk_level': interventions['level'],
            'intervention': interventions
        }
        
        # Add feature importances if available
        if feature_importances:
            response['risk_factors'] = [{'name': factor[0], 'importance': float(factor[1])} for factor in feature_importances]
        
        logger.info(f"Prediction successful - Risk Score: {risk_score}, At Risk: {prediction == 0}")
        return jsonify(response)
        
    except Exception as e:
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
        if model is None or feature_names is None:
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
                processed_data = preprocess_student_data_for_prediction(validated_data, feature_names)
                
                # Make prediction
                prediction = model.predict(processed_data)[0]
                probabilities = model.predict_proba(processed_data)[0]
                
                # Calculate risk score
                risk_score = int(probabilities[0] * 100)
                risk_score = max(0, min(100, risk_score))
                
                # Get interventions
                interventions = suggest_interventions(risk_score)
                
                # Build result for this student
                student_result = {
                    'studentId': student_data.get('studentId', f'student_{i}'),
                    'studentName': student_data.get('studentName', 'Unknown'),
                    'is_at_risk': prediction == 0,
                    'probability': probabilities[0],
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
        if model is None or feature_names is None:
            logger.error("Model or feature names not loaded")
            return jsonify({
                'error': 'Model not available',
                'message': 'The prediction model is not loaded. Please contact the administrator.'
            }), 503
        
        # Import prediction functions
        try:
            from predict import predict_risk_from_raw_data
        except ImportError as e:
            logger.error(f"Could not import prediction functions: {str(e)}")
            return jsonify({
                'error': 'Prediction pipeline not available',
                'message': 'The CSV prediction pipeline is not available.'
            }), 503
        
        # Get optional parameters from request
        data = request.get_json(force=True) if request.is_json else {}
        data_dir = data.get('data_dir', None)  # Optional custom data directory
        
        # Run the complete prediction pipeline
        try:
            logger.info("Starting CSV-based prediction pipeline...")
            predictions_df = predict_risk_from_raw_data(data_dir=data_dir)
            
            if predictions_df is None:
                return jsonify({
                    'error': 'Prediction failed',
                    'message': 'Could not generate predictions from CSV data. Check that CSV files are available.'
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
            
            # Convert to records format
            predictions_list = response_data.to_dict('records')
            
            # Calculate summary statistics
            total_predictions = len(predictions_df)
            at_risk_count = (predictions_df['at_risk_prediction'] == 0).sum()
            confidence_distribution = predictions_df['prediction_confidence'].value_counts().to_dict()
            
            summary = {
                'total_student_courses': total_predictions,
                'at_risk_count': int(at_risk_count),
                'at_risk_percentage': float(at_risk_count / total_predictions * 100) if total_predictions > 0 else 0,
                'confidence_distribution': confidence_distribution
            }
            
            # Build response
            response = {
                'success': True,
                'summary': summary,
                'predictions': predictions_list,
                'message': f'Generated predictions for {total_predictions} student-course combinations'
            }
            
            logger.info(f"CSV prediction completed - {total_predictions} predictions generated")
            return jsonify(response)
            
        except Exception as e:
            error_msg = f"Error formatting CSV prediction results: {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': 'Response formatting failed',
                'message': 'Predictions were generated but could not be formatted for response.'
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
        # Find the latest CSV prediction file
        csv_files = []
        for file in os.listdir('.'):
            if file.startswith('risk_predictions_') and file.endswith('.csv'):
                csv_files.append(file)
        
        if not csv_files:
            return jsonify({
                'error': 'No predictions available',
                'message': 'No risk prediction CSV files found. Please run predictions first.'
            }), 404
        
        # Get the latest file (sorted by name which includes timestamp)
        latest_file = sorted(csv_files, reverse=True)[0]
        
        # Read the CSV file
        try:
            df = pd.read_csv(latest_file)
        except Exception as e:
            logger.error(f"Error reading CSV file {latest_file}: {str(e)}")
            return jsonify({
                'error': 'File read error',
                'message': f'Could not read predictions file: {str(e)}'
            }), 500
        
        # Load student and course lookup data
        try:
            # Read students CSV for name mapping
            students_df = pd.read_csv('../data/csv/students.csv')
            student_lookup = dict(zip(students_df['id'].astype(str), students_df['name']))
            
            # Read courses CSV for course name mapping
            courses_df = pd.read_csv('../data/csv/courses.csv')
            course_lookup = dict(zip(courses_df['id'], courses_df['name']))
            
            logger.info(f"Loaded {len(student_lookup)} student names and {len(course_lookup)} course names")
        except Exception as e:
            logger.warning(f"Could not load student/course lookup data: {str(e)}")
            student_lookup = {}
            course_lookup = {}
        
        # Filter for at-risk students (either at_risk_prediction = 0 or risk_score >= 50)
        at_risk_df = df[
            (df['at_risk_prediction'] == 0) | 
            (df['risk_score'] >= 0.5)  # Assuming risk_score is probability (0-1)
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
                'gradeLevel': int(row.get('gradeLevel', 12)),
                'mlRiskScore': float(row.get('risk_score', 0) * 100),  # Convert to percentage
                'mlRiskLevel': str(row.get('risk_status', 'Unknown')).lower(),
                'isAtRisk': bool(row.get('at_risk_prediction', 1) == 0),
                'probability': float(row.get('at_risk_probability', 0)),
                'confidence': str(row.get('prediction_confidence', 'Unknown')),
                'finalScore': float(row.get('finalScore', 0)),
                'totalTimeSpentMinutes': float(row.get('totalTimeSpentMinutes', 0)),
                'lateSubmissionRate': float(row.get('late_submission_rate', 0)),
                'performance': float(row.get('finalScore', 0)),
                'completion': min(100, float(row.get('totalTimeSpentMinutes', 0)) / 10),  # Rough estimate
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
            'total_students_analyzed': total_students,
            'at_risk_count': at_risk_count,
            'at_risk_percentage': (at_risk_count / total_students * 100) if total_students > 0 else 0,
            'prediction_file': latest_file,
            'high_risk_count': len([s for s in at_risk_students if s['mlRiskScore'] >= 70]),
            'medium_risk_count': len([s for s in at_risk_students if 40 <= s['mlRiskScore'] < 70]),
            'low_risk_count': len([s for s in at_risk_students if s['mlRiskScore'] < 40])
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

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        status = {
            'status': 'healthy',
            'model_loaded': model is not None,
            'features_loaded': feature_names is not None,
            'feature_count': len(feature_names) if feature_names else 0
        }
        
        if not model or not feature_names:
            status['status'] = 'degraded'
            return jsonify(status), 503
        
        return jsonify(status)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

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
