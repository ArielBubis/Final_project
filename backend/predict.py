import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
import warnings
from scipy import stats
from pre_processing import (
    load_csv_data, 
    create_monthly_student_scores_with_time, 
    prepare_student_data_for_ml,
    create_risk_prediction_dataset
)

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

def create_early_warning_features(df):
    """
    Create early warning features using only the first 3 months of data.
    This function matches the feature engineering done during model training.
    
    Args:
        df: DataFrame with monthly score and time data
        
    Returns:
        DataFrame with additional early warning features
    """
    df = df.copy()
    
    # Get available score and time columns
    score_columns = [col for col in df.columns if col.startswith('Score_Month_')]
    time_columns = [col for col in df.columns if col.startswith('TimeSpent_Month_')]
    
    # Sort by month number
    score_columns = sorted(score_columns, key=lambda x: int(x.split('_')[-1]))
    time_columns = sorted(time_columns, key=lambda x: int(x.split('_')[-1]))
    
    # Use only first 3 months for early warning
    early_score_columns = [col for col in score_columns if int(col.split('_')[-1]) <= 3]
    early_time_columns = [col for col in time_columns if int(col.split('_')[-1]) <= 3]
    
    # Handle cases where there are fewer than 3 months of data
    if not early_score_columns:
        early_score_columns = score_columns[:3] if score_columns else []
    if not early_time_columns:
        early_time_columns = time_columns[:3] if time_columns else []
    
    # Early average score (first 3 months)
    if early_score_columns:
        df['early_avg_score'] = df[early_score_columns].mean(axis=1, skipna=True)
    else:
        df['early_avg_score'] = 0
    
    # Early average time spent (first 3 months)
    if early_time_columns:
        df['early_avg_time'] = df[early_time_columns].mean(axis=1, skipna=True)
    else:
        df['early_avg_time'] = 0
    
    # Score variance for early months (consistency indicator)
    if len(early_score_columns) > 1:
        df['early_score_variance'] = df[early_score_columns].var(axis=1, skipna=True)
    else:
        df['early_score_variance'] = 0
    
    # Time variance for early months
    if len(early_time_columns) > 1:
        df['early_time_variance'] = df[early_time_columns].var(axis=1, skipna=True)
    else:
        df['early_time_variance'] = 0
    
    # Time-to-score efficiency ratio (early months)
    # Previous implementation divided by early_avg_score with .replace(0,1) which inflates ratio when score is 0.
    # Use 0 when score is 0 to avoid artificial large ratios.
    df['early_time_score_ratio'] = np.where(
        df['early_avg_score'] > 0,
        df['early_avg_time'] / df['early_avg_score'],
        0
    )
    
    # Early engagement rate (proportion of months with activity)
    if early_time_columns:
        df['early_engagement'] = df[early_time_columns].apply(
            lambda x: (x > 0).sum() / len(early_time_columns), axis=1
        )
    else:
        df['early_engagement'] = 0
    
    # Weighted early score (more recent months weighted higher)
    if early_score_columns:
        weights = np.array(range(1, len(early_score_columns) + 1))
        weighted_scores = df[early_score_columns].multiply(weights, axis=1)
        df['weighted_early_score'] = weighted_scores.sum(axis=1) / weights.sum()
    else:
        df['weighted_early_score'] = df['early_avg_score']
    
    # Early trend (slope of scores over first 3 months)
    # Use actual month numbers from column names instead of re-numbering sequentially when months missing.
    df['early_trend'] = 0  # Default value
    if len(early_score_columns) >= 2:
        month_numbers = [int(c.split('_')[-1]) for c in early_score_columns]
        slopes = []
        for _, row in df.iterrows():
            y_vals = []
            x_months = []
            for col, m in zip(early_score_columns, month_numbers):
                val = row[col]
                if not pd.isna(val) and val > 0:
                    y_vals.append(val)
                    x_months.append(m)
            if len(y_vals) >= 2:
                try:
                    slope, _, _, _, _ = stats.linregress(x_months, y_vals)
                    slopes.append(slope)
                except Exception:
                    slopes.append(0)
            else:
                slopes.append(0)
        df['early_trend'] = slopes
    
    # Fill any remaining NaN values
    early_warning_features = [
        'early_avg_score', 'early_avg_time', 'early_score_variance', 
        'early_time_variance', 'early_time_score_ratio', 'early_engagement',
        'weighted_early_score', 'early_trend'
    ]
    
    for feature in early_warning_features:
        if feature in df.columns:
            df[feature] = df[feature].fillna(0)
    
    return df

