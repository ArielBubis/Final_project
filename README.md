#A comprehensive Learning Management System that integrates machine learning-powered risk prediction to help educators identify at-risk students and optimize learning outcomes.

## 🎯 Overview

REVODUCATE is an intelligent educational platform designed to bridge the gap between student performance data and actionable insights for educators. The system combines traditional learning management features with advanced analytics and machine learning to provide predictive insights about student success.VODUCATE - AI-Powered Learning Management System
## Short Description:  
The planned system will integrate with “Revoducate”, a personalized learning platform that tailors learning tracks to students based on their skills and profiles. Currently, the system collects and displays student performance data for teachers (referred to as “Learning Managers”). However, the diverse range of result types makes it difficult for teachers to effectively track progress, analyze data, and optimize learning processes.
To address this challenge, we aim to develop an assistant tool to help teachers track and manage learning progress in their classes. The system will integrate with "Revoducate"' and leverage Machine Learning (ML), Data analytics, and Business Intelligence (BI) techniques. It will analyze and visualize data on the scope of individual students and class levels, providing insights, predictions and recommendations. 
## ✨ Key Features

### 📊 **Smart Analytics Dashboard**
- Real-time student performance monitoring
- Interactive data visualizations using Recharts
- Comprehensive course and assignment analytics
- Individual and class-level progress tracking

### 🤖 **ML-Powered Risk Prediction**
- Identifies at-risk students using advanced machine learning algorithms
- Provides early intervention recommendations
- Compares ML predictions with rule-based assessments
- Generates personalized improvement strategies

## 🏗️ Architecture

### Frontend (React.js)
- **Framework**: React 18 with modern hooks
- **UI Library**: Material-UI (MUI) and Ant Design
- **State Management**: Context API with custom providers
- **Routing**: React Router v6
- **Charts**: Recharts for data visualization
- **Authentication**: Firebase Auth integration

### Backend (Flask)
- **Framework**: Flask with CORS support
- **ML Stack**: scikit-learn, pandas, numpy
- **Data Processing**: Advanced preprocessing pipelines
- **API**: RESTful endpoints for all operations
- **Database**: Firebase Firestore integration

