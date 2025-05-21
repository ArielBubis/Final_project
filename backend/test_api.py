import json
import requests
import os

def test_risk_prediction_api():
    """
    Tests the risk prediction API by sending a sample request
    """
    # API endpoint
    url = "http://localhost:5000/api/predict"
    
    # Load sample input data from file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sample_file_path = os.path.join(script_dir, 'models', 'sample_input.json')
    
    print(f"Loading sample data from {sample_file_path}")
    
    with open(sample_file_path, 'r') as f:
        sample_input = json.load(f)
    
    print("Sending API request...")
    
    # Send request to API
    try:
        response = requests.post(url, json=sample_input)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        # Print response
        print("\n---- API Response ----")
        result = response.json()
        print(json.dumps(result, indent=2))
        
        # Check if the result contains expected fields
        expected_fields = ['is_at_risk', 'probability', 'risk_score', 'intervention']
        missing_fields = [field for field in expected_fields if field not in result]
        
        if missing_fields:
            print(f"\n⚠️ Warning: Missing expected fields: {', '.join(missing_fields)}")
        else:
            print("\n✅ API test successful! All expected fields present.")
        
        return result
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to the API server. Is it running?")
        print("   Run 'python app.py' to start the server.")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    print("Testing Risk Prediction API")
    print("==========================\n")
    test_risk_prediction_api()
