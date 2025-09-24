@echo off
REM Start both frontend and backend services with automatic dependency management

echo ===================================================
echo    Student Dashboard with ML Risk Prediction
echo ===================================================
echo.

echo Setting up Python environment...
echo --------------------------------------------

REM Get the directory of this script
set SCRIPT_DIR=%~dp0

REM Navigate to backend directory (relative)
cd /d "%SCRIPT_DIR%backend"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment!
        echo Make sure Python is installed and in PATH.
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if requirements.txt exists, create if not
if not exist "requirements.txt" (
    echo Creating requirements.txt...
    echo flask==2.3.3> requirements.txt
    echo flask-cors==4.0.0>> requirements.txt
    echo joblib==1.3.2>> requirements.txt
    echo numpy==1.24.3>> requirements.txt
    echo pandas==2.0.3>> requirements.txt
    echo scikit-learn==1.3.0>> requirements.txt
    echo scipy==1.11.1>> requirements.txt
)

REM Install/upgrade dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo Python environment ready!
echo.

echo Starting backend and frontend services...
echo --------------------------------------------



REM Start ML risk prediction backend service in a new terminal with venv activated
start powershell -NoExit -Command "cd '%SCRIPT_DIR%backend'; .\venv\Scripts\Activate.ps1; py ./api/app.py"

REM Wait a moment for backend to initialize
timeout /t 5



REM Install frontend dependencies and start frontend service in a new terminal
start powershell -NoExit -Command "cd '%SCRIPT_DIR%frontend'; npm install; npm start"

echo.
echo Both services should be starting...
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo ===================================================
echo Once the frontend loads, go to the "ML Risk Analysis" tab
echo to see students identified as at-risk by the ML model.
echo ===================================================
echo.
echo Virtual environment location: backend\venv
echo To manually activate: backend\venv\Scripts\activate.bat
echo ===================================================
