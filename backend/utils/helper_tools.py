import json
import os
import requests
import uuid
from dotenv import load_dotenv
import google.generativeai as genai
from utils.demo_generic import DemoGeneric
from utils.offers_utils import (
    extract_intent_from_request,
    extract_credit_cards,
    get_gemini_offers,
    get_session_id,
)
import random

load_dotenv()

# Config for fi-mcp-dev
FI_MCP_DEV_URL = os.getenv("FI_MCP_DEV_URL")  # Update this to your fi-mcp-dev URL

# client = genai.Client()  # Removed, not needed for generativeai
# In a real app, this data would come from Firestore or another database.
MOCK_INVENTORY = {
    "01": [
        {
            "item": "Tomatoes (1kg)",
            "purchase_date": "2025-07-24",
            "price": 60.00,
            "category": "Groceries",
        },
        {
            "item": "Milk (1L)",
            "purchase_date": "2025-07-25",
            "price": 55.00,
            "category": "Groceries",
        },
        {
            "item": "Chicken Breast (500g)",
            "purchase_date": "2025-07-24",
            "price": 250.00,
            "category": "Groceries",
        },
        {
            "item": "Onions (1kg)",
            "purchase_date": "2025-07-20",
            "price": 40.00,
            "category": "Groceries",
        },
        {
            "item": "Netflix Subscription",
            "purchase_date": "2025-07-05",
            "price": 649.00,
            "category": "Subscriptions",
        },
        {
            "item": "Spotify Premium",
            "purchase_date": "2025-07-10",
            "price": 129.00,
            "category": "Subscriptions",
        },
        {
            "item": "Dinner at Pizza Place",
            "purchase_date": "2025-07-18",
            "price": 850.00,
            "category": "Dining Out",
        },
        {
            "item": "T-Shirt from H&M",
            "purchase_date": "2025-07-15",
            "price": 999.00,
            "category": "Shopping",
        },
        {
            "item": "Electricity Bill",
            "purchase_date": "2025-07-08",
            "price": 1200.00,
            "category": "Utilities",
        },
        {
            "item": "Uber ride to work",
            "purchase_date": "2025-07-22",
            "price": 210.00,
            "category": "Transport",
        },
        {
            "item": "Weekly Groceries",
            "purchase_date": "2025-06-28",
            "price": 1800.00,
            "category": "Groceries",
        },
        {
            "item": "Netflix Subscription",
            "purchase_date": "2025-06-05",
            "price": 649.00,
            "category": "Subscriptions",
        },
        {
            "item": "Lunch with friends",
            "purchase_date": "2025-06-15",
            "price": 1500.00,
            "category": "Dining Out",
        },
        {
            "item": "Broadband Bill",
            "purchase_date": "2025-06-12",
            "price": 799.00,
            "category": "Utilities",
        },
    ]
}
# MOCK_INVENTORY = {
#     "01": [
#         {
#             "item": "Tomatoes",
#             "purchase_date": "2025-07-24",
#             "price": 2.50,
#             "category": "Groceries",
#         },
#         {
#             "item": "Milk (1L)",
#             "purchase_date": "2025-07-01",
#             "price": 1.50,
#             "category": "Groceries",
#         },
#         {
#             "item": "Chicken Breast",
#             "purchase_date": "2025-07-24",
#             "price": 8.00,
#             "category": "Groceries",
#         },
#         {
#             "item": "Onions",
#             "purchase_date": "2025-07-20",
#             "price": 1.00,
#             "category": "Groceries",
#         },
#         {
#             "item": "Netflix Subscription",
#             "purchase_date": "2025-07-01",
#             "price": 15.00,
#             "category": "Subscriptions",
#         },
#     ]
# }

# --------------------------------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------------------------------


