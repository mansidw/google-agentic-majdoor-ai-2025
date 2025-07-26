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

# Mocked vendor offers
def get_mocked_offers(credit_cards):
    offers = []
    for card in credit_cards:
        # Mock: if card contains 'HDFC', return a Swiggy offer
        if "HDFC" in card:
            offers.append({
                "vendor": "Swiggy",
                "credit_card": card,
                "offer": "20% off on orders above ₹500"
            })
        # Mock: if card contains 'ICICI', return a Zomato offer
        if "ICICI" in card:
            offers.append({
                "vendor": "Zomato",
                "credit_card": card,
                "offer": "15% off on all food orders"
            })
    return offers

def get_gemini_offers(credit_cards):
    """
    Uses Gemini API to generate offers for the given credit cards.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return get_mocked_offers(credit_cards)
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')

    cards_str = ", ".join(credit_cards)
    prompt = f"""
        You are an expert in Indian credit card offers and pizza delivery platforms.
        Given these credit cards: {cards_str}
        Generate realistic, current pizza delivery offers for these cards on platforms like Swiggy, Zomato, and Domino's.

        Respond ONLY with a valid JSON array. Do not include any other text, explanations, or markdown formatting like ```json.

        The JSON array must have objects with this structure:
        [
        {{
            "vendor": "string (e.g., Swiggy, Zomato, Domino's)",
            "credit_card": "string (the card name)",
            "offer": "string (the offer details)"
        }}
        ]
        If there are no offers for a card, do not include it in the array.
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
        return get_mocked_offers(credit_cards)


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