def predict_at_risk_for_dataset(input_path=None, input_df=None, output_path=None,
                               model_path=None, scaler_path=None, features_path=None):
    """
    Predict at-risk status for students using the trained model.
    
    Parameters:
    -----------
    input_path : str, optional
        Path to the input CSV file containing student data
    input_df : DataFrame, optional
        DataFrame containing student data (alternative to input_path)
    output_path : str, optional
        Path to save the output CSV with predictions
    model_path : str, optional
        Path to the saved model (default: models/at_risk_rf_model.pkl)
    scaler_path : str, optional
        Path to the saved scaler (default: models/scaler.pkl)
    features_path : str, optional
        Path to the saved features list (default: models/features.pkl)
    
    Returns:
    --------
    DataFrame with original data and predictions added
    """
    
    # Set default model paths
    if model_path is None:
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'at_risk_rf_model.pkl')
    if scaler_path is None:
        scaler_path = os.path.join(os.path.dirname(__file__), 'models', 'scaler.pkl')
    if features_path is None:
        features_path = os.path.join(os.path.dirname(__file__), 'models', 'features.pkl')
    
    # Load the data
    if input_df is not None:
        df = input_df.copy()
        print(f"Using provided DataFrame with {df.shape[0]} rows and {df.shape[1]} columns")
    elif input_path is not None:
        try:
            df = pd.read_csv(input_path)
            print(f"Loaded data from {input_path}: {df.shape[0]} rows and {df.shape[1]} columns")
        except Exception as e:
            print(f"Error loading data from {input_path}: {str(e)}")
            return None
    else:
        print("Error: Either input_path or input_df must be provided")
        return None
    
    # Load model components
    try:
        print("Loading model components...")
        model = joblib.load(model_path)  # This is now a Pipeline
        # If pipeline, scaler is inside; still load external scaler for backward compatibility
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
        else:
            scaler = getattr(model, 'named_steps', {}).get('scaler', None)
        model_features = joblib.load(features_path)
        print(f"Model (pipeline) loaded successfully. Requires {len(model_features)} features.")
    except Exception as e:
        print(f"Error loading model components: {str(e)}")
        print(f"Make sure model files exist at:")
        print(f"  - Model: {model_path}")
        print(f"  - Scaler: {scaler_path}")
        print(f"  - Features: {features_path}")
        return None
    
    # Create early warning features if they don't exist
    print("Creating early warning features...")
    df = create_early_warning_features(df)
    
    # Check for missing required features
    missing_features = [col for col in model_features if col not in df.columns]
    if missing_features:
        print(f"Error: Missing required features: {missing_features}")
        print("Available columns in dataset:")
        print(df.columns.tolist())
        return None
    
    # Extract features for prediction
    X = df[model_features].copy()
    
    # Handle missing values
    missing_values = X.isnull().sum()
    if missing_values.sum() > 0:
        print(f"Warning: Found {missing_values.sum()} missing values. Filling with feature means.")
        X = X.fillna(X.mean())
    
    # Decide whether we need external scaling: if pipeline contains scaler we pass raw X; else transform.
    try:
        need_external_scaling = not (hasattr(model, 'named_steps') and 'scaler' in model.named_steps)
        if need_external_scaling and scaler is not None:
            X_for_inference = scaler.transform(X)
        else:
            X_for_inference = X  # Pipeline (with internal scaler) or no scaler required
    except Exception as e:
        print(f"Error preparing features for prediction: {str(e)}")
        return None

    # Make predictions
    print("Making predictions...")
    try:
        # Predict (pipeline handles internal scaling if present)
        predictions = model.predict(X_for_inference)
        proba = model.predict_proba(X_for_inference)

        # Robust class label handling
        if hasattr(model, 'classes_'):
            classes = list(model.classes_)
        elif hasattr(model, 'named_steps') and 'rf' in model.named_steps and hasattr(model.named_steps['rf'], 'classes_'):
            classes = list(model.named_steps['rf'].classes_)
        else:
            raise ValueError("Model does not expose classes_.")

        # Determine which class represents 'At Risk'
        if set(classes) >= {0, 1}:  # numeric labels present
            at_risk_label = 1
            not_at_risk_label = 0
        else:
            lowered = [str(c).lower() for c in classes]
            if 'at risk' in lowered:
                at_risk_label = classes[lowered.index('at risk')]
                # Choose the other class as not at risk
                not_at_risk_label = [c for c in classes if c != at_risk_label][0]
            else:
                # Fallback: assume first class is not at risk, second is at risk
                if len(classes) == 2:
                    not_at_risk_label, at_risk_label = classes[0], classes[1]
                else:
                    raise ValueError(f"Unexpected class labels: {classes}")

        at_risk_index = classes.index(at_risk_label)
        not_at_risk_index = classes.index(not_at_risk_label)
        at_risk_prob = proba[:, at_risk_index]
        not_at_risk_prob = proba[:, not_at_risk_index]
    except Exception as e:
        print(f"Error making predictions: {str(e)}")
        return None

    df['at_risk_prediction'] = predictions
    df['at_risk_probability'] = at_risk_prob
    df['not_at_risk_probability'] = not_at_risk_prob
    # risk_score is explicitly the probability of being at risk
    df['risk_score'] = at_risk_prob
    df['risk_status'] = df['at_risk_prediction'].map({at_risk_label: 'At Risk', not_at_risk_label: 'Not At Risk'})

    # Confidence category based on probability of predicted class (corrected logic)
    predicted_class_prob = np.where(
        df['at_risk_prediction'] == at_risk_label,
        df['at_risk_probability'],
        df['not_at_risk_probability']
    )

    def map_confidence(p):
        if p >= 0.90:
            return 'Very High'
        if p >= 0.75:
            return 'High'
        if p >= 0.60:
            return 'Medium'
        return 'Low'

    df['prediction_confidence'] = [map_confidence(p) for p in predicted_class_prob]
    
    # Generate summary statistics
    at_risk_count = (df['at_risk_prediction'] == at_risk_label).sum()
    not_at_risk_count = (df['at_risk_prediction'] == not_at_risk_label).sum()
    total_count = len(df)
    
    print(f"\n{'='*50}")
    print("PREDICTION SUMMARY")
    print(f"{'='*50}")
    print(f"Total students: {total_count}")
    print(f"Predicted at-risk: {at_risk_count} ({at_risk_count/total_count*100:.1f}%)")
    print(f"Predicted not at-risk: {not_at_risk_count} ({not_at_risk_count/total_count*100:.1f}%)")
    
    # Confidence distribution
    confidence_counts = df['prediction_confidence'].value_counts()
    print(f"\nPrediction confidence distribution:")
    for category, count in confidence_counts.items():
        print(f"  {category}: {count} ({count/total_count*100:.1f}%)")
    
    # Risk level distribution by confidence
    print(f"\nRisk distribution by confidence level:")
    risk_confidence = df.groupby(['risk_status', 'prediction_confidence']).size().unstack(fill_value=0)
    print(risk_confidence)
    
    # Save results if output path is provided
    if output_path is not None:
        try:
            df.to_csv(output_path, index=False)
            print(f"\nPredictions saved to: {output_path}")
        except Exception as e:
            print(f"Error saving predictions: {str(e)}")
    
    return df

