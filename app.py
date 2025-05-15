from flask import Flask, request, jsonify
import google.generativeai as genai
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS

# Get API key
api_key = os.getenv('GENAI_API_KEY')
print("API Key Loaded:", api_key)  # Debugging

if not api_key:
    raise ValueError("API key not found! Set GENAI_API_KEY in .env")

# Configure generative AI
try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")  
except Exception as e:
    print(f"Error in AI configuration: {e}")

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        print("Received Data:", data)  # Debugging
        
        if not data or "message" not in data:
            return jsonify({"error": "Invalid request"}), 400
        
        user_message = data["message"].strip()
        if not user_message:
            return jsonify({"error": "Empty message"}), 400

        # Generate response
        response = model.generate_content(user_message)
        print("API Response:", response)  # Debugging
        
        chat_response = response.text.strip() if response and response.text else "No response from AI"
        return jsonify({"response": chat_response})
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/')
def home():
    return 'Flask server is working!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)))