def create_wallet_object_and_link(
    shopping_list_json: str,
    user_id: str,
    class_suffix: str = "shopping_list_class",
    object_suffix: str = None,
) -> str:
    """
    Helper function that creates a wallet object and generates a save link.
    Combines the functionality of create_wallet_object and get_wallet_link endpoints.
    """
    try:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"
        wallet_service = DemoGeneric()
        issuer_id = os.getenv("ISSUER_ID")

        if not issuer_id:
            return "Error: ISSUER_ID not configured on server."

        # Generate object_suffix if not provided
        if not object_suffix:
            import datetime

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            object_suffix = f"shopping_list_{random.randint(10, 99)}_{timestamp}"

        # Parse shopping list to create wallet object data
        try:
            shopping_items = json.loads(shopping_list_json)
            if isinstance(shopping_items, str):
                shopping_items = [shopping_items]
        except:
            shopping_items = [shopping_list_json]

        # Create wallet object data
        object_data = {
            "state": "ACTIVE",
            "cardTitle": {
                "defaultValue": {
                    "language": "en-US",
                    "value": f"Shopping List - {random.randint(10, 99)}",
                }
            },
            "header": {
                "defaultValue": {"language": "en-US", "value": "Your Shopping List"}
            },
            "textModulesData": [
                {
                    "header": "Items to Buy",
                    "body": (
                        ", ".join(shopping_items)
                        if isinstance(shopping_items, list)
                        else str(shopping_items)
                    ),
                    "id": "SHOPPING_ITEMS",
                }
            ],
            "hexBackgroundColor": "#4285f4",
        }

        # Create the wallet object
        object_name = wallet_service.create_object(
            issuer_id, class_suffix, object_suffix, object_data
        )

        if not object_name:
            return "Error: Failed to create wallet object."

        save_link = wallet_service.create_jwt_existing_objects(
            issuer_id, object_name, class_suffix
        )

        if save_link:
            print(f"🔗 Generated shopping list wallet pass: {save_link}")
            return save_link
        else:
            return "Error: Failed to generate wallet link."

    except Exception as e:
        print(f"Error creating wallet object and link: {str(e)}")
        return f"Error: {str(e)}"


# --------------------------------------------------------------------------
# AGENT TOOL DEFINITIONS
# --------------------------------------------------------------------------


def get_grocery_inventory(user_id: str) -> str:
    """
    Retrieves the list of all grocery items for a given user from the database.
    This tool should be called first to know what food is available.
    The user_id is a unique identifier for the user.
    """
    user_id = "01"
    print(f"Tool: get_grocery_inventory called for user: {user_id}")
    inventory = MOCK_INVENTORY.get(user_id, [])
    return json.dumps(inventory)


def identify_perishable_items(inventory_json: str) -> str:
    """
    Takes a JSON string of inventory items and their purchase dates.
    It estimates the expiry date for each item and returns a new JSON string
    of the items sorted by which will expire soonest (descending order of perishability).
    Use this tool to find out what food needs to be used first.
    """
    print("Tool: identify_perishable_items called.")
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    prompt = f"""
    You are a food science expert. Based on the following list of grocery items and their purchase dates,
    estimate a reasonable expiry date for each. Assume today's date is July 26, 2025.
    Then, return a JSON array of these items, sorted with the most perishable items (closest expiry date) first.

    The JSON output should be an array of objects, each with 'item', 'purchase_date', and 'estimated_expiry' fields.
    Do not include any explanation, just the JSON.

    Inventory Data:
    {inventory_json}
    """
    response = model.generate_content(prompt)
    print(f"Perishables identified: {response.text}")
    return response.text


def create_recipe_from_ingredients(
    perishable_items_json: str, user_preferences: str = "any"
) -> str:
    """
    Creates a recipe suggestion based on a JSON string of perishable ingredients.
    It prioritizes using the ingredients at the top of the list.
    Optionally considers user preferences like 'vegetarian', 'quick meal', or 'indian style'.
    """
    print(
        f"Tool: create_recipe_from_ingredients called with preferences: {user_preferences}"
    )
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    prompt = f"""
    You are a creative chef. Your goal is to suggest a single, delicious recipe to prevent food waste.
    The user has the following ingredients that are about to expire, listed in order of priority:
    {perishable_items_json}

    The user's preference for the meal is: {user_preferences}.

    Please provide a recipe that uses as many of the top ingredients as possible.
    Structure your response as a JSON object with the keys "recipe_name", "description", "ingredients", and "instructions".
    The "ingredients" should be an array of strings, and "instructions" should be an array of strings.
    Do not include any explanation, just the JSON.
    """
    response = model.generate_content(prompt)
    print(f"Recipe created: {response.text}")
    return response.text


# def generate_shopping_list(
#     recipe_ingredients_json: str, current_inventory_json: str
# ) -> str:
#     """Compares a recipe's ingredients against current inventory to create a shopping list of missing items."""
#     print("Tool: generate_shopping_list called.")
#     model = genai.GenerativeModel("gemini-1.5-pro-latest")
#     prompt = f"Here is a recipe's ingredients: {recipe_ingredients_json}. Here is the user's current inventory: {current_inventory_json}. Return a JSON array of strings listing only the items the user needs to buy."
#     response = model.generate_content(prompt)
#     return response.text
def generate_shopping_list(dish_name: str, current_inventory_json: str) -> str:
    """
    Determines the necessary ingredients for a given dish and compares it against
    the user's current inventory to create a shopping list of missing items.
    """
    print(f"Tool: generate_shopping_list called for dish: {dish_name}")
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    # This prompt is now more direct to get a clean list.
    prompt = f"List the essential ingredients to cook {dish_name}. Then, compare that list with the user's current inventory provided below. Return ONLY a valid JSON array of strings listing the items the user needs to buy. Do not include any explanation.\n\nInventory: {current_inventory_json}.\n\n In the end also ask the user if he/she wants to add this list as a pass in theor google wallet"
    response = model.generate_content(prompt)
    print(f"Generated shopping list: {response.text}")
    return response.text


