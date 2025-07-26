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
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
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

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "majdoor_ai_sa_firestore.json"
os.environ["GOOGLE_API_KEY"] = str(os.getenv("GOOGLE_API_KEY"))
credentials = service_account.Credentials.from_service_account_file(
    "majdoor_ai_sa_firestore.json"
)
db = firestore.Client(
    database="chat", credentials=credentials, project="global-impulse-467107-j6"
)
app = Flask(__name__)
CORS(app, supports_credentials=True)


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
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"
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


@app.route("/api/chat", methods=["POST"])
def chat():
    """The main chat endpoint for the frontend to call."""
    data = request.json
    query = data.get("query")
    user_id = data.get("userId")

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


if __name__ == "__main__":
    app.run(debug=True)
