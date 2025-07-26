from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import asyncio
from werkzeug.utils import secure_filename
import PIL.Image
import io
import tempfile
import fitz  # PyMuPDF for PDF handling
import google.generativeai as genai
from google.genai import types
import json
import base64
import random
import requests
from utils.demo_generic import DemoGeneric
from utils.offers_utils import get_gemini_offers, extract_credit_cards, get_session_id, extract_intent_from_request
from utils.helper_tools import (
    get_grocery_inventory,
    identify_perishable_items,
    create_recipe_from_ingredients,
)
from utils.recommendations import get_card_recommendations

from googleapiclient.discovery import build
from google.oauth2 import service_account
import datetime
import os
from typing import List, Dict, Any, Tuple
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from googleapiclient.errors import HttpError

load_dotenv()
SERVICE_ACCOUNT_FILE_PATH="gwallet_sa_keyfile.json"
app = Flask(__name__)
CORS(app, supports_credentials=True)

# Initialize Gemini API key
os.environ["GOOGLE_API_KEY"] = str(os.getenv("GOOGLE_API_KEY"))
FI_MCP_DEV_URL = "https://d7da877c3cec.ngrok-free.app/mcp/stream"

CLASS_SUFFIXES=["GroceryClass"]
issuer_id = os.getenv("ISSUER_ID")
# Initialize the ADK Agent with our defined tools
root_agent = Agent(
    name="GroceryInventoryAgent",  # Add a name (required by LlmAgent)
    tools=[
        get_grocery_inventory,
        identify_perishable_items,
        create_recipe_from_ingredients,
    ],
    model="gemini-1.5-pro-latest",  # Pass the model name as a string
)
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="my_App",
    session_service=session_service,
)


