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
import google.auth
import google.generativeai as genai
from google.genai import types
import json
import random
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from utils.offers_utils import get_session_id
from utils.prompts import ROUTING_AGENT_PROMPT
from utils.demo_generic import DemoGeneric
from utils.helper_tools import (
    get_grocery_inventory,
    identify_perishable_items,
    create_recipe_from_ingredients,
    generate_shopping_list,
    create_shopping_list_wallet_pass,
    get_spending_data,
    analyze_spending_and_suggest_savings,
    get_credit_card_offers,
)
from google.oauth2 import service_account
from utils.recommendations import get_card_recommendations

from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime, timedelta
import os
from typing import List, Dict, Any, Tuple
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from googleapiclient.errors import HttpError

# Two-Factor Authentication endpoints
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets

load_dotenv()
SERVICE_ACCOUNT_FILE_PATH = "gwallet_sa_keyfile.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "majdoor_ai_sa_firestore.json"
os.environ["GOOGLE_API_KEY"] = str(os.getenv("GOOGLE_API_KEY"))
credentials = service_account.Credentials.from_service_account_file(
    "majdoor_ai_sa_firestore.json"
)
db = firestore.Client(
    database="chat", credentials=credentials, project="global-impulse-467107-j6"
)
app = Flask(__name__)
CORS(app)

CLASS_SUFFIXES = ["GroceryClass"]
issuer_id = os.getenv("ISSUER_ID")
# Initialize the ADK Agent with our defined tools
root_agent = Agent(
    name="GroceryInventoryAgent",  # Add a name (required by LlmAgent)
    tools=[
        get_grocery_inventory,
        identify_perishable_items,
        create_recipe_from_ingredients,
        generate_shopping_list,
        create_shopping_list_wallet_pass,
        get_spending_data,
        analyze_spending_and_suggest_savings,
        get_credit_card_offers,
    ],
    model="gemini-1.5-pro-latest",  # Pass the model name as a string
    instruction=ROUTING_AGENT_PROMPT,  # Use the prompt defined in prompts.py
)
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="my_App",
    session_service=session_service,
)


def guardrail_check(query):
    guardrail_prompt = (
        "You are Raseed, a secure and helpful personal finance and receipt assistant integrated with Google Wallet. "
        "Only answer questions related to personal spending, savings, receipts, financial insights, grocery planning, and offers. Also the user might ask questions related to fetching their grocery/inventory etc items, then getting the list of expired items or the ones that might be expiring soon, also the queries could be related to creating a pass in their google wallet or suggestion of some recipes etc. So if the user query lies in any of the following broader categories, it should be responded with 'pass'"
        "If a user asks unrelated or unsafe questions, politely refuse and guide them back to supported topics. "
        "Never share sensitive or personal data.\n\n"
        f"User question: {query}\n"
        "Respond with only 'pass' if the question is safe and on-topic, or 'fail' if it is not."
    )
    model = genai.GenerativeModel("gemini-2.0-flash")
    result = model.generate_content(guardrail_prompt).text.strip().lower()
    return result


def get_last_10_chats(user_id):
    # print("user id in the getlast10chats - ", user_id)
    chats_ref = db.collection("chat_history")

    # Corrected query using the 'filter' keyword argument
    query = (
        chats_ref.where(filter=FieldFilter("user_id", "==", user_id))
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(3)
    )

    docs = query.stream()

    # It's good practice to reverse the list after fetching,
    # so the oldest of the last 10 chats is first.
    chat_list = [doc.to_dict() for doc in docs]
    chat_list.reverse()  # This makes the history chronological
    # print("these were the chats - ", chat_list)
    return chat_list


def save_chat_message(user_id, user_question, rephrased_question, response):
    """
    Save a single chat message to the 'chat_history' collection.
    Each document represents one user question/response turn.
    """
    chat_history_ref = db.collection("chat_history")
    message_data = {
        "user_id": user_id,
        "user_question": user_question,
        "rephrased_question": rephrased_question,
        "response": response,
        "timestamp": firestore.SERVER_TIMESTAMP,
    }
    chat_history_ref.add(message_data)


