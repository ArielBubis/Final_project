"""
Train the risk prediction model using the preprocessed data
"""
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from pre_processing import create_risk_prediction_dataset, load_csv_data

def train_risk_model():
    """
    Train a risk prediction model and save it for use in the API
    """
    print("Loading and preparing data...")
    
    # Load data
    load_csv_data()
    
    # Create ML dataset
    features_df, target_series, feature_names = create_risk_prediction_dataset()
    
    if features_df is None:
        print("Error: Could not create dataset")
        return False
    
    print(f"Training with {len(feature_names)} features and {len(features_df)} samples")
    
    # Separate features from ID columns
    id_cols = ['studentId', 'courseId']
    X = features_df.drop(columns=id_cols)
    y = target_series
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced'
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    print("\n" + "="*50)
    print("MODEL EVALUATION")
    print("="*50)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='roc_auc')
    print(f"Cross-validation AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    # Test set evaluation
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    print(f"Test AUC: {roc_auc_score(y_test, y_pred_proba):.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Most Important Features:")
    print(feature_importance.head(10))
    
    # Save model and artifacts
    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    # Save model
    model_path = os.path.join(model_dir, 'at_risk_rf_model.pkl')
    joblib.dump(model, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save scaler
    scaler_path = os.path.join(model_dir, 'scaler.pkl')
    joblib.dump(scaler, scaler_path)
    print(f"Scaler saved to: {scaler_path}")
    
    # Save feature names
    features_path = os.path.join(model_dir, 'features.pkl')
    joblib.dump(list(X.columns), features_path)
    print(f"Feature names saved to: {features_path}")
    
    # Save feature importance
    importance_path = os.path.join(model_dir, 'feature_importance.csv')
    feature_importance.to_csv(importance_path, index=False)
    print(f"Feature importance saved to: {importance_path}")
    
    print("\n" + "="*50)
    print("MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("="*50)
    
    return True

if __name__ == "__main__":
    success = train_risk_model()
    if success:
        print("\nModel training completed successfully!")
        print("You can now use the trained model in your Flask API.")
    else:
        print("\nModel training failed. Please check the errors above.")
