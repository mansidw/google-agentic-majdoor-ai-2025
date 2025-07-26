from flask import Flask, request, jsonify
import requests
import uuid
import google.generativeai as genai
import json
import os

app = Flask(__name__)

# Config for fi-mcp-dev

# For demo, use a fixed or random session id per user/session
def get_session_id():
    # In production, use a real session/user id
    return "mcp-session-" + str(uuid.uuid4())

def extract_intent_from_request(user_request):
    """
    Extract the intent/item from natural language request.
    Examples:
    - "i want to eat pizza" -> "pizza"
    - "i want to book a ride" -> "ride"
    - "i need to order food" -> "food"
    """
    request_lower = user_request.lower()
    
    # Define intent patterns
    intent_patterns = {
        "pizza": ["pizza", "pizzeria"],
        "ride": ["ride", "uber", "ola", "taxi", "cab", "transport"],
        "food": ["food", "eat", "dinner", "lunch", "breakfast", "meal"],
        "shopping": ["shop", "buy", "purchase", "clothes", "electronics"],
        "hotel": ["hotel", "stay", "accommodation", "room", "booking"],
        "movie": ["movie", "cinema", "theatre", "watch", "entertainment"],
        "flight": ["flight", "airline", "travel", "ticket", "booking"]
    }
    
    # Find matching intent
    for intent, keywords in intent_patterns.items():
        for keyword in keywords:
            if keyword in request_lower:
                return intent
    
    # Default to food if no specific intent found
    return "food"

def get_vendors_for_intent(intent):
    """
    Return relevant vendors based on the extracted intent.
    """
    vendor_mapping = {
        "pizza": ["Swiggy", "Zomato", "Domino's", "Pizza Hut"],
        "ride": ["Uber", "Ola", "Rapido", "Meru"],
        "food": ["Swiggy", "Zomato", "Dunzo", "Foodpanda"],
        "shopping": ["Amazon", "Flipkart", "Myntra", "Ajio"],
        "hotel": ["Booking.com", "MakeMyTrip", "Goibibo", "OYO"],
        "movie": ["BookMyShow", "Paytm", "Amazon Prime", "Netflix"],
        "flight": ["MakeMyTrip", "Goibibo", "Cleartrip", "Yatra"]
    }
    return vendor_mapping.get(intent, ["Swiggy", "Zomato"])

def get_mocked_offers(credit_cards, intent):
    """
    Generate mocked offers based on credit cards and intent.
    """
    vendors = get_vendors_for_intent(intent)
    offers = []
    
    for card in credit_cards:
        for vendor in vendors[:2]:  # Limit to 2 vendors per card
            if "HDFC" in card:
                offers.append({
                    "vendor": vendor,
                    "credit_card": card,
                    "offer": f"20% off on {intent} orders above ₹500"
                })
            elif "ICICI" in card:
                offers.append({
                    "vendor": vendor,
                    "credit_card": card,
                    "offer": f"15% off on all {intent} orders"
                })
            else:
                offers.append({
                    "vendor": vendor,
                    "credit_card": card,
                    "offer": f"10% off on {intent} orders"
                })
    return offers

def get_gemini_offers(credit_cards, intent):
    """
    Uses Gemini API to generate offers for the given credit cards and intent.
    """
    import os
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return get_mocked_offers(credit_cards, intent)
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')

    cards_str = ", ".join(credit_cards)
    vendors = get_vendors_for_intent(intent)
    vendors_str = ", ".join(vendors)
    
    prompt = f"""
    You are an expert in Indian credit card offers and {intent} services.
    Given these credit cards: {cards_str}
    And these relevant vendors: {vendors_str}

    Generate realistic, current {intent} offers for these cards on the mentioned platforms.

    Respond ONLY with a valid JSON array. Do not include any other text, explanations, or markdown formatting like ```json.

    The JSON array must have objects with this structure:
    [
    {{
        "vendor": "string (one of the mentioned vendors)",
        "credit_card": "string (the card name)",
        "offer": "string (the offer details)"
    }}
    ]

    Make offers realistic and varied. If there are no offers for a card, do not include it in the array.
    """

    try:
        response = model.generate_content(prompt)
        print("\n\n\n\n\n")
        print(response)
        # Remove markdown if present
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(response_text)
    except Exception as e:
        print(f"Error with Gemini API: {e}")
        return get_mocked_offers(credit_cards, intent)

def extract_credit_cards(fi_mcp_response):
    # Navigate to the nested JSON string
    try:
        # Find the text field containing the JSON string
        content = fi_mcp_response.get("result", {}).get("content", [])
        for item in content:
            if item.get("type") == "text":
                import json as pyjson
                credit_report_json = pyjson.loads(item["text"])
                cards = []
                reports = credit_report_json.get("creditReports", [])
                for report in reports:
                    details = report.get("creditReportData", {}).get("creditAccount", {}).get("creditAccountDetails", [])
                    for acc in details:
                        # Use accountType to filter for credit cards (commonly '01', '03', '10')
                        acct_type = acc.get("accountType")
                        name = acc.get("subscriberName", "Unknown Bank")
                        # You can refine this filter as needed
                        if acct_type in ("01", "03", "10"):  # 01: Credit Card, 03: Credit Card, 10: Credit Card
                            cards.append(f"{name} Credit Card")
                return cards
    except Exception as e:
        print("Error extracting credit cards:", e)
    return []