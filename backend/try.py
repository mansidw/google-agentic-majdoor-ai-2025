from utils.demo_generic import DemoGeneric
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gwallet_sa_keyfile.json"

issuer_id = os.getenv("ISSUER_ID")
class_suffix = "GroceryClass"

# Seeder data for a single grocery receipt pass (no image field)
seeder_data = [
    {
        "class_suffix": "GroceryClass",
        "object_suffix": "grocery_summer_2025_001",
        "object_data": {
            "id": f"{issuer_id}.grocery_summer_2025_001",
            "classId": f"{issuer_id}.GroceryClass",
            "state": "ACTIVE",
            "textModulesData": [
                {
                    "header": "Store",
                    "body": "FreshMarket Delights",
                    "id": "MERCHANT_MODULE"
                },
                {
                    "header": "Date",
                    "body": "2025-07-26",
                    "id": "DATE_MODULE"
                },
                {
                    "header": "Items",
                    "body": "Strawberries, Blueberries, Corn, Watermelon, Tomatoes, Bell Peppers, Zucchini, Ice Cream, Hot Dogs",
                    "id": "ITEMS_MODULE"
                },
                {
                    "header": "Total",
                    "body": "USD 85.75",
                    "id": "TOTAL_MODULE"
                }
            ],
            "linksModuleData": {
                "uris": []
            },
            "barcode": { "type": "QR_CODE", "value": f"{issuer_id}.grocery_summer_2025_001" },
            "cardTitle": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "Grocery Receipt: FreshMarket"
                }
            },
            "header": {
                "defaultValue": { "language": "en-US", "value": "Summer Groceries" }
            },
            "hexBackgroundColor": "#F4B400"
        }
    },
    {
        "class_suffix": "GroceryClass",
        "object_suffix": "grocery_spring_2025_002",
        "object_data": {
            "id": f"{issuer_id}.grocery_spring_2025_002",
            "classId": f"{issuer_id}.GroceryClass",
            "state": "ACTIVE",
            "textModulesData": [
                {
                    "header": "Store",
                    "body": "GreenLeaf Organics",
                    "id": "MERCHANT_MODULE"
                },
                {
                    "header": "Date",
                    "body": "2025-07-15",
                    "id": "DATE_MODULE"
                },
                {
                    "header": "Items",
                    "body": "Spinach, Kale, Apples, Pears, Almond Milk, Granola",
                    "id": "ITEMS_MODULE"
                },
                {
                    "header": "Total",
                    "body": "USD 62.40",
                    "id": "TOTAL_MODULE"
                }
            ],
            "linksModuleData": {
                "uris": []
            },
            "barcode": { "type": "QR_CODE", "value": f"{issuer_id}.grocery_spring_2025_002" },
            "cardTitle": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "Grocery Receipt: GreenLeaf"
                }
            },
            "header": {
                "defaultValue": { "language": "en-US", "value": "Spring Groceries" }
            },
            "hexBackgroundColor": "#0F9D58"
        }
    },
    {
        "class_suffix": "GroceryClass",
        "object_suffix": "grocery_winter_2025_003",
        "object_data": {
            "id": f"{issuer_id}.grocery_winter_2025_003",
            "classId": f"{issuer_id}.GroceryClass",
            "state": "ACTIVE",
            "textModulesData": [
                {
                    "header": "Store",
                    "body": "SuperMart Central",
                    "id": "MERCHANT_MODULE"
                },
                {
                    "header": "Date",
                    "body": "2025-07-27",
                    "id": "DATE_MODULE"
                },
                {
                    "header": "Items",
                    "body": "Potatoes, Onions, Carrots, Broccoli, Chicken, Rice, Soup Mix",
                    "id": "ITEMS_MODULE"
                },
                {
                    "header": "Total",
                    "body": "USD 74.20",
                    "id": "TOTAL_MODULE"
                }
            ],
            "linksModuleData": {
                "uris": []
            },
            "barcode": { "type": "QR_CODE", "value": f"{issuer_id}.grocery_winter_2025_003" },
            "cardTitle": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "Grocery Receipt: SuperMart"
                }
            },
            "header": {
                "defaultValue": { "language": "en-US", "value": "Winter Groceries" }
            },
            "hexBackgroundColor": "#4285F4"
        }
    },
    {
        "class_suffix": "GroceryClass",
        "object_suffix": "grocery_autumn_2024_004",
        "object_data": {
            "id": f"{issuer_id}.grocery_autumn_2024_004",
            "classId": f"{issuer_id}.GroceryClass",
            "state": "ACTIVE",
            "textModulesData": [
                {
                    "header": "Store",
                    "body": "Harvest Foods",
                    "id": "MERCHANT_MODULE"
                },
                {
                    "header": "Date",
                    "body": "2024-10-05",
                    "id": "DATE_MODULE"
                },
                {
                    "header": "Items",
                    "body": "Pumpkin, Squash, Apples, Cinnamon, Bread, Butter",
                    "id": "ITEMS_MODULE"
                },
                {
                    "header": "Total",
                    "body": "USD 59.80",
                    "id": "TOTAL_MODULE"
                }
            ],
            "linksModuleData": {
                "uris": []
            },
            "barcode": { "type": "QR_CODE", "value": f"{issuer_id}.grocery_autumn_2024_004" },
            "cardTitle": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "Grocery Receipt: Harvest Foods"
                }
            },
            "header": {
                "defaultValue": { "language": "en-US", "value": "Autumn Groceries" }
            },
            "hexBackgroundColor": "#DB4437"
        }
    }
]

wallet_service = DemoGeneric()

for entry in seeder_data:
    object_suffix = entry["object_suffix"]
    object_data = entry["object_data"]
    class_suffix = entry["class_suffix"]
    created_object_suffix = wallet_service.create_object(
        issuer_id, class_suffix, object_suffix, object_data
    )
    save_link = wallet_service.create_jwt_existing_objects(
        issuer_id, created_object_suffix, class_suffix
    )
    print(f"Wallet object created: {created_object_suffix}")
    print(f"Add to Google Wallet link: {save_link}\n")