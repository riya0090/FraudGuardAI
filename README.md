Submission for InnoNova 2025
# 3.2 FraudGuardAI

## Overview
**FrausGuardAI** is an advanced phishing email and scam website detector powered by AI. It helps users identify fraudulent emails and malicious websites by analyzing content, URLs, and metadata to prevent scams, phishing attacks, and online fraud.

## Features
- 🔍 **Email Analysis**: Detects suspicious email content and phishing attempts.
- 🌐 **Website Scanning**: Analyzes website URLs and structure to identify potential scams.
- 🤖 **AI-Powered Detection**: Utilizes machine learning models to recognize patterns of fraud.
- 📊 **Risk Scoring**: Provides a risk score for emails and websites.
- 🚀 **Real-Time Alerts**: Notifies users instantly when a threat is detected.
- 🔒 **Privacy-Focused**: No sensitive data is stored; all processing happens locally.

## Installation
### Prerequisites
Ensure you have the following installed before running FrausGuardAI:
- Python 3.8+
- pip (Python package manager)
- Required dependencies (see below)

### Clone the Repository
```sh
git clone https://github.com/yourusername/FrausGuardAI.git
cd FrausGuardAI
```

### Install Dependencies
```sh
pip install -r requirements.txt
```

## Usage
### Email Analysis
Run the following command to scan an email file:
```sh
python analyze_email.py --file path/to/email.eml
```

### Website Scanning
To scan a website for phishing risks, use:
```sh
python analyze_website.py --url https://example.com
```

## How It Works
1. **Email Scanning**: Extracts metadata, content, and embedded links to analyze potential phishing elements.
2. **Website Scanning**: Inspects domain reputation, SSL certificates, and webpage content for scam indicators.
3. **Machine Learning Model**: Uses trained classifiers to detect fraudulent patterns and score threats.

---
Protect yourself from online fraud with **FrausGuardAI**! 🛡️