def predict_risk_from_raw_data(data_dir=None, output_path=None):
    """
    Complete prediction pipeline: load raw CSV data, process it, and make predictions.
    
    Parameters:
    -----------
    data_dir : str, optional
        Path to directory containing CSV files (default: auto-detect)
    output_path : str, optional
        Path to save predictions (default: auto-generate)
    
    Returns:
    --------
    DataFrame with predictions
    """
    print("Starting complete risk prediction pipeline...")
    
    try:
        # Step 1: Load raw CSV data
        if data_dir:
            load_csv_data(data_dir)
        else:
            load_csv_data()  # Use default path
        
        # Step 2: Create monthly student scores
        print("Creating monthly student scores dataset...")
        monthly_data = create_monthly_student_scores_with_time()
        
        if monthly_data.empty:
            print("Error: No monthly data could be created from CSV files")
            return None
        
        print(f"Created monthly dataset with {len(monthly_data)} records")
        
        # Step 3: Prepare ML features (but don't create target variable for prediction)
        print("Preparing features for prediction...")
        ml_data = prepare_student_data_for_ml(monthly_data)
        
        # Remove target column if it exists (we're predicting, not training)
        if 'at_risk' in ml_data.columns:
            ml_data = ml_data.drop('at_risk', axis=1)
        
        # Step 4: Make predictions
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"risk_predictions_{timestamp}.csv"
        
        predictions_df = predict_at_risk_for_dataset(
            input_df=ml_data,
            output_path=output_path
        )
        
        return predictions_df
        
    except Exception as e:
        print(f"Error in prediction pipeline: {str(e)}")
        return None

