import requests
import os

# Define merchant keywords by category
CATEGORY_KEYWORDS = {
    "food": ["swiggy", "zomato", "starbucks", "pizza", "mc donald"],
    "groceries": ["bigbasket", "reliance fresh", "dmart"],
    "fuel": ["indianoil", "hpcl", "bharat petroleum"],
    "travel": ["irctc", "uber", "ola", "makemytrip", "goibibo"],
    "shopping": ["amazon", "flipkart", "myntra", "ajio"],
    "entertainment": ["netflix", "spotify", "prime", "bookmyshow"],
    "utilities": ["act fibernet", "airtel", "bescom"],
}

# Map top spending category to recommended credit cards
CARD_RECOMMENDATIONS = {
    "food": ["HDFC Diners Club Privilege",
             "ICICI Sapphiro",
             "Axis Ace"],
    "groceries": ["HDFC MoneyBack",
                  "ICICI Platinum Debit"],
    "fuel": ["IndianOil Citi Platinum",
             "Bharat Petroleum SBI Card"],
    "travel": ["HDFC Infinia",
               "Axis Magnus",
               "SBI Card Elite"],
    "shopping": ["Amazon Pay ICICI",
                 "Flipkart Axis",
                 "HDFC Millennia"],
    "entertainment": ["BookMyShow SBI Card",
                       "HDFC Movie",
                       "ICICI Coral"],
    "utilities": ["HDFC EasyEMI",
                   "ICICI Platinum"],
}

FI_MCP_DEV_URL = os.getenv("FI_MCP_DEV_URL", "http://localhost:8080/mcp/stream")


def fetch_bank_transactions(session_id):
    """
    Calls fi-mcp-dev fetch_bank_transactions and returns the parsed JSON.
    """
    headers = {
        "Content-Type": "application/json",
        "Mcp-Session-Id": session_id
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "fetch_bank_transactions", "arguments": {}}
    }
    resp = requests.post(FI_MCP_DEV_URL, headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()
    # Extract the actual transactions list
    # Assuming data['result']['bankTransactions']
    return data.get('result', {}).get('bankTransactions', [])


def categorize_spending(bank_transactions):
    """
    Categorize each transaction and aggregate total spend per category.
    Returns a dict: {category: total_debit_amount}
    """
    spend = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for account in bank_transactions:
        for txn in account.get('txns', []):
            amount = float(txn[0])
            narration = txn[1].lower()
            txn_type = int(txn[3])
            if txn_type != 2 and amount > 0:
                # Positive value -> credit or interest; we skip
                continue
            debit_amount = abs(amount)
            matched = False
            for category, keywords in CATEGORY_KEYWORDS.items():
                if any(k in narration for k in keywords):
                    spend[category] += debit_amount
                    matched = True
                    break
            if not matched:
                # categorize uncategorized spending under 'others'
                spend.setdefault('others', 0)
                spend['others'] += debit_amount
    return spend


def recommend_cards_by_spend(spend_dict):
    """
    Recommend credit cards based on highest spend category.
    """
    # Find category with max spend
    if not spend_dict:
        return []
    top_category = max(spend_dict.items(), key=lambda x: x[1])[0]
    # Fetch recommendations
    return top_category, CARD_RECOMMENDATIONS.get(top_category, [])


def get_card_recommendations(session_id):
    """
    Full pipeline: fetch txns, categorize spend, recommend cards.
    Returns list of card names.
    """
    transactions = fetch_bank_transactions(session_id)
    spend = categorize_spending(transactions)
    return recommend_cards_by_spend(spend)