### Machine Learning Pipeline
- **Feature Engineering**: Automated feature extraction
- **Model Training**: Multiple algorithm support
- **Prediction Engine**: Real-time risk assessment
- **Model Persistence**: Joblib-based model serialization

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Firebase project with Firestore enabled
- Trained ML models (see Model Training section below)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ArielBubis/Final_project.git
   cd Final_project
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Model Setup** (Required)
   - Download or train ML models using the [Colab notebook](https://colab.research.google.com/drive/124Tc_TnAGpkGgHMw82S7wwZzxbUOz0EJ#scrollTo=LBQVSQtVihnw)
   - Place the following files in `backend/models/`:
     - `student_risk_model.pkl`
     - `scaler.pkl`
     - `features.pkl`
     - `feature_importances.csv`

5. **Firebase Configuration**
   - Add your `serviceAccountKey.json` to the project root
   - Update `frontend/src/firebaseConfig.js` with your Firebase config

6. **Data Setup**
   - Place CSV data files in the `/data` directory
   - Import data to Firestore using:
   ```bash
   node scripts/importCsvToFireBase.js
   ```

### Running the Application

1. **Start Backend Services**
   ```bash
   # Option 1: Use the batch script
   start_services.bat
   
   # Option 2: Manual start
   cd backend/api
   python app.py
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## 📁 Project Structure

```
Final_project/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Main application pages
│   │   ├── contexts/        # React contexts for state management
│   │   ├── services/        # API and external service integrations
│   │   ├── hooks/           # Custom React hooks
│   │   └── styles/          # CSS modules and styling
│   └── public/              # Static assets
├── backend/                  # Flask backend API
│   ├── api/                 # Main API application
│   ├── ml/                  # Machine learning modules
│   ├── models/              # Trained ML models and artifacts
│   ├── firebase/            # Firebase integration services
│   └── utils/               # Utility functions
├── data/                     # CSV data files (must match Firestore structure)
├── scripts/                  # Automation and utility scripts
│   └── importCsvToFireBase.js # Data import script for Firestore
└── docs/                     # Documentation files
```

## � Data Management

### Data Structure
All data must be stored as CSV files in the `/data` directory and maintain the same structure as the Firestore collections:
- `students.csv` - Student information and profiles
- `courses.csv` - Course details and metadata
- `assignments.csv` - Assignment data and specifications
- `studentAssignments.csv` - Student assignment submissions and grades
- `teachers.csv` - Teacher information
- `schools.csv` - School data
- And other related CSV files matching the database schema

### Data Pipeline
The student data is synthesized using a sophisticated simulation pipeline:
- **Data Synthesis Repository**: [Student Data Simulation Pipeline](https://github.com/ArielBubis/simulating_student_data)
- **Purpose**: Generates realistic educational data patterns for ML training and testing
- **Output**: CSV files that mirror real student behavior and academic performance

### Data Import Process
1. Place CSV files in the `/data` directory
2. Ensure CSV structure matches Firestore schema (see `database_schema.md`)
3. Run the import script:
   ```bash
   node scripts/importCsvToFireBase.js
   ```
4. Verify data import in Firebase Console


## 📊 Machine Learning Features

### Risk Prediction Model
The system uses a trained machine learning model to predict student risk levels based on:
- Assignment completion rates
- Grade trends and patterns
- Engagement metrics
- Time-to-completion analysis
- Peer comparison statistics

### Model Files (Required in `backend/models/`)
- `student_risk_model.pkl`: Trained classification model
- `scaler.pkl`: Feature scaling parameters
- `features.pkl`: Feature definitions and metadata
- `feature_importances.csv`: Model interpretability data

**Note**: All ML models must be placed in the `backend/models/` directory for the system to function properly.

### Model Training
The machine learning models are trained using Google Colab with comprehensive data analysis:
- **Training Notebook**: [ML Model Training Colab](https://colab.research.google.com/drive/124Tc_TnAGpkGgHMw82S7wwZzxbUOz0EJ#scrollTo=LBQVSQtVihnw)
- **Data Pipeline**: Models are trained on synthesized student data that mirrors real educational patterns

## 🎯 Use Cases

### For Teachers
- **Early Warning System**: Identify struggling students before it's too late
- **Intervention Planning**: Get data-driven recommendations for student support
- **Class Analytics**: Monitor overall class performance and engagement
- **Resource Allocation**: Optimize teaching resources based on predictive insights

## 🔒 Security & Privacy

- Firebase Authentication for secure user management
- Role-based access control for data protection
- HTTPS encryption for all communications
- GDPR-compliant data handling practices
- Regular security audits and updates

## 📈 Performance Metrics

The system tracks various performance indicators:
- **Prediction Accuracy**: ML model performance metrics
- **Response Time**: API endpoint performance
- **User Engagement**: Platform usage statistics
- **Educational Outcomes**: Student success rate improvements

## 🛠️ Development Tools

- **Version Control**: Git with GitHub
- **IDE Support**: VS Code optimized
- **Testing**: Jest for frontend, pytest for backend
- **CI/CD**: GitHub Actions integration
- **Monitoring**: Built-in performance monitoring

## 🔧 Troubleshooting

### Common Issues

**Backend fails to start with model errors:**
- Ensure all required model files are in `backend/models/`
- Check that model files were generated using the correct training pipeline
- Verify model file permissions and accessibility

**Data import fails:**
- Verify CSV files are in the correct `/data` directory
- Check that CSV structure matches the Firestore schema
- Ensure Firebase credentials are properly configured

**Frontend connection issues:**
- Confirm backend is running on the correct port (5000)
- Check CORS configuration in Flask app
- Verify Firebase configuration in the frontend

### Getting Help
1. Check the training notebook for model generation issues
2. Review the [data synthesis repository](https://github.com/ArielBubis/simulating_student_data) for data-related problems
3. Verify all CSV files match the expected schema in `database_schema.md`

## 📝 License

This project is developed for educational purposes as part of a university program.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Powered by Firebase for real-time data management
- Enhanced with machine learning for predictive analytics
- Designed with accessibility and user experience in mind

---

**Note**: This system is designed to augment, not replace, traditional teaching methods. All predictions and recommendations should be considered alongside professional educational judgment.


