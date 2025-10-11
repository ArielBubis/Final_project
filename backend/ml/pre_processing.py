import pandas as pd
import numpy as np
import os
import json
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score, roc_auc_score, classification_report
from datetime import datetime

# Global variables to store dataframes
assignments_df = None
students_assignments_df = None
students_df = None
courses_df = None
students_courses_df = None
modules_df = None

def load_csv_data(data_dir=None):
    """
    Load all CSV files into global dataframes
    
    Args:
        data_dir: Path to the data directory. If None, uses default path
    
    Returns:
        dict: Dictionary containing all loaded dataframes
    """
    global assignments_df, students_assignments_df, students_df, courses_df, students_courses_df, modules_df
    
    if data_dir is None:
        # Default path relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up two levels: backend/ml -> backend -> project_root
        project_root = os.path.dirname(os.path.dirname(current_dir))
        data_dir = os.path.join(project_root, 'data')
    
    try:
        # Load all CSV files
        assignments_df = pd.read_csv(os.path.join(data_dir, 'assignments.csv'))
        students_assignments_df = pd.read_csv(os.path.join(data_dir, 'studentAssignments.csv'))
        students_df = pd.read_csv(os.path.join(data_dir, 'students.csv'))
        courses_df = pd.read_csv(os.path.join(data_dir, 'courses.csv'))
        students_courses_df = pd.read_csv(os.path.join(data_dir, 'studentCourses.csv'))
        modules_df = pd.read_csv(os.path.join(data_dir, 'modules.csv'))
        
        print(f"Successfully loaded CSV data from {data_dir}")
        print(f"Assignments: {len(assignments_df)} rows")
        print(f"Student Assignments: {len(students_assignments_df)} rows")
        print(f"Students: {len(students_df)} rows")
        print(f"Courses: {len(courses_df)} rows")
        print(f"Student Courses: {len(students_courses_df)} rows")
        print(f"Modules: {len(modules_df)} rows")
        
        return {
            'assignments': assignments_df,
            'student_assignments': students_assignments_df,
            'students': students_df,
            'courses': courses_df,
            'student_courses': students_courses_df,
            'modules': modules_df
        }
    
    except FileNotFoundError as e:
        print(f"Error loading CSV files: {e}")
        print(f"Make sure CSV files exist in: {data_dir}")
        return None
    except Exception as e:
        print(f"Unexpected error loading CSV files: {e}")
        return None

def parse_json_columns(df, json_columns):
    """
    Parse JSON string columns into proper data structures
    
    Args:
        df: DataFrame containing JSON columns
        json_columns: List of column names that contain JSON strings
    
    Returns:
        DataFrame with parsed JSON columns
    """
    df_copy = df.copy()
    
    for col in json_columns:
        if col in df_copy.columns:
            try:
                # Handle string representations of lists/dicts
                df_copy[col] = df_copy[col].apply(lambda x: json.loads(x) if isinstance(x, str) else x)
            except:
                print(f"Warning: Could not parse JSON in column {col}")
    
    return df_copy

