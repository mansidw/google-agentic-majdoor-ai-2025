## Team - Majdoor AI

# Raseed - Receipt Management for Google Wallet

_Your AI-powered receipt manager and financial co-pilot for Google Wallet._

### Deployed Fi MCP Server 
- *Google Cloud Run*
- https://fi-mcp-dev-1003659322950.asia-southeast1.run.app/mcp/stream


### Deployed Backend
- *Google Cloud Run*
- https://backend-1003659322950.asia-southeast1.run.app

### Deployed Frontend
- *Google Cloud Run*
- https://frontend-1003659322950.asia-southeast1.run.app

- *Vercel*
- https://google-agentic-majdoor-ai-2025-alpha.vercel.app/

## 🚀 The Problem
Despite living in a digital age, we still find ourselves juggling physical receipts, they fade, get lost, or pile up in drawers. Keeping track of expenses becomes a tedious, manual task. Even with digital receipts, there’s little insight unless we go digging. People miss out on the full potential of their purchase history, whether it's optimizing their spending or taking advantage of relevant offers.

## 💡 Our Solution: Raseed
Raseed (from the Hindi word for “receipt”) is your smart assistant for managing purchases. It integrates with Google Wallet and acts as both a receipt organizer and a personal finance advisor.

Raseed is built on the Google Agentic Majdoor AI 2025 platform—a hackathon-ready, extensible system designed to:
- Extract user intent from natural language (e.g., "I want to eat pizza", "Book a ride")
- Fetch real credit card data (via a mock Fi MCP server)
- Find and return relevant offers from vendors (Swiggy, Zomato, Uber, etc.) using Gemini AI or mocked logic
- Analyze receipts and more, with a beautiful, modern frontend

Think of it as your co-pilot for spending: it automatically captures receipt data, categorizes purchases, and even recommends the best credit cards to use for future savings based on your patterns. Users can request offers in plain English, and the backend extracts the intent and returns relevant deals. The system securely fetches (mock) user credit card info for personalized offers, dynamically maps intent to vendors (food, ride, shopping, etc.), and uses Google Gemini API for realistic, up-to-date offer generation.

Whether you’re trying to stick to a budget, maximize cashback, or just avoid losing another grocery bill, Raseed has your back. The platform is easily extensible—new intents, vendors, or LLM integrations can be added with minimal effort.

## 🛠️ Features

### Frontend (React + Vite + PWA)
- **Progressive Web App**: Installable, offline support, auto-updates, native-like experience.
- **Receipt Scanning & Analysis**: Upload receipts and get structured data (merchant, items, total, etc.).
- **Spending Dashboard**: Visualize and analyze your expenses.
- **AI Chatbot**: Get financial insights and recommendations.
- **Natural Language Offers**: Request offers in plain English; backend extracts intent and returns relevant deals.
- **Two-Factor Authentication**: Secure login and verification.
- **Notifications**: Real-time alerts and updates.
- **PWA Components**: Install prompt, update notifications, offline indicator, status card.
- **Modern Frontend**: Built with React, Vite, Tailwind CSS, and shadcn-ui.

### Backend (Python)
- **Google Wallet Integration**: Create and manage wallet passes.
- **Firestore Integration**: Store and retrieve user data.
- **Offer Recommendations**: AI-powered offers and insights.
- **Credit Card Integration**: Securely fetches (mock) user credit card info for personalized offers.
- **Vendor Matching**: Dynamically maps intent to vendors (food, ride, shopping, etc.).
- **LLM-Powered Offers**: Uses Google Gemini API for realistic, up-to-date offer generation.
- **REST API**: Connects frontend and backend securely.
- **Extensible Platform**: Easily add new intents, vendors, or LLM integrations.

## 🏃‍♂️ Project Structure

```
backend/
  app.py                  # Main backend API
  requirements.txt        # Python dependencies
  utils/                  # Helper modules for wallet, offers, etc.
frontend/
  src/                    # React source code
  public/                 # Static assets and icons
  package.json            # Frontend dependencies
  PWA_README.md           # PWA details and compliance
  PWA_IMPLEMENTATION.md   # PWA technical summary
```

## 🏃‍♂️ How to Clone and Run

### Prerequisites
- Node.js & npm (for frontend)
- Python 3.10+ (for backend)
- (Optional) Google Cloud credentials for wallet features

### Clone the Repository

```sh
git clone <YOUR_GIT_URL>
cd google-agentic-majdoor-ai-2025
```

### Frontend Setup

```sh
cd frontend
npm install
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

### Backend Setup

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py       # Start backend server
```

## PWA Installation (For Users)

- **Desktop**: Visit the app in Chrome/Edge/Safari, click the install icon in the address bar.
- **Mobile (iOS Safari)**: Tap share → Add to Home Screen.
- **Mobile (Android Chrome)**: Tap menu → Install app.

## Technologies Used

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn-ui, Workbox (PWA)
- Backend:
    - Server: Python + Flask (REST endpoints, Firestore triggers)
    - Auth: Firebase Authentication (email/password + OAuth)
    - Gemini API (multimodal OCR/NLP + insight generation)
    - Fi MCP Server (For Credit card Information + recent transactions)
    - Google Wallet API (pass creation, updates, push notifications)

## Future Enhancements

- Background sync for offline data entry
- Auto Sync across all the google products