def interact_with_adk_agent_sync(user_query: str):
    async def run():
        user_content = types.Content(
            role="user", parts=[types.Part.from_text(text=user_query)]
        )
        session_id = "flask_adk_session"

        await session_service.create_session(
            app_name="my_App", user_id="flask_user", session_id=session_id
        )

        final_response_text = "No response from agent."
        async for event in runner.run_async(
            user_id="flask_user", session_id=session_id, new_message=user_content
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_response_text = event.content.parts[0].text
        return final_response_text

    return asyncio.run(run())


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
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(contents)
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

    # Get class_suffix from request body
    data = request.get_json()
    if not data or "class_suffix" not in data:
        return jsonify({"error": "Class Suffix is required in request body."}), 400

    class_suffix = data["class_suffix"]

    if not class_suffix:
        return jsonify({"error": "Class Suffix is required."}), 500

    # Call the new method to generate the save link
    class_suffix = wallet_service.create_class(issuer_id, class_suffix)

    if class_suffix:
        print(f"🔗 Generated class name: {class_suffix}")
        return jsonify({"class_suffix": class_suffix})
    else:
        return jsonify({"error": "Failed to generate new class."}), 500


@app.route("/api/create-wallet-object", methods=["POST"])
def create_wallet_object():
    """
    An API endpoint that generates and creates a wallet object of a give class.
    """
    wallet_service = DemoGeneric()
    issuer_id = os.getenv("issuer_id")

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
    object_suffix = wallet_service.create_object(
        issuer_id, class_suffix, object_suffix, object_data
    )

    if object_suffix:
        print(f"🔗 Generated object name: {object_suffix}")
        return jsonify({"object_suffix": object_suffix, "class_suffix": class_suffix})
    else:
        return jsonify({"error": "Failed to generate new object."}), 500


@app.route("/api/get-wallet-link", methods=["POST"])
def get_wallet_link():
    """
    An API endpoint that generates and returns a wallet pass link.
    """
    print("Received request for wallet link...")
    data = request.get_json()
    class_suffix = data["class_suffix"]
    object_suffix = data["object_suffix"]
    wallet_service = DemoGeneric()

    # --- Configuration ---
    # In a real app, you would get these values based on the logged-in user
    # or from the request body.
    issuer_id = os.getenv("issuer_id")

    if not issuer_id:
        return jsonify({"error": "WALLET_issuer_id environment variable not set."}), 500

    # Call the new method to generate the save link
    save_link = wallet_service.create_jwt_existing_objects(
        issuer_id, object_suffix, class_suffix
    )

    if save_link:
        print(f"🔗 Generated save link: {save_link}")
        return jsonify({"saveUrl": save_link})
    else:
        return jsonify({"error": "Failed to generate wallet link."}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    """The main chat endpoint for the frontend to call."""
    data = request.json
    query = data.get("query")
    chat_history = data.get(
        "history", []
    )  # Expects a list of {'role': 'user'/'model', 'parts': [{'text': ...}]}
    user_id = data.get("userId", "demo-user-001")  # Get user ID from request

    if not query:
        return jsonify({"error": "Query is required."}), 400

    print(f"\n--- New Request ---")
    print(f"User Query: {query}")
    print(f"History Length: {len(chat_history)}")

    # The ADK uses the query and history to decide which tool to run
    # response = agent.run_async(
    #     query, history=chat_history, context={"user_id": user_id}
    # )
    response = interact_with_adk_agent_sync(query)

    # Add the current exchange to history for the next turn
    chat_history.append({"role": "user", "parts": [{"text": query}]})
    chat_history.append({"role": "model", "parts": [{"text": response}]})

    return jsonify({"response": response, "history": chat_history})


@app.route("/offers", methods=["POST"])
def get_offers():
    """
    Main endpoint that handles natural language requests and returns relevant offers.
    """
    # Get request data
    req_json = request.get_json(silent=True) or {}
    user_request = req_json.get("request", "")
    session_id = req_json.get("session_id") or get_session_id()
    
    if not user_request:
        return jsonify({"error": "No request provided"}), 400
    
    # Extract intent from user request
    intent = extract_intent_from_request(user_request)
    print(f"Extracted intent: {intent}")
    
    # Get credit card info from fi-mcp-dev
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
    
    # Check for login_url in response
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
        return jsonify({
            "error": "User needs to login to fi-mcp-dev first.", 
            "login_url": login_url, 
            "session_id": session_id
        }), 401
    
    # Extract credit card info
    credit_cards = extract_credit_cards(data)
    print(credit_cards)
    
    # Get offers using Gemini
    offers = get_gemini_offers(credit_cards, intent)
    
    return jsonify({
        "offers": offers, 
        "session_id": session_id,
        "intent": intent,
        "user_request": user_request
    })


@app.route("/recommend_card", methods=["POST"])
def recommend_card():
    req = request.get_json(force=True)
    session_id = req.get("session_id") or get_session_id()
    try:
        category, cards = get_card_recommendations(session_id)
        return jsonify({"category": category, "recommended_cards": [cards[0]], "session_id": session_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
def fetch_wallet_passes(class_id: str) -> List[Dict[str, Any]]:
    """
    Fetches all generic pass objects for a given class ID from the Google Wallet API.
    
    Args:
        class_id: The full ID of the class (e.g., 'issuer_id.CLASS_SUFFIX').

    Returns:
        A list of all pass objects found for that class, or an empty list on error.
    """
    print(f"Attempting to fetch passes for class: {class_id}")
    
    if not os.path.exists(SERVICE_ACCOUNT_FILE_PATH):
        print(f"Service account key file not found at: {SERVICE_ACCOUNT_FILE_PATH}")
        # In an API context, we return an empty list instead of raising a FileNotFoundError
        # to prevent the server from crashing. The error is logged to the console.
        return []

    scopes = ['https://www.googleapis.com/auth/wallet_object.issuer']
    try:
        creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE_PATH, scopes=scopes)
        service = build('walletobjects', 'v1', credentials=creds)
        
        all_passes = []
        page_token = None
        while True:
            response = service.genericobject().list(classId=class_id, token=page_token).execute()
            all_passes.extend(response.get('resources', []))
            page_token = response.get('pagination', {}).get('nextPageToken')
            if not page_token:
                break
                
        print(f" Successfully fetched {len(all_passes)} passes for class {class_id}.")
        return all_passes

    except HttpError as e:
        print(f" API Error for class {class_id}: {e.reason}")
        print("Please ensure your service account has permissions in the Google Wallet Console.")
        return [] # Return empty list on API error
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return []


def process_passes_for_period(passes: List[Dict[str, Any]], period: str) -> Tuple[List[Dict[str, Any]], float]:
    """
    Filters passes based on a time period and calculates the total expenditure.
    This is an adaptation of your original `get_passes_and_expenditure` function.

    Args:
        passes: A list of pass objects to process.
        period: The time period for filtering ('daily', 'weekly', 'monthly', 'yearly').

    Returns:
        A tuple containing the list of filtered passes and the calculated total expenditure.
    """
    print(passes)
    valid_periods = ['daily', 'weekly', 'monthly', 'yearly']
    period = period.lower()
    if period not in valid_periods:
        # In a real app, you might want more robust error handling
        raise ValueError(f"Invalid period '{period}'. Must be one of {valid_periods}.")

    filtered_passes = []
    total_expenditure = 0.0
    today = datetime.datetime.now().date()

    for p in passes:
        # Using .get() with a default empty dict to prevent KeyErrors
        text_modules = p.get('textModulesData', [])
        print(text_modules)
        date_module = next((m for m in text_modules if m.get('id') == 'DATE_MODULE'), None)
        total_module = next((m for m in text_modules if m.get('id') == 'TOTAL_MODULE'), None)

        if not date_module or not total_module:
            continue

        try:
            # Assuming date is in 'YYYY-MM-DD' and total is like '$ 123.45'
            pass_date = datetime.datetime.strptime(date_module.get('body'), '%Y-%m-%d').date()
            amount_str = total_module.get('body', '').split()[-1]
            amount = float(amount_str)
        except (ValueError, TypeError, IndexError):
            # Skip pass if date or amount format is incorrect
            continue
        print(today.year)
        match = False
        if period == 'daily' and pass_date == today:
            match = True
        elif period == 'weekly' and (today - pass_date).days < 7 and pass_date.isocalendar()[1] == today.isocalendar()[1]:
            match = True
        elif period == 'monthly' and pass_date.year == today.year and pass_date.month == today.month:
            match = True
        elif period == 'yearly' and pass_date.year == today.year:
            match = True
        
        if match:
            filtered_passes.append(p)
            total_expenditure += amount

    return filtered_passes, round(total_expenditure, 2)


def get_all_passes_for_classes(class_suffixes: List[str]) -> List[Dict[str, Any]]:
    """Helper function to fetch all passes from a list of class suffixes."""
    all_passes = []
    for suffix in class_suffixes:
        full_class_id = f"{issuer_id}.{suffix}"
        passes = fetch_wallet_passes(full_class_id)
        all_passes.extend(passes)
    return all_passes

# --- GET API for expenditure summary with filter ---
@app.route('/expenditure/summary', methods=['GET'])
def get_expenditure_summary():
    """
    Returns totalSpent, totalPasses, averagePassesPerDay, totalCategories, and categoryData
    based on a filter: daily, weekly, monthly, yearly (passed as ?filter=period)
    """
    filter_period = request.args.get('filter', 'monthly').lower()
    valid_periods = ['daily', 'weekly', 'monthly', 'yearly']
    if filter_period not in valid_periods:
        return jsonify({"error": f"Invalid filter '{filter_period}'. Must be one of {valid_periods}"}), 400

    # Fetch all passes
    all_passes = get_all_passes_for_classes(CLASS_SUFFIXES)
    if not all_passes:
        return jsonify({"error": "Could not fetch any passes."}), 500

    # Filter passes and calculate totalSpent
    filtered_passes, total_spent = process_passes_for_period(all_passes, filter_period)
    total_passes = len(filtered_passes)

    # Calculate average passes per day
    if total_passes == 0:
        avg_passes_per_day = 0
    else:
        # Find unique days in filtered passes
        days = set()
        for p in filtered_passes:
            text_modules = p.get('textModulesData', [])
            date_module = next((m for m in text_modules if m.get('id') == 'DATE_MODULE'), None)
            if date_module:
                days.add(date_module.get('body'))
        avg_passes_per_day = round(total_passes / max(len(days), 1), 2)

    # Category data: group by class prefix (e.g., GroceryClass -> groceries)
    class_suffix_to_category = {
        "GroceryClass": "groceries",
        "TravelClass": "travel",
        "HealthClass": "health"
        # Add more mappings as needed
    }
    category_totals = {}
    for p in filtered_passes:
        # Get class suffix from classId (e.g., issuer_id.GroceryClass)
        class_id = p.get('classId', '')
        class_suffix = None
        if '.' in class_id:
            parts = class_id.split('.')
            if len(parts) >= 2:
                class_suffix = parts[1]
        category = class_suffix_to_category.get(class_suffix, class_suffix or 'Unknown')
        total_module = next((m for m in p.get('textModulesData', []) if m.get('id') == 'TOTAL_MODULE'), None)
        if total_module:
            try:
                amount_str = total_module.get('body', '').split()[-1]
                amount = float(amount_str)
            except Exception:
                amount = 0.0
            category_totals[category] = category_totals.get(category, 0.0) + amount

    category_data = [
        {"name": name, "amount": round(amount, 2)}
        for name, amount in category_totals.items()
    ]
    total_categories = len(category_data)

    return jsonify({
        "totalSpent": round(total_spent, 2),
        "totalPasses": total_passes,
        "averagePassesPerDay": avg_passes_per_day,
        "totalCategories": total_categories,
        "categoryData": category_data
    })


# --- API to compare expenditure for this month and previous month ---
@app.route('/expenditure/monthly-comparison', methods=['GET'])
def compare_monthly_expenditure():
    """
    API Endpoint: Compares expenditure for this month and previous month and returns percentage change in savings.
    """
    print("Received request for /expenditure/monthly-comparison")
    all_passes = get_all_passes_for_classes(CLASS_SUFFIXES)
    if not all_passes:
        return jsonify({"error": "Could not fetch any passes. Check logs for details."}), 500

    today = datetime.datetime.now().date()
    this_month = today.month
    this_year = today.year
    # Calculate previous month and year
    if this_month == 1:
        prev_month = 12
        prev_year = this_year - 1
    else:
        prev_month = this_month - 1
        prev_year = this_year
    

    # Helper to filter passes for a given month/year
    def filter_passes_for_month(passes, year, month):
        filtered = []
        total = 0.0
        for p in passes:
            text_modules = p.get('textModulesData', [])
            date_module = next((m for m in text_modules if m.get('id') == 'DATE_MODULE'), None)
            total_module = next((m for m in text_modules if m.get('id') == 'TOTAL_MODULE'), None)
            if not date_module or not total_module:
                continue
            try:
                pass_date = datetime.datetime.strptime(date_module.get('body'), '%Y-%m-%d').date()
                amount_str = total_module.get('body', '').split()[-1]
                amount = float(amount_str)
            except (ValueError, TypeError, IndexError):
                continue
            if pass_date.year == year and pass_date.month == month:
                filtered.append(p)
                total += amount
        return filtered, round(total, 2)

    passes_this_month, total_this_month = filter_passes_for_month(all_passes, this_year, this_month)
    passes_prev_month, total_prev_month = filter_passes_for_month(all_passes, prev_year, prev_month)

    # Calculate percentage change in savings (decrease in expenditure means increase in savings)
    if total_prev_month == 0:
        percent_change = None
    else:
        percent_change = ((total_prev_month - total_this_month) / total_prev_month) * 100

    result = {
        "this_month": {
            "year": this_year,
            "month": this_month,
            "total_expenditure": total_this_month,
            "pass_count": len(passes_this_month)
        },
        "previous_month": {
            "year": prev_year,
            "month": prev_month,
            "total_expenditure": total_prev_month,
            "pass_count": len(passes_prev_month)
        },
        "percent_change_in_savings": percent_change
    }
    return jsonify(result)

# --- POST API to call Gemini for data insights ---
@app.route('/api/data-insights', methods=['POST'])

# --- Helper function for insights generation ---
def generate_insights_data():
    """
    Generates insights data using Gemini API and Google Wallet passes.
    Returns a Python dict (not a Flask response).
    """
    all_passes = []
    for suffix in CLASS_SUFFIXES:
        full_class_id = f"{issuer_id}.{suffix}"
        class_passes = fetch_wallet_passes(full_class_id)
        all_passes.extend(class_passes)
    prompt = (
        "You are an expert data insights provider agent. Analyze the provided list of dictionary. "
        "It contains details related to some kind of expenditure. Refer to tags (if present): 'items', 'textModulesData' and generate a JSON object with insights on following topics:\n"
        "    1. 'expenditure' — a short spending tip or alert.\n"
        "    2. 'perishables' — a list of items about to expire soon.\n"
        "    3. 'health' — a tip or reminder about food diversity, freshness or wellness.\n"
        "    4. 'recipes' — suggest a recipe to reduce waste.\n"
        "Respond ONLY with a valid JSON object. Do not include any other text, explanations, or markdown formatting like ```json.\n"
        "\nExample output:\n"
        "{\n"
        "  \"expenditure\": \"You’ve made several high-value purchases like a dining table and Bluetooth Care devices. Consider categorizing luxury and recurring expenses separately to improve budget clarity.\",\n"
        "  \"perishables\": [\n"
        "    \"BANANAS (purchased in 2021) — likely expired\",\n"
        "    \"Chapati (2025-03-30) — may be stale\",\n"
        "    \"Mineral Water (2025-03-30) — check for seal and expiry date\"\n"
        "  ],\n"
        "  \"health\": \"While your meals include thalis and fruits like bananas, consider adding more fresh vegetables and avoiding frequent alcohol purchases to maintain a balanced diet.\",\n"
        "  \"recipes\": {\n"
        "    \"recipe_name\": \"Banana-Chapati Pancakes\",\n"
        "    \"description\": \"Use ripe or leftover bananas and chapatis to create a nutritious, waste-free breakfast.\",\n"
        "    \"ingredients\": [\n"
        "      \"2 ripe bananas\",\n"
        "      \"2 chapatis (torn into small pieces)\",\n"
        "      \"1 egg or egg substitute\",\n"
        "      \"1/4 cup milk\",\n"
        "      \"1 tsp honey\",\n"
        "      \"Pinch of cinnamon\"\n"
        "    ],\n"
        "    \"instructions\": [\n"
        "      \"Mash the bananas in a bowl.\",\n"
        "      \"Add milk, egg, honey, and cinnamon. Mix well.\",\n"
        "      \"Add torn chapati pieces and let soak for 5 minutes.\",\n"
        "      \"Heat a pan and cook the mixture like pancakes on both sides.\",\n"
        "      \"Serve warm with yogurt or fruit.\"\n"
        "    ]\n"
        "  }\n"
        "}\n"
    )
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content([prompt, json.dumps(all_passes)])
        response_text = response.text
        if response_text and response_text.startswith("```json"):
            response_text = response_text.strip().replace("```json", "").replace("```", "")
        if response_text:
            try:
                insights = json.loads(response_text)
                return insights
            except Exception:
                return {"error": "Model response was not valid JSON.", "raw": response_text}
        else:
            return {"error": "No response text received from the model."}
    except Exception as e:
        return {"error": f"Gemini API call failed: {str(e)}"}

# --- Flask route uses jsonify ---
@app.route('/api/data-insights', methods=['POST'])
def get_data_insights():
    """
    POST endpoint to analyze expenditure data using Gemini API and a custom prompt.
    """
    insights = generate_insights_data()
    if 'error' in insights:
        return jsonify(insights), 500
    return jsonify(insights)
    
from apscheduler.schedulers.background import BackgroundScheduler
def run_insight_cron():
    # Prepare your data for insights (fetch from DB or API as needed)
    insights = generate_insights_data()
    # Create or update Google Wallet pass
    wallet_service = DemoGeneric()
    issuer_id = os.getenv("ISSUER_ID")
    class_suffix = "InsightClass"
    object_suffix = "insight_object"
    object_data = {
        "id": f"{issuer_id}.{object_suffix}",
        "classId": f"{issuer_id}.{class_suffix}",
        "state": "ACTIVE",
        "cardTitle": {
            "defaultValue": {
                "language": "en-US",
                "value": "Insights"
            }
        },
        "header": {
            "defaultValue": {"language": "en-US", "value": "Receipt Details"}
        },
        "hexBackgroundColor": "#4285f4",
        "logo": {
            "sourceUri": {
                "uri": "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg"
            },
            "contentDescription": {
                "defaultValue": {"language": "en-US", "value": "Generic card logo"}
            }
        },
        "barcode": {
            "type": "QR_CODE",
            "value": json.dumps(insights)
        },
        "textModulesData": [
            {"header": "Insights", "body": json.dumps(insights), "id": "INSIGHTS_MODULE"}
        ]
    }
    wallet_service.create_object(issuer_id, class_suffix, object_suffix, object_data)

# Scheduler setup
scheduler = BackgroundScheduler()
scheduler.add_job(run_insight_cron, 'interval', minutes=2)
scheduler.start()



if __name__ == "__main__":
    app.run(debug=True)