def create_monthly_student_scores_with_time():
    """
    Create monthly student scores with time spent using the actual CSV data structure.
    This function processes student assignment submissions to create cumulative scores
    and monthly time spent data for machine learning.
    
    Returns:
        DataFrame with student progress data organized by month
    """
    global assignments_df, students_assignments_df, students_df, courses_df, students_courses_df
    
    # Load data if not already loaded
    if any(df is None for df in [assignments_df, students_assignments_df, students_df, courses_df, students_courses_df]):
        print("Loading CSV data...")
        load_csv_data()
    
    if any(df is None for df in [assignments_df, students_assignments_df, students_df, courses_df, students_courses_df]):
        raise ValueError("Failed to load required CSV data")
    
    # Step 1: Prepare student assignments data
    student_assignments = students_assignments_df.copy()
    
    # Convert dates and handle missing submission dates
    student_assignments['submissionDate'] = pd.to_datetime(student_assignments['submissionDate'])
    
    # Filter out rows without submission dates (these are incomplete/future assignments)
    student_assignments = student_assignments.dropna(subset=['submissionDate'])
    
    # Create month_year for grouping
    student_assignments['month_year'] = student_assignments['submissionDate'].dt.strftime('%Y-%m')
      # Step 2: Add student information
    student_info = students_df[['id', 'name', 'gradeLevel']].rename(columns={'id': 'studentId', 'name': 'student_name'})
    student_assignments = pd.merge(
        student_assignments,
        student_info,
        on='studentId',
        how='left'
    )
    
    # Step 3: Add course information
    course_info = courses_df[['id', 'name', 'startDate', 'endDate']].rename(
        columns={'id': 'courseId', 'name': 'course_name'}
    )
    course_info['startDate'] = pd.to_datetime(course_info['startDate'])
    course_info['endDate'] = pd.to_datetime(course_info['endDate'])
    
    student_assignments = pd.merge(
        student_assignments,
        course_info,
        on='courseId',
        how='left'
    )
    
    # Step 4: Filter assignments within course period
    student_assignments['month_year_date'] = pd.to_datetime(student_assignments['month_year'] + '-01')
    
    # Keep only submissions within course duration
    active_assignments = student_assignments[
        (student_assignments['month_year_date'] >= student_assignments['startDate']) &
        (student_assignments['month_year_date'] <= student_assignments['endDate'])
    ].copy()
    
    # Step 5: Sort chronologically for cumulative calculations
    active_assignments = active_assignments.sort_values(
        by=['studentId', 'courseId', 'submissionDate']
    )
      # Step 6: Calculate cumulative metrics and late submission rates
    cumulative_data = []
    
    # Process each student-course combination
    for (student_id, course_id), group in active_assignments.groupby(['studentId', 'courseId']):
        # Get metadata from first row
        student_name = group['student_name'].iloc[0]
        course_name = group['course_name'].iloc[0]
        grade_level = group['gradeLevel'].iloc[0] if 'gradeLevel' in group.columns else 12
        
        # Calculate late submission rate for this student-course combination
        total_submissions = len(group)
        late_submissions = group['isLate'].sum() if 'isLate' in group.columns else 0
        late_submission_rate = late_submissions / total_submissions if total_submissions > 0 else 0
        
        # Initialize running totals
        total_score = 0
        total_time = 0
        total_assignments = 0
        
        # Track monthly aggregations
        monthly_stats = {}
        
        # Process each assignment chronologically
        for _, row in group.iterrows():
            month_year = row['month_year']
            score = row['assessmentScore'] if not pd.isna(row['assessmentScore']) else 0
            time_spent = row['timeSpentMinutes'] if not pd.isna(row['timeSpentMinutes']) else 0
            
            # Update running totals
            total_score += score
            total_time += time_spent
            total_assignments += 1
            
            # Calculate cumulative average score
            cumulative_avg_score = total_score / total_assignments
            
            # Initialize monthly stats if not exists
            if month_year not in monthly_stats:
                monthly_stats[month_year] = {
                    'cumulative_score': 0,
                    'monthly_time': 0,
                    'monthly_assignments': 0
                }
            
            # Update monthly stats (keep latest cumulative score for the month)
            monthly_stats[month_year]['cumulative_score'] = cumulative_avg_score
            monthly_stats[month_year]['monthly_time'] += time_spent
            monthly_stats[month_year]['monthly_assignments'] += 1
        
        # Create records for each month
        for month, stats in monthly_stats.items():
            cumulative_data.append({
                'studentId': student_id,
                'student_name': student_name,
                'courseId': course_id,
                'course_name': course_name,
                'gradeLevel': grade_level,
                'late_submission_rate': late_submission_rate,
                'month_year': month,
                'cumulative_score': stats['cumulative_score'],
                'monthly_time_spent': stats['monthly_time'],
                'monthly_assignments': stats['monthly_assignments']
            })
    
    # Convert to DataFrame
    if not cumulative_data:
        print("Warning: No valid assignment data found for processing")
        return pd.DataFrame()
    
    cumulative_df = pd.DataFrame(cumulative_data)
      # Step 7: Create pivot tables
    # Pivot for cumulative scores
    pivot_scores = cumulative_df.pivot_table(
        index=['studentId', 'student_name', 'courseId', 'course_name', 'gradeLevel', 'late_submission_rate'],
        columns='month_year',
        values='cumulative_score',
        fill_value=0
    )
    
    # Pivot for monthly time spent
    pivot_time = cumulative_df.pivot_table(
        index=['studentId', 'student_name', 'courseId', 'course_name', 'gradeLevel', 'late_submission_rate'],
        columns='month_year',
        values='monthly_time_spent',
        fill_value=0
    )
    
    # Step 8: Rename columns to sequential format
    # Sort columns chronologically
    score_cols = sorted(pivot_scores.columns)
    time_cols = sorted(pivot_time.columns)
    
    # Create sequential naming
    score_mapping = {score_cols[i]: f'Score_Month_{i+1}' for i in range(len(score_cols))}
    time_mapping = {time_cols[i]: f'TimeSpent_Month_{i+1}' for i in range(len(time_cols))}
    
    pivot_scores = pivot_scores.rename(columns=score_mapping)
    pivot_time = pivot_time.rename(columns=time_mapping)
      # Step 9: Merge pivots
    result_df = pd.merge(
        pivot_scores.reset_index(),
        pivot_time.reset_index(),
        on=['studentId', 'student_name', 'courseId', 'course_name', 'gradeLevel', 'late_submission_rate'],
        how='outer'
    )
    
    # Step 10: Add final scores from student_courses
    final_scores = students_courses_df[['studentId', 'courseId', 'finalScore', 'totalTimeSpentMinutes']].copy()
    final_scores['finalScore'] = final_scores['finalScore'].fillna(0)
    final_scores['totalTimeSpentMinutes'] = final_scores['totalTimeSpentMinutes'].fillna(0)
    
    result_df = pd.merge(
        result_df,
        final_scores,
        on=['studentId', 'courseId'],
        how='left'
    )
    
    # Step 11: Add course metadata
    course_metadata = courses_df[['id', 'startDate', 'endDate']].rename(columns={'id': 'courseId'})
    course_metadata['startDate'] = pd.to_datetime(course_metadata['startDate']).dt.strftime('%Y-%m-%d')
    course_metadata['endDate'] = pd.to_datetime(course_metadata['endDate']).dt.strftime('%Y-%m-%d')
    
    result_df = pd.merge(
        result_df,
        course_metadata,
        on='courseId',
        how='left'
    )
      # Step 12: Organize columns
    info_cols = ['studentId', 'student_name', 'courseId', 'course_name', 'gradeLevel', 'late_submission_rate', 'startDate', 'endDate']
    score_month_cols = [col for col in result_df.columns if col.startswith('Score_Month_')]
    time_month_cols = [col for col in result_df.columns if col.startswith('TimeSpent_Month_')]
    final_cols = ['finalScore', 'totalTimeSpentMinutes']
      # Ensure all columns exist
    all_cols = info_cols + sorted(score_month_cols) + sorted(time_month_cols) + final_cols
    existing_cols = [col for col in all_cols if col in result_df.columns]
    
    result_df = result_df[existing_cols]
    
    return result_df