def predict_single_student(student_data, model_path=None, scaler_path=None, features_path=None):
    """
    Predict risk for a single student.
    
    Parameters:
    -----------
    student_data : dict or pandas.Series
        Student data with required features
    model_path, scaler_path, features_path : str, optional
        Paths to model components
    
    Returns:
    --------
    dict with prediction results
    """
    # Convert to DataFrame if needed
    if isinstance(student_data, dict):
        df = pd.DataFrame([student_data])
    elif isinstance(student_data, pd.Series):
        df = pd.DataFrame([student_data])
    else:
        df = student_data.copy()
    
    # Make prediction using the main function
    result_df = predict_at_risk_for_dataset(
        input_df=df,
        model_path=model_path,
        scaler_path=scaler_path,
        features_path=features_path
    )
    
    if result_df is not None and len(result_df) > 0:
        result = result_df.iloc[0]
        return {
            'at_risk_prediction': int(result['at_risk_prediction']),
            'at_risk_probability': float(result['at_risk_probability']),
            'not_at_risk_probability': float(result['not_at_risk_probability']),
            'risk_status': result['risk_status'],
            'prediction_confidence': result['prediction_confidence']
        }
    else:
        return None

# Example usage and testing
if __name__ == "__main__":
    print("Starting Risk Prediction System")
    print("="*50)
    
    # Option 1: Predict from raw CSV data (complete pipeline)
    print("\nOption 1: Complete prediction pipeline from raw CSV data")
    predictions = predict_risk_from_raw_data()
    
    if predictions is not None:
        print(f"\nPrediction completed successfully!")
        print(f"Dataset shape: {predictions.shape}")
        
        # Display sample results
        display_cols = [
            'studentId', 'student_name', 'courseId', 'course_name',
            'risk_status', 'at_risk_probability', 'prediction_confidence'
        ]
        available_display_cols = [col for col in display_cols if col in predictions.columns]
        
        print(f"\nSample predictions (first 5 rows):")
        print(predictions[available_display_cols].head())
        
        # Show high-risk students (use risk_status for robustness)
        at_risk_students = predictions[predictions['risk_status'] == 'At Risk']
        if len(at_risk_students) > 0:
            print(f"\nHigh-risk students ({len(at_risk_students)} total):")
            high_risk_display = at_risk_students[available_display_cols].head(10)
            print(high_risk_display.to_string(index=False))
    
    # Option 2: Test with existing processed data
    processed_data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ml_features.csv')
    if os.path.exists(processed_data_path):
        print(f"\n\nOption 2: Predicting from existing processed data")
        processed_predictions = predict_at_risk_for_dataset(
            input_path=processed_data_path,
            output_path="processed_data_predictions.csv"
        )
        
        if processed_predictions is not None:
            print("Predictions from processed data completed successfully!")
    else:
        print(f"\nProcessed data file not found at: {processed_data_path}")
        print("Skipping Option 2.")
    
    print(f"\n{'='*50}")
    print("Risk prediction system testing completed!")
    print(f"{'='*50}")
