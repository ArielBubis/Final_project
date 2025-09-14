# Risk Prediction Backend Startup Script
# This script starts the risk prediction backend service

# Import required modules
import os
import sys
import subprocess
import time
import webbrowser
import json
import threading

def print_colored(text, color="green"):
    """Print colored text in the terminal"""
    colors = {
        "green": "\033[92m",
        "yellow": "\033[93m",
        "red": "\033[91m",
        "blue": "\033[94m",
        "purple": "\033[95m",
        "end": "\033[0m"
    }
    print(f"{colors.get(color, '')}{text}{colors['end']}")

def check_requirements():
    """Check if all required packages are installed"""
    try:
        import flask
        import flask_cors
        import pandas
        import numpy
        import joblib
        print_colored("✅ All required packages are installed", "green")
        return True
    except ImportError as e:
        print_colored(f"❌ Missing package: {str(e)}", "red")
        print_colored("Installing required packages...", "yellow")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
            print_colored("✅ Successfully installed required packages", "green")
            return True
        except Exception as e:
            print_colored(f"❌ Failed to install packages: {str(e)}", "red")
            return False

def check_model_files():
    """Check if required model files exist"""
    required_files = [
        "models/at_risk_model.joblib", 
        "models/feature_names.json"
    ]
    
    for file in required_files:
        if not os.path.exists(file):
            print_colored(f"❌ Missing required file: {file}", "red")
            return False
    
    print_colored("✅ All required model files found", "green")
    return True

def load_feature_names():
    """Load and display model features"""
    try:
        with open("models/feature_names.json", "r") as f:
            features = json.load(f)
        print_colored(f"📊 Model uses {len(features)} features:", "blue")
        for i, feature in enumerate(features):
            if i < 5:  # Only show first 5 features
                print(f"  - {feature}")
        if len(features) > 5:
            print(f"  - ... and {len(features) - 5} more")
        return features
    except Exception as e:
        print_colored(f"❌ Error loading feature names: {str(e)}", "red")
        return []

def run_flask_server():
    """Run the Flask API server"""
    try:
        print_colored("🚀 Starting Flask server...", "green")
        # Run Flask app in a new process to avoid blocking
        server_process = subprocess.Popen(
            [sys.executable, "app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Wait for server to start
        time.sleep(2)
        
        if server_process.poll() is not None:
            # Process has terminated
            output, _ = server_process.communicate()
            print_colored(f"❌ Server failed to start: {output}", "red")
            return None
        
        print_colored("✅ Flask server running on http://localhost:5000", "green")
        return server_process
    except Exception as e:
        print_colored(f"❌ Error starting Flask server: {str(e)}", "red")
        return None

def test_api():
    """Test the API with sample data"""
    import requests
    import json
    
    try:
        print_colored("🔍 Testing API with sample data...", "blue")
        
        with open("models/sample_input.json", "r") as f:
            sample_data = json.load(f)
        
        response = requests.post("http://localhost:5000/api/predict", json=sample_data)
        
        if response.status_code == 200:
            result = response.json()
            print_colored("✅ API test successful!", "green")
            print_colored("📌 Sample prediction result:", "blue")
            print(f"  - Risk Score: {result.get('risk_score')}")
            print(f"  - Is At Risk: {result.get('is_at_risk')}")
            print(f"  - Risk Level: {result.get('intervention', {}).get('risk_level')}")
            return True
        else:
            print_colored(f"❌ API test failed with status code: {response.status_code}", "red")
            return False
    except Exception as e:
        print_colored(f"❌ API test error: {str(e)}", "red")
        return False

def show_instructions():
    """Show instructions for connecting the frontend"""
    print_colored("\n📋 Next Steps:", "purple")
    print_colored("1. Make sure your frontend is running", "blue")
    print_colored("2. Navigate to the dashboard in your browser", "blue")
    print_colored("3. Check the 'ML Risk Analysis' tab to see ML-powered predictions", "blue")
    print_colored("\n📢 Important Notes:", "purple")
    print_colored("- The ML risk model needs proper student data to make accurate predictions", "yellow")
    print_colored("- Check the browser console for API communication logs", "yellow")
    print_colored("- Keep this terminal window open to keep the backend server running", "yellow")
    print_colored("- Press Ctrl+C to stop the server when done", "yellow")

def monitor_server(server_process):
    """Monitor server process and print output"""
    while server_process.poll() is None:
        line = server_process.stdout.readline()
        if line:
            print(line.strip())

if __name__ == "__main__":
    print_colored("\n🤖 ML Risk Prediction Backend Startup", "purple")
    print_colored("===================================", "purple")
    
    # Switch to backend directory if not already there
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(os.getcwd()) != 'backend':
        os.chdir(script_dir)
    
    if not check_requirements():
        sys.exit(1)
        
    if not check_model_files():
        sys.exit(1)
    
    features = load_feature_names()
    
    server_process = run_flask_server()
    if not server_process:
        sys.exit(1)
    
    # Start monitoring thread
    monitor_thread = threading.Thread(target=monitor_server, args=(server_process,))
    monitor_thread.daemon = True
    monitor_thread.start()
    
    # Test API after a short delay
    time.sleep(3)
    api_working = test_api()
    
    if api_working:
        show_instructions()
        
    try:
        # Keep script running until keyboard interrupt
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print_colored("\n⏹️ Stopping server...", "yellow")
        server_process.terminate()
        print_colored("✅ Server stopped", "green")
