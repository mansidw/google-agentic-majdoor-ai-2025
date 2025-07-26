from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename
import PIL.Image
import io
import tempfile
import fitz  # PyMuPDF for PDF handling
from google import genai
import json
import base64
import random
import requests
from utils.demo_generic import DemoGeneric
from utils.offers_utils import get_gemini_offers, extract_credit_cards, get_session_id

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Initialize Gemini client
os.environ["GOOGLE_API_KEY"] = str(os.getenv("GOOGLE_API_KEY"))
FI_MCP_DEV_URL = "http://localhost:8080/mcp/stream"

client = genai.Client()


@app.route("/health")
def health():
    return f"Yes healthy {os.getenv('SAMPLE')}!"


@app.route("/api/analyze_receipt", methods=["POST"])
def analyze_receipt():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request."}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file."}), 400

    filename = secure_filename(file.filename)
    file_ext = filename.rsplit(".", 1)[-1].lower()

    # Prompt for the LLM
    prompt_text = """
    You are an expert receipt processing agent. Analyze the provided receipt image.
    Extract the merchant name, transaction date, total amount, tax, currency, and a list of all individual items with their prices.

    If you cannot find a value for a field, set it to null.

    Respond ONLY with a valid JSON object. Do not include any other text, explanations, or markdown formatting like ```json.

    The JSON structure must be:
    {
      "merchant": "string",
      "date": "YYYY-MM-DD",
      "total": number,
      "tax": number,
      "currency": "ISO 4217 code (e.g., USD, EUR, INR)",
      "items": [
        { "description": "string", "price": number }
      ]
    }
    """

    try:
        if file_ext in ["png", "jpg", "jpeg", "bmp", "gif"]:
            img = PIL.Image.open(file.stream)
            contents = [prompt_text, img]
        elif file_ext == "pdf":
            # Save PDF to temp file and extract first page as image
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
                file.save(tmp_pdf)
                tmp_pdf.flush()
                doc = fitz.open(tmp_pdf.name)
                if len(doc) == 0:
                    return jsonify({"error": "PDF has no pages."}), 400
                img_list = []
                for i in range(len(doc)):
                    page = doc.load_page(i)
                    pix = page.get_pixmap()
                    img_bytes = pix.tobytes("png")
                    img = PIL.Image.open(io.BytesIO(img_bytes))
                    img_list.append(img)
                doc.close()
            contents = [prompt_text] + img_list
        else:
            return jsonify({"error": "Unsupported file type."}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to process file: {str(e)}"}), 400

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
        )
        response_text = response.text
        if response_text and response_text.startswith("```json"):
            response_text = (
                response_text.strip().replace("```json", "").replace("```", "")
            )
        if response_text:
            receipt_data = json.loads(response_text)
            return jsonify(receipt_data)
        else:
            return jsonify({"error": "No response text received from the model."}), 500
    except Exception as e:
        return jsonify({"error": f"LLM processing failed: {str(e)}"}), 500


@app.route("/api/create-wallet-class", methods=["POST"])
def create_wallet_class():
    """
    An API endpoint that generates and creates a wallet class.
    """
    wallet_service = DemoGeneric()

    # --- Configuration ---
    # In a real app, you would get these values based on the logged-in user
    # or from the request body.
    issuer_id = os.getenv("ISSUER_ID")

    # Get class_suffix from request body
    data = request.get_json()
    if not data or "class_suffix" not in data:
        return jsonify({"error": "Class Suffix is required in request body."}), 400

    class_suffix = data["class_suffix"]

    if not class_suffix:
        return jsonify({"error": "Class Suffix is required."}), 500

    # Call the new method to generate the save link
    class_deets = wallet_service.create_class(issuer_id, class_suffix)

    if class_deets:
        print(f"🔗 Generated class name: {class_deets}")
        return jsonify({"class_name": class_deets})
    else:
        return jsonify({"error": "Failed to generate new class."}), 500


@app.route("/api/create-wallet-object", methods=["POST"])
def create_wallet_object():
    """
    An API endpoint that generates and creates a wallet object of a give class.
    """
    wallet_service = DemoGeneric()
    issuer_id = os.getenv("ISSUER_ID")

    # Get class_suffix from request body
    data = request.get_json()
    if not data or "class_suffix" not in data:
        return jsonify({"error": "Class Suffix is required in request body."}), 400

    class_suffix = data["class_suffix"]
    if not class_suffix:
        return jsonify({"error": "Class Suffix is required."}), 500

    object_suffix = data["object_suffix"]
    if "object_suffix" not in data:
        return jsonify({"error": "Object Suffix is required in request body."}), 400

    object_data = data["object_data"]
    if "object_data" not in data:
        return jsonify({"error": "Object data is required in request body."}), 400

    # Call the new method to generate the save link
    object_deets = wallet_service.create_object(
        issuer_id, class_suffix, object_suffix, object_data
    )

    if object_deets:
        print(f"🔗 Generated object name: {object_deets}")
        return jsonify({"object_name": object_deets})
    else:
        return jsonify({"error": "Failed to generate new object."}), 500


@app.route("/api/get-wallet-link", methods=["POST"])
def get_wallet_link():
    """
    An API endpoint that generates and returns a wallet pass link.
    """
    print("Received request for wallet link...")
    wallet_service = DemoGeneric()

    # --- Configuration ---
    # In a real app, you would get these values based on the logged-in user
    # or from the request body.
    issuer_id = os.getenv("ISSUER_ID")
    class_suffix = "sample_class_1"  # The class you already created

    # IMPORTANT: The object_suffix MUST be for an object that has already been
    # created using your create_object() method. For this demo, we assume
    # an object with this suffix exists.
    object_suffix = "sample_pass_object_1"

    if not issuer_id:
        return jsonify({"error": "WALLET_ISSUER_ID environment variable not set."}), 500

    # Call the new method to generate the save link
    save_link = wallet_service.create_jwt_existing_objects(
        issuer_id, object_suffix, class_suffix
    )

    if save_link:
        print(f"🔗 Generated save link: {save_link}")
        return jsonify({"saveUrl": save_link})
    else:
        return jsonify({"error": "Failed to generate wallet link."}), 500


@app.route("/pizza-offers", methods=["POST"])
def pizza_offers():
    # Get session_id from request body if present
    req_json = request.get_json(silent=True) or {}
    session_id = req_json.get("session_id") or get_session_id()
    headers = {
        "Content-Type": "application/json",
        "Mcp-Session-Id": session_id
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "fetch_credit_report",
            "arguments": {}
        }
    }
    # Call fi-mcp-dev
    resp = requests.post(FI_MCP_DEV_URL, headers=headers, json=payload)
    if resp.status_code != 200:
        return jsonify({"error": "Failed to contact fi-mcp-dev"}), 500
    data = resp.json()
    print(data)
    # Check for login_url in response (fix: parse nested JSON string)
    login_url = None
    if isinstance(data, dict) and "result" in data and "content" in data["result"]:
        for item in data["result"]["content"]:
            if item.get("type") == "text":
                import json as pyjson
                try:
                    text_data = pyjson.loads(item["text"])
                    if "login_url" in text_data:
                        login_url = text_data["login_url"]
                        break
                except Exception:
                    pass
    if login_url:
        return jsonify({"error": "User needs to login to fi-mcp-dev first.", "login_url": login_url, "session_id": session_id}), 401
    # Extract credit card info
    credit_cards = extract_credit_cards(data)
    print(credit_cards)
    
    offers = get_gemini_offers(credit_cards)
    return jsonify({"offers": offers, "session_id": session_id})

if __name__ == "__main__":
    app.run(debug=True)
