@echo off
REM Start both frontend and backend services

echo ===================================================
echo    Student Dashboard with ML Risk Prediction
echo ===================================================
echo.

echo Starting backend and frontend services...
echo --------------------------------------------

REM Start ML risk prediction backend service in a new terminal
start powershell -NoExit -Command "cd 'e:\Libraries\My Documents\University\Year 4\FinalProject\website\Final_project\backend' && python start_risk_backend.py"

REM Wait a moment for backend to initialize
timeout /t 5

REM Start frontend service in a new terminal
start powershell -NoExit -Command "cd 'e:\Libraries\My Documents\University\Year 4\FinalProject\website\Final_project\frontend' && npm start"

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
