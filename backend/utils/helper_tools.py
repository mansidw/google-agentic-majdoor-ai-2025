import json
import google.generativeai as genai

# client = genai.Client()  # Removed, not needed for generativeai


# --------------------------------------------------------------------------
# AGENT TOOL 1: Get Grocery Inventory
# --------------------------------------------------------------------------
def get_grocery_inventory(user_id: str) -> str:
    """
    Retrieves the list of all grocery items for a given user from the database.
    This tool should be called first to know what food is available.
    The user_id is a unique identifier for the app user.
    """
    print(f"Tool: get_grocery_inventory called for user: {user_id}")

    # --- MOCK DATABASE QUERY ---
    # In a real application, you would query your Firestore database here.
    # The data would have been saved from previous receipt scans.
    #
    # Example Firestore query:
    # docs = db.collection(f'users/{user_id}/groceries').stream()
    # items = [{'item': doc.id, 'purchase_date': doc.get('purchaseDate')} for doc in docs]
    #
    # For this demo, we will use mock data.
    mock_items = [
        {"item": "Tomatoes", "purchase_date": "2025-07-24"},
        {"item": "Milk (1L)", "purchase_date": "2025-07-25"},
        {"item": "Chicken Breast", "purchase_date": "2025-07-24"},
        {"item": "Onions", "purchase_date": "2025-07-20"},
        {"item": "Basmati Rice", "purchase_date": "2025-06-15"},
        {"item": "Paneer", "purchase_date": "2025-07-25"},
    ]
    print(f"Found mock items: {mock_items}")
    return json.dumps(mock_items)


# --------------------------------------------------------------------------
# AGENT TOOL 2: Identify Perishable Items
# --------------------------------------------------------------------------
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


# --------------------------------------------------------------------------
# AGENT TOOL 3: Create a Recipe
# --------------------------------------------------------------------------
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