def interact_with_adk_agent_sync(user_query: str, user_id: str, last10chats: str):
    async def run():
        print("here the user id was intact - ", user_id)
        user_content = types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=user_query),
                types.Part.from_text(text=user_id),
                types.Part.from_text(text=last10chats),
            ],
        )
        session_id = "flask_adk_session"

        await session_service.create_session(
            app_name="my_App", user_id=user_id, session_id=session_id
        )

        final_response_text = "No response from agent."
        async for event in runner.run_async(
            user_id=user_id, session_id=session_id, new_message=user_content
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_response_text = event.content.parts[0].text
        return final_response_text

    return asyncio.run(run())


def rephrase_question(user_id, current_question, llm_model):
    """
    Rephrases a user's question to be standalone by incorporating context from the chat history.
    """
    # Fetch last 10 chats (assuming this returns newest first)
    last_chats = get_last_10_chats(user_id)

    # If there's no history, the question is standalone by default
    if not last_chats:
        return current_question, ""

    # The get_last_10_chats function should return the chats in chronological order (oldest to newest)
    # The existing code with .reverse() already does this, which is correct.
    # last_chats.reverse() # Ensure chronological order if not already done

    print("the final chat list - ", last_chats)

    # Build a clean chat history string
    history_str = ""
    for i, chat in enumerate(last_chats, 1):
        history_str += f"{i}. User Query: {chat['user_question']}\n   Assistant: {chat['response']} Rephrased Question: {chat['rephrased_question']}\n"

    # --- THE NEW, IMPROVED PROMPT ---
    prompt = f"""You are an expert in conversation analysis. Your task is to rephrase a new user query to make it a standalone question by incorporating necessary context from the recent chat history.

        **Chat History (Oldest to Newest):**
        ---
        {history_str}
        ---

        **New User Query:** "{current_question}"

        **Your Instructions:**
        1.  Analyze the "New User Query".
        2.  If the query is a short follow-up (e.g., "yes", "what about that?", "how?"), look at the **last Assistant response** in the history to understand the context.
        3.  Combine the context from the history with the new query to create a self-contained, complete question.
        4.  If the "New User Query" is already a complete, standalone question that doesn't rely on past context, return it exactly as it is. **Do not rephrase unnecessarily.**

        **Examples:**
        -   **Example 1 (Follow-up):**
            -   History: Assistant: "...I've created a shopping list for you. Would you like me to add this to your Google Wallet?"
            -   New User Query: "yes please"
            -   Rephrased Question: "Create a Google Wallet pass for the shopping list you just generated."

        -   **Example 2 (Contextual Query):**
            -   History: Assistant: "Last month you spent ₹5,500 on dining out."
            -   New User Query: "what about for groceries?"
            -   Rephrased Question: "How much did I spend on groceries last month?"

        -   **Example 3 (Standalone Query):**
            -   History: (any)
            -   New User Query: "How can I save money on my subscriptions?"
            -   Rephrased Question: "How can I save money on my subscriptions?"

        Now, based on the provided history and the new query, perform the rephrasing task.

        **Rephrased Question:**
        """

    # Call your LLM
    rephrased = llm_model.generate_content(prompt).text.strip()

    # Clean up potential LLM artifacts if any
    if rephrased.startswith('"') and rephrased.endswith('"'):
        rephrased = rephrased[1:-1]

    if rephrased == current_question:
        return rephrased, ""  # Return empty history if no rephrasing was needed

    return rephrased, history_str


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
    You are an expert receipt processing agent. Analyze the provided receipt image or screenshot.
    If the image is a standard receipt, extract:
      - merchant name
      - transaction date
      - total amount
      - tax
      - currency
      - a list of all individual items with their prices

    If the image is a Google Pay (GPay) transaction screenshot, extract:
      - merchant name
      - amount
      - the 'added note' as the description(if present)
      - transaction date
      - currency

    If you cannot find a value for a field, set it to null.

    Respond ONLY with a valid JSON object. Do not include any other text, explanations, or markdown formatting like ```json.

    For a standard receipt, the JSON structure must be:
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

    For a GPay screenshot, the JSON structure must be:
    {
      "merchant": "string",
      "total": number,
      "note": "string",
      "tax": number,
      "date": "YYYY-MM-DD",
      "currency": "ISO 4217 code (e.g., INR, USD)",
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
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"
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
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"
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
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"
    print("Received request for wallet link...")
    data = request.get_json()
    class_suffix = data["class_suffix"]
    object_suffix = data["object_suffix"]
    wallet_service = DemoGeneric()

    # --- Configuration ---
    # In a real app, you would get these values based on the logged-in user
    # or from the request body.
    issuer_id = os.getenv("ISSUER_ID")

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
    user_id = data.get("userId", "100")

    if not query:
        return jsonify({"error": "Query is required."}), 400
    # Guardrail check
    guardrail_result = guardrail_check(query)
    if guardrail_result != "pass":
        canned_response = (
            "Sorry, I can only help with questions about personal spending, savings, receipts, grocery planning, and related financial topics. "
            "Please ask something related to these areas."
        )
        return jsonify(
            {
                "response": canned_response,
                "query": query,
                "rephrased_question": None,
                "guardrail": "fail",
            }
        )
    llm_model = genai.GenerativeModel("gemini-2.0-flash")

    rephrased_question, last10chats = rephrase_question(user_id, query, llm_model)
    print(f"\n--- New Request ---")
    print(f"User Query: {query}")
    print(f"Rephrased Query: {rephrased_question}")

    # The ADK uses the query and history to decide which tool to run
    # response = agent.run_async(
    #     query, history=chat_history, context={"user_id": user_id}
    # )
    response = interact_with_adk_agent_sync(rephrased_question, user_id, last10chats)
    # Save updated history
    save_chat_message(
        user_id=user_id,
        user_question=query,
        rephrased_question=rephrased_question,
        response=response,
    )

    return jsonify(
        {"response": response, "query": query, "rephrased_question": rephrased_question}
    )


@app.route("/recommend_card", methods=["POST"])
def recommend_card():
    req = request.get_json(force=True)
    session_id = req.get("session_id") or get_session_id()
    try:
        category, cards = get_card_recommendations(session_id)
        return jsonify(
            {
                "category": category,
                "recommended_cards": [cards[0]],
                "session_id": session_id,
            }
        )
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

    scopes = ["https://www.googleapis.com/auth/wallet_object.issuer"]
    try:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE_PATH, scopes=scopes
        )
        service = build("walletobjects", "v1", credentials=creds)

        all_passes = []
        page_token = None
        while True:
            response = (
                service.genericobject()
                .list(classId=class_id, token=page_token)
                .execute()
            )
            all_passes.extend(response.get("resources", []))
            page_token = response.get("pagination", {}).get("nextPageToken")
            if not page_token:
                break

        print(f" Successfully fetched {len(all_passes)} passes for class {class_id}.")
        return all_passes

    except HttpError as e:
        print(f" API Error for class {class_id}: {e.reason}")
        print(
            "Please ensure your service account has permissions in the Google Wallet Console."
        )
        return []  # Return empty list on API error
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return []


def process_passes_for_period(
    passes: List[Dict[str, Any]], period: str
) -> Tuple[List[Dict[str, Any]], float]:
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
    valid_periods = ["daily", "weekly", "monthly", "yearly"]
    period = period.lower()
    if period not in valid_periods:
        # In a real app, you might want more robust error handling
        raise ValueError(f"Invalid period '{period}'. Must be one of {valid_periods}.")

    filtered_passes = []
    total_expenditure = 0.0
    today = datetime.now().date()

    for p in passes:
        # Using .get() with a default empty dict to prevent KeyErrors
        text_modules = p.get("textModulesData", [])
        print(text_modules)
        date_module = next(
            (m for m in text_modules if m.get("id") == "DATE_MODULE"), None
        )
        total_module = next(
            (m for m in text_modules if m.get("id") == "TOTAL_MODULE"), None
        )

        if not date_module or not total_module:
            continue

        try:
            # Assuming date is in 'YYYY-MM-DD' and total is like '$ 123.45'
            pass_date = datetime.strptime(
                date_module.get("body"), "%Y-%m-%d"
            ).date()
            amount_str = total_module.get("body", "").split()[-1]
            amount = float(amount_str)
        except (ValueError, TypeError, IndexError):
            # Skip pass if date or amount format is incorrect
            continue
        print(today.year)
        match = False
        if period == "daily" and pass_date == today:
            match = True
        elif (
            period == "weekly"
            and (today - pass_date).days < 7
            and pass_date.isocalendar()[1] == today.isocalendar()[1]
        ):
            match = True
        elif (
            period == "monthly"
            and pass_date.year == today.year
            and pass_date.month == today.month
        ):
            match = True
        elif period == "yearly" and pass_date.year == today.year:
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
@app.route("/expenditure/summary", methods=["GET"])
def get_expenditure_summary():
    """
    Returns totalSpent, totalPasses, averagePassesPerDay, totalCategories, and categoryData
    based on a filter: daily, weekly, monthly, yearly (passed as ?filter=period)
    """
    filter_period = request.args.get("filter", "monthly").lower()
    valid_periods = ["daily", "weekly", "monthly", "yearly"]
    if filter_period not in valid_periods:
        return (
            jsonify(
                {
                    "error": f"Invalid filter '{filter_period}'. Must be one of {valid_periods}"
                }
            ),
            400,
        )

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
            text_modules = p.get("textModulesData", [])
            date_module = next(
                (m for m in text_modules if m.get("id") == "DATE_MODULE"), None
            )
            if date_module:
                days.add(date_module.get("body"))
        avg_passes_per_day = round(total_passes / max(len(days), 1), 2)

    # Category data: group by class prefix (e.g., GroceryClass -> groceries)
    class_suffix_to_category = {
        "GroceryClass": "groceries",
        "TravelClass": "travel",
        "HealthClass": "health",
        "EntertainmentClass": "entertainment",
        "EducationClass": "education",
        # Add more mappings as needed
    }
    category_totals = {}
    for p in filtered_passes:
        # Get class suffix from classId (e.g., issuer_id.GroceryClass)
        class_id = p.get("classId", "")
        class_suffix = None
        if "." in class_id:
            parts = class_id.split(".")
            if len(parts) >= 2:
                class_suffix = parts[1]
        category = class_suffix_to_category.get(class_suffix, class_suffix or "Unknown")
        total_module = next(
            (m for m in p.get("textModulesData", []) if m.get("id") == "TOTAL_MODULE"),
            None,
        )
        if total_module:
            try:
                amount_str = total_module.get("body", "").split()[-1]
                amount = float(amount_str)
            except Exception:
                amount = 0.0
            category_totals[category] = category_totals.get(category, 0) + amount

    import re

    category_data = []
    print(category_totals)
    for name in class_suffix_to_category.keys():
        raw_amount = category_totals.get(class_suffix_to_category[name], 0)
        # Ensure amount is always a float
        if isinstance(raw_amount, str):
            amount_str = re.sub(r"[^\d\.]", "", raw_amount)
            try:
                amount = float(amount_str) if amount_str else 0.0
            except Exception:
                amount = 0.0
        else:
            amount = float(raw_amount)
        category_data.append({"name": class_suffix_to_category[name], "amount": amount})
    total_categories = len(category_data)

    return jsonify(
        {
            "totalSpent": round(total_spent, 2),
            "totalPasses": total_passes,
            "averagePassesPerDay": avg_passes_per_day,
            "totalCategories": total_categories,
            "categoryData": category_data,
        }
    )


# --- API to compare expenditure for this month and previous month ---
@app.route("/expenditure/monthly-comparison", methods=["GET"])
def compare_monthly_expenditure():
    """
    API Endpoint: Compares expenditure for this month and previous month and returns percentage change in savings.
    """
    print("Received request for /expenditure/monthly-comparison")
    all_passes = get_all_passes_for_classes(CLASS_SUFFIXES)
    if not all_passes:
        return (
            jsonify({"error": "Could not fetch any passes. Check logs for details."}),
            500,
        )

    today = datetime.now().date()
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
            text_modules = p.get("textModulesData", [])
            date_module = next(
                (m for m in text_modules if m.get("id") == "DATE_MODULE"), None
            )
            total_module = next(
                (m for m in text_modules if m.get("id") == "TOTAL_MODULE"), None
            )
            if not date_module or not total_module:
                continue
            try:
                pass_date = datetime.datetime.strptime(
                    date_module.get("body"), "%Y-%m-%d"
                ).date()
                amount_str = total_module.get("body", "").split()[-1]
                amount = float(amount_str)
            except (ValueError, TypeError, IndexError):
                continue
            if pass_date.year == year and pass_date.month == month:
                filtered.append(p)
                total += amount
        return filtered, round(total, 2)

    passes_this_month, total_this_month = filter_passes_for_month(
        all_passes, this_year, this_month
    )
    passes_prev_month, total_prev_month = filter_passes_for_month(
        all_passes, prev_year, prev_month
    )

    # Calculate percentage change in savings (decrease in expenditure means increase in savings)
    if total_prev_month == 0:
        percent_change = None
    else:
        percent_change = (
            (total_prev_month - total_this_month) / total_prev_month
        ) * 100

    result = {
        "this_month": {
            "year": this_year,
            "month": this_month,
            "total_expenditure": total_this_month,
            "pass_count": len(passes_this_month),
        },
        "previous_month": {
            "year": prev_year,
            "month": prev_month,
            "total_expenditure": total_prev_month,
            "pass_count": len(passes_prev_month),
        },
        "percent_change_in_savings": percent_change,
    }
    return jsonify(result)



# In-memory storage for verification codes (in production, use Redis or database)
verification_codes = {}

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return str(random.randint(100000, 999999))

def send_verification_email(email, code, user_name):
    """Send verification email using SMTP"""
    try:
        # Email configuration - you'll need to set these environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        sender_email = os.getenv('SENDER_EMAIL')
        sender_password = os.getenv('SENDER_PASSWORD')
        
        if not sender_email or not sender_password:
            print("SMTP credentials not configured, code will be logged to console")
            print(f"Verification code for {email}: {code}")
            return True
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Raseed - Your Verification Code"
        message["From"] = sender_email
        message["To"] = email
        
        # Create HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 40px 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                .code {{ background: #f8f9fa; border: 2px dashed #6c757d; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧾 Raseed</h1>
                    <p>Smart Receipt Management</p>
                </div>
                <div class="content">
                    <h2>Hello {user_name},</h2>
                    <p>Welcome to Raseed! To complete your sign-in process, please use the verification code below:</p>
                    <div class="code">{code}</div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <div class="footer">
                        <p>Best regards,<br>The Raseed Team</p>
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create text version
        text_content = f"""
        Hello {user_name},
        
        Your verification code for Raseed is: {code}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        The Raseed Team
        """
        
        html_part = MIMEText(html_content, "html")
        text_part = MIMEText(text_content, "plain")
        
        message.attach(text_part)
        message.attach(html_part)
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, email, message.as_string())
        server.quit()
        
        print(f"Verification email sent to {email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        print(f"Verification code for {email}: {code}")
        return True  # Return True to allow fallback to console logging

@app.route("/api/auth/send-verification", methods=["POST"])
def send_verification():
    """Send verification code to user's email"""
    try:
        data = request.get_json()
        email = data.get('email')
        user_name = data.get('userName', 'User')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Generate verification code
        code = generate_verification_code()
        
        # Store verification code with expiration (10 minutes)
        verification_codes[email] = {
            'code': code,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'verified': False
        }
        
        # Send email
        success = send_verification_email(email, code, user_name)
        
        if success:
            return jsonify({
                "message": "Verification code sent successfully",
                "email": email,
                "expires_in": "10 minutes"
            }), 200
        else:
            return jsonify({"error": "Failed to send verification email"}), 500
            
    except Exception as e:
        print(f"Error sending verification: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/verify-code", methods=["POST"])
def verify_code():
    """Verify the entered code"""
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return jsonify({"error": "Email and code are required"}), 400
        
        # Check if verification data exists
        if email not in verification_codes:
            return jsonify({"error": "No verification code found for this email"}), 400
        
        verification_data = verification_codes[email]
        
        # Check if code has expired
        if datetime.now() > verification_data['expires_at']:
            del verification_codes[email]
            return jsonify({"error": "Verification code has expired"}), 400
        
        # Check if code matches
        if verification_data['code'] != code:
            return jsonify({"error": "Invalid verification code"}), 400
        
        # Mark as verified
        verification_data['verified'] = True
        
        return jsonify({
            "message": "Verification successful",
            "verified": True
        }), 200
        
    except Exception as e:
        print(f"Error verifying code: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/resend-verification", methods=["POST"])
def resend_verification():
    """Resend verification code"""
    try:
        data = request.get_json()
        email = data.get('email')
        user_name = data.get('userName', 'User')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Generate new verification code
        code = generate_verification_code()
        
        # Update verification code with new expiration
        verification_codes[email] = {
            'code': code,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'verified': False
        }
        
        # Send email
        success = send_verification_email(email, code, user_name)
        
        if success:
            return jsonify({
                "message": "Verification code resent successfully",
                "email": email
            }), 200
        else:
            return jsonify({"error": "Failed to resend verification email"}), 500
            
    except Exception as e:
        print(f"Error resending verification: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/check-verification", methods=["POST"])
def check_verification():
    """Check if user's email is verified"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Check if verification exists and is verified
        if email in verification_codes:
            verification_data = verification_codes[email]
            
            # Check if not expired and verified
            if datetime.now() <= verification_data['expires_at'] and verification_data['verified']:
                return jsonify({"verified": True}), 200
        
        return jsonify({"verified": False}), 200
        
    except Exception as e:
        print(f"Error checking verification: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


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
    # --- Calculate Weekly Spending Trend ---
    # Get weekly and previous weekly expenditure
    all_passes = all_passes  # already fetched above
    filtered_week, total_week = process_passes_for_period(all_passes, "weekly")
    # Calculate previous week
    today = datetime.now().date()
    prev_week_start = today - timedelta(days=7)
    prev_week_end = today - timedelta(days=1)
    prev_week_passes = []
    prev_week_total = 0.0
    for p in all_passes:
        text_modules = p.get("textModulesData", [])
        date_module = next((m for m in text_modules if m.get("id") == "DATE_MODULE"), None)
        total_module = next((m for m in text_modules if m.get("id") == "TOTAL_MODULE"), None)
        if not date_module or not total_module:
            continue
        try:
            pass_date = datetime.strptime(date_module.get("body"), "%Y-%m-%d").date()
            amount_str = total_module.get("body", "").split()[-1]
            amount = float(amount_str)
        except Exception:
            continue
        if prev_week_start <= pass_date <= prev_week_end:
            prev_week_passes.append(p)
            prev_week_total += amount
    weekly_trend = None
    if prev_week_total > 0:
        weekly_trend = ((total_week - prev_week_total) / prev_week_total) * 100
    # --- Top Spending Category ---
    category_totals = {}
    class_suffix_to_category = {
        "GroceryClass": "groceries",
        "TravelClass": "travel",
        "HealthClass": "health",
        "EntertainmentClass": "entertainment",
        "EducationClass": "education",
    }
    for p in filtered_week:
        class_id = p.get("classId", "")
        class_suffix = None
        if "." in class_id:
            parts = class_id.split(".")
            if len(parts) >= 2:
                class_suffix = parts[1]
        category = class_suffix_to_category.get(class_suffix, class_suffix or "Unknown")
        total_module = next((m for m in p.get("textModulesData", []) if m.get("id") == "TOTAL_MODULE"), None)
        if total_module:
            try:
                amount_str = total_module.get("body", "").split()[-1]
                amount = float(amount_str)
            except Exception:
                amount = 0.0
            category_totals[category] = category_totals.get(category, 0) + amount
    top_category = max(category_totals, key=category_totals.get) if category_totals else None
    # --- Monthly Budget Alert ---
    # Assume a default budget for groceries (can be replaced with user config)
    monthly_budget = 5000.0
    filtered_month, total_month = process_passes_for_period(all_passes, "monthly")
    groceries_spent = 0.0
    for p in filtered_month:
        class_id = p.get("classId", "")
        class_suffix = None
        if "." in class_id:
            parts = class_id.split(".")
            if len(parts) >= 2:
                class_suffix = parts[1]
        category = class_suffix_to_category.get(class_suffix, class_suffix or "Unknown")
        if category == "groceries":
            total_module = next((m for m in p.get("textModulesData", []) if m.get("id") == "TOTAL_MODULE"), None)
            if total_module:
                try:
                    amount_str = total_module.get("body", "").split()[-1]
                    amount = float(amount_str)
                except Exception:
                    amount = 0.0
                groceries_spent += amount
    budget_alert = None
    if groceries_spent > monthly_budget:
        budget_alert = f"Alert: You have exceeded your monthly groceries budget of ₹{monthly_budget}. Total spent: ₹{groceries_spent}."
    elif groceries_spent > 0.8 * monthly_budget:
        budget_alert = f"Warning: You have used {groceries_spent/monthly_budget*100:.1f}% of your groceries budget."
    # --- Spending Anomaly ---
    # Find unusually high or low expenditures in weekly data
    item_spending = {}
    for p in filtered_week:
        items = []
        for tm in p.get("textModulesData", []):
            if tm.get("id") == "ITEMS_MODULE":
                try:
                    items = json.loads(tm.get("body", "[]"))
                except Exception:
                    items = []
        for item in items:
            desc = item.get("description", "Unknown")
            price = item.get("price", 0.0)
            item_spending[desc] = item_spending.get(desc, 0.0) + price
    anomaly = None
    if item_spending:
        avg = sum(item_spending.values()) / len(item_spending)
        high = [k for k, v in item_spending.items() if v > 2 * avg]
        low = [k for k, v in item_spending.items() if v < 0.5 * avg]
        if high:
            anomaly = f"Unusually high spending on: {', '.join(high)}."
        elif low:
            anomaly = f"Unusually low spending on: {', '.join(low)}."
    # --- LLM Insights ---
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
        '  "expenditure": "You’ve made several high-value purchases like a dining table and Bluetooth Care devices. Consider categorizing luxury and recurring expenses separately to improve budget clarity.",\n'
        '  "perishables": [\n'
        '    "BANANAS (purchased in 2021) — likely expired",\n'
        '    "Chapati (2025-03-30) — may be stale",\n'
        '    "Mineral Water (2025-03-30) — check for seal and expiry date"\n'
        "  ],\n"
        '  "health": "While your meals include thalis and fruits like bananas, consider adding more fresh vegetables and avoiding frequent alcohol purchases to maintain a balanced diet.",\n'
        '  "recipes": {\n'
        '    "recipe_name": "Banana-Chapati Pancakes",\n'
        '    "description": "Use ripe or leftover bananas and chapatis to create a nutritious, waste-free breakfast.",\n'
        '    "ingredients": [\n'
        '      "2 ripe bananas",\n'
        '      "2 chapatis (torn into small pieces)",\n'
        '      "1 egg or egg substitute",\n'
        '      "1/4 cup milk",\n'
        '      "1 tsp honey",\n'
        '      "Pinch of cinnamon"\n'
        "    ],\n"
        '    "instructions": [\n'
        '      "Mash the bananas in a bowl.",\n'
        '      "Add milk, egg, honey, and cinnamon. Mix well.",\n'
        '      "Add torn chapati pieces and let soak for 5 minutes.",\n'
        '      "Heat a pan and cook the mixture like pancakes on both sides.",\n'
        '      "Serve warm with yogurt or fruit."\n'
        "    ]\n"
        "  }\n"
        "}\n"
    )
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content([prompt, json.dumps(all_passes)])
        response_text = response.text
        if response_text and response_text.startswith("```json"):
            response_text = (
                response_text.strip().replace("```json", "").replace("```", "")
            )
        if response_text:
            try:
                insights = json.loads(response_text)
                # Add computed insights
                insights["weekly_spending_trend"] = weekly_trend
                insights["top_spending_category"] = top_category
                insights["monthly_budget_alert"] = budget_alert
                insights["spending_anomaly"] = anomaly
                return insights
            except Exception:
                return {
                    "error": "Model response was not valid JSON.",
                    "raw": response_text,
                }
        else:
            return {"error": "No response text received from the model."}
    except Exception as e:
        return {"error": f"Gemini API call failed: {str(e)}"}


# --- Flask route uses jsonify ---
@app.route("/api/data-insights", methods=["POST"])
def get_data_insights():
    """
    POST endpoint to analyze expenditure data using Gemini API and a custom prompt.
    """
    insights = generate_insights_data()
    if "error" in insights:
        return jsonify(insights), 500
    return jsonify(insights)

def send_wallet_notification(issuer_id, object_suffix, message):
    try:
        SERVICE_ACCOUNT_FILE_PATH = "gwallet_sa_keyfile.json"
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE_PATH,
            scopes=['https://www.googleapis.com/auth/wallet_object.issuer']
        )
        service = build('walletobjects', 'v1', credentials=creds)
        notification_body = {
            "objectId": f"{issuer_id}.{object_suffix}",
            "notification": {
                "title": "New Insights Available",
                "body": message
            }
        }
        # Send notification
        service.genericobject().addmessage(
            resourceId=f"{issuer_id}.{object_suffix}",
            body=notification_body
        ).execute()
        print(f"[WALLET NOTIFICATION] Sent for {issuer_id}.{object_suffix}")
    except Exception as e:
        print(f"[WALLET NOTIFICATION ERROR] {str(e)}")