def prepare_student_data_for_ml(df):
    """
    Prepare the student data for machine learning by engineering features
    that capture student progression.

    Args:
        df: DataFrame with student progression data

    Returns:
        Processed DataFrame ready for machine learning
    """
    # Make a copy to avoid modifying the original
    data = df.copy()
    
    # Handle empty dataframe
    if data.empty:
        print("Warning: Empty dataframe provided to prepare_student_data_for_ml")
        return data

    # 1. Convert dates to usable features (course duration in days)
    data['startDate'] = pd.to_datetime(data['startDate'])
    data['endDate'] = pd.to_datetime(data['endDate'])
    data['course_duration_days'] = (data['endDate'] - data['startDate']).dt.days

    # 2. Engineer features that capture progression patterns
    # Get score and time columns
    score_cols = [col for col in data.columns if col.startswith('Score_Month_')]
    time_cols = [col for col in data.columns if col.startswith('TimeSpent_Month_')]
    
    # Sort columns by month number
    score_cols = sorted(score_cols, key=lambda x: int(x.split('_')[-1]))
    time_cols = sorted(time_cols, key=lambda x: int(x.split('_')[-1]))

    # Calculate score progression (differences between consecutive months)
    for i in range(1, len(score_cols)):
        curr_col = score_cols[i]
        prev_col = score_cols[i-1]
        data[f'score_change_month_{i+1}'] = data[curr_col] - data[prev_col]

    # Calculate time spent progression
    for i in range(1, len(time_cols)):
        curr_col = time_cols[i]
        prev_col = time_cols[i-1]
        data[f'time_change_month_{i+1}'] = data[curr_col] - data[prev_col]

    # 3. Calculate variance in scores and time spent (consistency metrics)
    if len(score_cols) > 1:
        data['score_variance'] = data[score_cols].var(axis=1, skipna=True)
        data['score_std'] = data[score_cols].std(axis=1, skipna=True)
    else:
        data['score_variance'] = 0
        data['score_std'] = 0
        
    if len(time_cols) > 1:
        data['time_variance'] = data[time_cols].var(axis=1, skipna=True)
        data['time_std'] = data[time_cols].std(axis=1, skipna=True)
    else:
        data['time_variance'] = 0
        data['time_std'] = 0

    # 4. Calculate engagement metrics
    data['avg_monthly_score'] = data[score_cols].mean(axis=1, skipna=True)
    data['avg_monthly_time'] = data[time_cols].mean(axis=1, skipna=True)
    data['total_active_months'] = (data[score_cols] > 0).sum(axis=1)
    data['max_monthly_score'] = data[score_cols].max(axis=1, skipna=True)
    data['min_monthly_score'] = data[score_cols].min(axis=1, skipna=True)

    # 5. Calculate efficiency metric (score per time spent)
    # Avoid division by zero
    total_time_safe = data['totalTimeSpentMinutes'].replace(0, 1)
    data['score_per_minute'] = data['finalScore'] / total_time_safe
    
    # Monthly efficiency (average monthly score per average monthly time)
    avg_time_safe = data['avg_monthly_time'].replace(0, 1)
    data['monthly_score_per_minute'] = data['avg_monthly_score'] / avg_time_safe

    # 6. Create engagement pattern features
    # Early vs late engagement (first third vs last third of months)
    num_months = len(score_cols)
    if num_months >= 3:
        early_months = score_cols[:num_months//3] if num_months//3 > 0 else score_cols[:1]
        late_months = score_cols[-num_months//3:] if num_months//3 > 0 else score_cols[-1:]
        
        data['early_avg_score'] = data[early_months].mean(axis=1, skipna=True)
        data['late_avg_score'] = data[late_months].mean(axis=1, skipna=True)
        data['score_improvement'] = data['late_avg_score'] - data['early_avg_score']
        
        early_time_months = time_cols[:num_months//3] if num_months//3 > 0 else time_cols[:1]
        late_time_months = time_cols[-num_months//3:] if num_months//3 > 0 else time_cols[-1:]
        
        data['early_avg_time'] = data[early_time_months].mean(axis=1, skipna=True)
        data['late_avg_time'] = data[late_time_months].mean(axis=1, skipna=True)
        data['time_trend'] = data['late_avg_time'] - data['early_avg_time']
    else:
        data['early_avg_score'] = data[score_cols].mean(axis=1, skipna=True) if score_cols else 0
        data['late_avg_score'] = data[score_cols].mean(axis=1, skipna=True) if score_cols else 0
        data['score_improvement'] = 0
        data['early_avg_time'] = data[time_cols].mean(axis=1, skipna=True) if time_cols else 0
        data['late_avg_time'] = data[time_cols].mean(axis=1, skipna=True) if time_cols else 0
        data['time_trend'] = 0

    # 7. Risk indicators
    # Students with declining scores
    data['declining_performance'] = (data['score_improvement'] < -5).astype(int)
    
    # Students with very low engagement
    data['low_engagement'] = (data['avg_monthly_time'] < data['avg_monthly_time'].quantile(0.25)).astype(int)
    
    # Students with inconsistent performance
    data['inconsistent_performance'] = (data['score_std'] > data['score_std'].quantile(0.75)).astype(int)

    # 8. Create risk score (composite metric)
    # Normalize components to 0-1 scale
    score_component = 1 - (data['avg_monthly_score'] / 100)  # Lower scores = higher risk
    time_component = 1 - (data['avg_monthly_time'] / data['avg_monthly_time'].max())  # Lower time = higher risk
    consistency_component = data['score_std'] / 100  # Higher variance = higher risk
    
    # Combined risk score (0-1, higher = more at risk)
    data['risk_score'] = (score_component * 0.5 + time_component * 0.3 + consistency_component * 0.2)
    
    # Binary risk classification (at risk if in top 30% of risk scores)
    risk_threshold = data['risk_score'].quantile(0.7)
    data['at_risk'] = (data['risk_score'] >= risk_threshold).astype(int)

    # 9. Fill missing values
    # Fill numeric columns with 0
    numeric_cols = data.select_dtypes(include=[np.number]).columns
    data[numeric_cols] = data[numeric_cols].fillna(0)
    
    # 10. Drop non-ML columns
    columns_to_drop = ['startDate', 'endDate', 'student_name', 'course_name']
    columns_to_drop = [col for col in columns_to_drop if col in data.columns]
    data.drop(columns_to_drop, axis=1, inplace=True)

    return data

def create_risk_prediction_dataset():
    """
    Create a complete dataset for risk prediction model training
    
    Returns:
        Tuple of (features_df, target_series, feature_names)
    """
    # Load and prepare the data
    print("Creating monthly student scores dataset...")
    monthly_data = create_monthly_student_scores_with_time()
    
    if monthly_data.empty:
        print("Error: No monthly data available")
        return None, None, None
    
    print(f"Processing {len(monthly_data)} student-course records...")
    
    # Prepare ML features
    ml_data = prepare_student_data_for_ml(monthly_data)
    
    # Separate features and target
    target_col = 'at_risk'
    if target_col not in ml_data.columns:
        print(f"Error: Target column '{target_col}' not found")
        return None, None, None
    
    # Get feature columns (exclude ID columns and target)
    id_cols = ['studentId', 'courseId']
    feature_cols = [col for col in ml_data.columns if col not in id_cols + [target_col]]
    # Remove known leakage / target-construction components (risk_score and its direct components)
    leakage_cols = {'risk_score', 'avg_monthly_score', 'avg_monthly_time', 'score_std'}
    feature_cols = [c for c in feature_cols if c not in leakage_cols]
    
    features_df = ml_data[id_cols + feature_cols]
    target_series = ml_data[target_col]
    
    print(f"Created dataset with {len(feature_cols)} features and {len(ml_data)} samples")
    print(f"At-risk ratio: {target_series.mean():.2%}")
    
    return features_df, target_series, feature_cols

# Initialize the data loading when the module is imported
print("Initializing preprocessing module...")
try:
    # Load data automatically
    load_csv_data()
    print("CSV data loaded successfully!")
except Exception as e:
    print(f"Warning: Could not auto-load CSV data: {e}")
    print("You can manually load data using load_csv_data(data_dir='path/to/csv')")

# Create the main dataset when this script is run directly
if __name__ == "__main__":
    print("\n" + "="*50)
    print("CREATING MONTHLY STUDENT SCORES DATASET")
    print("="*50)
    
    # Create the monthly student scores DataFrame with time spent
    monthly_stats_df = create_monthly_student_scores_with_time()

    if not monthly_stats_df.empty:
        # Display the first few rows to verify
        print("Monthly Student Scores (Cumulative) and Time Spent DataFrame (First 5 rows):")
        print(monthly_stats_df.head())

        # Display summary statistics for scores
        print("\nSummary Statistics for Cumulative Scores:")
        score_cols = [col for col in monthly_stats_df.columns if col.startswith('Score_Month')]
        if score_cols:
            print(monthly_stats_df[score_cols].describe())

        print("\nSummary Statistics for Monthly Time Spent:")
        time_cols = [col for col in monthly_stats_df.columns if col.startswith('TimeSpent_Month')]
        if time_cols:
            print(monthly_stats_df[time_cols].describe())

        # Display column names to verify the transformation
        print(f"\nDataset shape: {monthly_stats_df.shape}")
        print("Column Names:")
        print(monthly_stats_df.columns.tolist())
        
        print("\n" + "="*50)
        print("CREATING ML-READY DATASET")
        print("="*50)
        
        # Create ML dataset
        features_df, target_series, feature_names = create_risk_prediction_dataset()
        
        if features_df is not None:
            print(f"\nML Dataset created successfully!")
            print(f"Features shape: {features_df.shape}")
            print(f"Target distribution:")
            print(target_series.value_counts())
            
            # Optional: Save to CSV
            try:
                output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
                os.makedirs(output_dir, exist_ok=True)
                
                monthly_stats_df.to_csv(os.path.join(output_dir, 'monthly_student_scores.csv'), index=False)
                features_df.to_csv(os.path.join(output_dir, 'ml_features.csv'), index=False)
                
                print(f"\nDatasets saved to {output_dir}")
            except Exception as e:
                print(f"Could not save datasets: {e}")
    else:
        print("No data could be processed. Please check your CSV files.")