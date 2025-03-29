#app.pyfrom flask import Flask, request, jsonify, render_template
import pickle
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer

app = Flask(__name__)

# Configuration
DEBUG = True
MODEL_PATH = "model.pkl"
VECTORIZER_PATH = "vectorizer.pkl"

# Load model and vectorizer with error handling
try:
    print(f"Loading model from {MODEL_PATH}...")
    model = pickle.load(open(MODEL_PATH, "rb"))
    print(f"Loading vectorizer from {VECTORIZER_PATH}...")
    vectorizer = pickle.load(open(VECTORIZER_PATH, "rb"))
    print("Model and vectorizer loaded successfully!")
except Exception as e:
    print(f"\nERROR LOADING MODEL FILES: {str(e)}")
    print("Please ensure:")
    print(f"1. {MODEL_PATH} exists")
    print(f"2. {VECTORIZER_PATH} exists")
    print("3. Both files are in the same directory as app.py")
    print("4. The files were created with the same Python version")
    raise SystemExit(1)

def extract_email_features(email_text):
    """Extract features from email text for analysis display"""
    features = {
        'length': len(email_text),
        'num_links': len(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', email_text)),
        'sensitive_keywords': sum(1 for word in ['password', 'verify', 'account', 'login', 'urgent', 'immediately'] 
                             if word in email_text.lower())
    }
    return features

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict/email', methods=['POST'])
def predict_email():
    """Endpoint for email phishing detection"""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    email_text = data.get("email_text", "").strip()

    if not email_text:
        return jsonify({"error": "Email text cannot be empty"}), 400

    try:
        # Transform and predict
        email_tfidf = vectorizer.transform([email_text])
        prediction = model.predict(email_tfidf)[0]
        probability = model.predict_proba(email_tfidf)[0][1]
        
        # Prepare response
        result = {
            "prediction": "Phishing Email" if prediction == 1 else "Safe Email",
            "confidence": float(probability),
            "features": extract_email_features(email_text),
            "input_sample": email_text[:100] + "..." if len(email_text) > 100 else email_text
        }

        if DEBUG:
            print("\n=== Prediction Result ===")
            print(f"Input length: {len(email_text)} chars")
            print(f"Prediction: {result['prediction']}")
            print(f"Confidence: {result['confidence']:.2%}")
            print(f"Links found: {result['features']['num_links']}")
            print(f"Sensitive keywords: {result['features']['sensitive_keywords']}")

        return jsonify(result)

    except Exception as e:
        error_msg = f"Prediction error: {str(e)}"
        if DEBUG:
            print(f"\n!!! ERROR: {error_msg}")
            print(f"Input was: {email_text[:200]}...")
        return jsonify({"error": error_msg}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    url = data.get("url", "")
    
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    
    # Transform URL into model-compatible format
    url_vector = vectorizer.transform([url])
    prediction = model.predict(url_vector)[0]
    
    result = "Scam Website" if prediction == 1 else "Legitimate Website"
    return jsonify({"result": result})

if __name__ == '__main__':
    print("\n=== Starting Flask Server ===")
    print(f"Debug mode: {'ON' if DEBUG else 'OFF'}")
    print("Available routes:")
    print(f"GET  / - Homepage")
    print(f"POST /predict/email - Email phishing detection")
    print(f"POST /analyze - URL scam detection")
    app.run(debug=DEBUG, host='0.0.0.0', port=5000)