# --- POST API to create individual insight passes ---
@app.route("/api/create-insight-pass", methods=["POST"])
def create_insight_pass():
    """
    Creates a Google Wallet generic pass for a single insight.
    Expects a JSON body with keys: type (e.g. 'expenditure', 'perishables', 'health', 'recipes'), description, and optional details.
    """
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"
    data = request.get_json(force=True)
    issuer_id = os.getenv("ISSUER_ID")
    class_suffix = "InsightClass"
    insight_type = data.get("type", "insight")
    description = data.get("description", "")
    details = data.get("details", {})
    # 1. Search for existing pass
    full_class_id = f"{issuer_id}.{class_suffix}"
    existing_passes = fetch_wallet_passes(full_class_id)
    for p in existing_passes:
        for tm in p.get("textModulesData", []):
            if (
                tm.get("header", "").lower() == insight_type.lower()
            ):
                # Found a matching pass, reuse it
                return jsonify({
                    "object_suffix": p.get("id", ""),
                    "class_suffix": class_suffix,
                    "object_data": p,
                    "reused": True
                })

    # 2. If not found, create new pass
    object_suffix = f"{insight_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    text_modules = [
        {
            "header": insight_type.capitalize(),
            "body": description,
            "id": f"{insight_type.upper()}_MODULE"
        }
    ]
    # Optionally add details (e.g. recipe, perishables, etc)
    if insight_type == "recipes" and details:
        recipe_body = f"{details.get('description', '')}\nIngredients: {', '.join(details.get('ingredients', []))}\nInstructions: {'; '.join(details.get('instructions', []))}"
        text_modules.append({
            "header": f"Recipe: {details.get('recipe_name', 'Suggestion')}",
            "body": recipe_body,
            "id": "RECIPE_MODULE"
        })
    elif insight_type == "perishables" and details:
        perishables_body = "\n".join([
            f"{item.get('item', item)} — {item.get('status', '')} {item.get('expiry', '')}" for item in details.get('items', [])
        ])
        text_modules.append({
            "header": "Perishables",
            "body": perishables_body,
            "id": "PERISHABLES_MODULE"
        })
    elif insight_type == "health" and details:
        text_modules.append({
            "header": "Health Tip",
            "body": details.get('tip', ''),
            "id": "HEALTH_MODULE"
        })

    # Ensure cardTitle is always present and non-empty
    card_title = insight_type.capitalize() if insight_type else "Insight"
    if not card_title:
        card_title = "Insight"

    object_data = {
        "id": f"{issuer_id}.{object_suffix}",
        "classId": f"{issuer_id}.{class_suffix}",
        "state": "ACTIVE",
        "cardTitle": {"defaultValue": {"language": "en-US", "value": card_title}},
        "header": {"defaultValue": {"language": "en-US", "value": description[:40] if description else card_title}},
        "hexBackgroundColor": "#4285f4",
        "logo": {
            "sourceUri": {
                "uri": "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg"
            },
            "contentDescription": {
                "defaultValue": {"language": "en-US", "value": "Generic card logo"}
            }
        },
        "barcode": {"type": "QR_CODE", "value": description if description else card_title},
        "textModulesData": text_modules
    }

    # Generate wallet link for the pass
    wallet_service = DemoGeneric()
    object_suffix = wallet_service.create_object(
        issuer_id, class_suffix, object_suffix, object_data
    )
    # If your wallet creation method requires object_data, pass it here
    # For now, keep the same API as before
    save_link = wallet_service.create_jwt_existing_objects(
        issuer_id, object_suffix, class_suffix)
    return jsonify({
        "saveUrl": save_link,
        "object_data": object_data,
        "object_suffix": object_suffix,
        "class_suffix": class_suffix,
        "reused": False
    })
if __name__ == "__main__":
    app.run(debug=True)