def create_shopping_list_wallet_pass(shopping_list_json: str, user_id: str) -> str:
    """Takes a shopping list and creates a Google Wallet pass, returning the secure 'save' link."""
    print("Tool: create_shopping_list_wallet_pass called.")

    # Use the helper function to create wallet object and generate link
    return create_wallet_object_and_link(shopping_list_json, user_id)


def get_credit_card_offers(user_request: str, user_id: str) -> str:
    """
    Analyzes a user's natural language request and returns relevant credit card offers.
    This tool extracts intent from the request, fetches credit card information, and generates personalized offers.
    """
    print(f"Tool: get_credit_card_offers called for user: {user_id}")

    try:
        # Extract intent from user request
        intent = extract_intent_from_request(user_request)
        print(f"Extracted intent: {intent}")

        # Get session ID for fi-mcp-dev
        # session_id = get_session_id()

        # Get credit card info from fi-mcp-dev
        headers = {
            "Content-Type": "application/json",
            "Mcp-Session-Id": "mcp-session-84427bd6-fc37-48b1-96e9-14116c131fd5",
        }
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "fetch_credit_report", "arguments": {}},
        }

        print("in payload here - ", payload)

        # Call fi-mcp-dev
        resp = requests.post(
            FI_MCP_DEV_URL + "/mcp/stream", headers=headers, json=payload
        )
        print("response status code - ", resp)
        if resp.status_code != 200:
            return json.dumps(
                {
                    "error": "Failed to contact fi-mcp-dev",
                    "message": "Unable to fetch credit card information",
                }
            )

        data = resp.json()
        print(f"FI-MCP response: {data}")

        # Check for login_url in response
        login_url = None
        if isinstance(data, dict) and "result" in data and "content" in data["result"]:
            for item in data["result"]["content"]:
                if item.get("type") == "text":
                    try:
                        text_data = json.loads(item["text"])
                        if "login_url" in text_data:
                            login_url = text_data["login_url"]
                            break
                    except Exception:
                        pass

        if login_url:
            return json.dumps(
                {
                    "error": "User needs to login to fi-mcp-dev first",
                    "login_url": login_url,
                    "session_id": "mcp-session-84427bd6-fc37-48b1-96e9-14116c131fd5",
                    "message": "Please login to access your credit card offers",
                }
            )

        # Extract credit card info
        credit_cards = extract_credit_cards(data)
        print(f"Extracted credit cards: {credit_cards}")

        if not credit_cards:
            return json.dumps(
                {
                    "message": "No credit cards found in your profile",
                    "intent": intent,
                    "user_request": user_request,
                }
            )

        # Get offers using Gemini
        offers = get_gemini_offers(credit_cards, intent)

        return json.dumps(
            {
                "offers": offers,
                "session_id": "mcp-session-84427bd6-fc37-48b1-96e9-14116c131fd5",
                "intent": intent,
                "user_request": user_request,
                "credit_cards": credit_cards,
            }
        )

    except Exception as e:
        print(f"Error in get_credit_card_offers: {str(e)}")
        return json.dumps(
            {"error": "Failed to process credit card offers request", "message": str(e)}
        )


def get_spending_data(user_id: str, time_period: str, category: str = "all") -> str:
    """Retrieves a user's transaction history from the database, filtered by a time period (e.g., 'last month', 'last 2 weeks') and category (e.g., 'groceries', 'all')."""
    print(
        f"Tool: get_spending_data called for user {user_id}, period {time_period}, category {category}"
    )
    # In a real app, you'd parse the time_period and filter the database query.
    # For this demo, we'll return all data and let the next agent filter it.
    transactions = MOCK_INVENTORY.get(user_id, [])
    return json.dumps(transactions)


def analyze_spending_and_suggest_savings(spending_data_json: str) -> str:
    """Analyzes a JSON of transaction data and provides a summary and actionable savings suggestions."""
    print("Tool: analyze_spending_and_suggest_savings called.")
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    prompt = f"You are a friendly financial advisor. Analyze the following JSON of a user's spending. Provide a brief summary of their total spending and then offer 2-3 clear, actionable tips for how they could save money based on these specific transactions. Address the user directly.\n\nSpending Data:\n{spending_data_json}"
    response = model.generate_content(prompt)
    return response.text
