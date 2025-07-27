import React, { useState, useRef } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
const BACKEND_URL = `${backendUrl}/api/chat`;
const SESSION_ID = "mcp-session-84427bd6-fc37-48b1-96e9-14116c131fd5";

// Language configurations
const LANGUAGES = {
  en: { name: "English", code: "en-US", voice: "en-US" },
  hi: { name: "हिंदी", code: "hi-IN", voice: "hi-IN" },
};

const ChatbotSiri: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Extract pay.google.com link from response
  const extractGooglePayLink = (text: string): string | null => {
    const linkMatch = text.match(/(https?:\/\/pay\.google\.com[^\s]*)/);
    return linkMatch ? linkMatch[1] : null;
  };

  // Get available voices for the selected language
  const getVoiceForLanguage = (langCode: string) => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find((voice) => voice.lang.startsWith(langCode)) || voices[0];
  };

  // Start speech recognition
  const startListening = () => {
    setTranscript("");
    setResponse(null);
    setListening(true);
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      setListening(false);
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang =
      LANGUAGES[selectedLanguage as keyof typeof LANGUAGES].code;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      sendToBackend(text);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // Translate Hindi text to English (if needed)
  const translateToEnglish = async (
    text: string,
    sourceLanguage: string
  ): Promise<string> => {
    // If already in English, return as is
    if (sourceLanguage === "en") {
      return text;
    }

    // For Hindi, translate to English
    if (sourceLanguage === "hi") {
      try {
        // Using Google Translate API (you'll need to add your API key)
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=YOUR_GOOGLE_TRANSLATE_API_KEY`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: text,
              source: "hi",
              target: "en",
              format: "text",
            }),
          }
        );

        const data = await response.json();
        if (data.data && data.data.translations && data.data.translations[0]) {
          return data.data.translations[0].translatedText;
        }
      } catch (error) {
        console.warn("Translation failed, using original text:", error);
      }
    }

    // Fallback: return original text if translation fails
    return text;
  };

  // Send transcript to backend
  const sendToBackend = async (text: string) => {
    setLoading(true);
    try {
      // Translate to English before sending to backend
      const translatedText = await translateToEnglish(text, selectedLanguage);

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: SESSION_ID,
          query: translatedText, // Send translated English text
          original_language: selectedLanguage, // Keep track of original language
          original_text: text, // Keep original text for reference
        }),
      });
      const data = await res.json();

      // If offers are present, format them for display and voice
      if (data.offers && Array.isArray(data.offers) && data.offers.length > 0) {
        const offersText = data.offers
          .map(
            (offer: any, idx: number) =>
              `${idx + 1}. ${offer.vendor} (${offer.credit_card}): ${
                offer.offer
              }`
          )
          .join("\n");
        const prior_text =
          "Based on your requirements, Here are some offers I found \n";
        
        // Check if response contains pay.google.com link
        const fullResponse = prior_text + offersText;
        if (fullResponse.includes("pay.google.com")) {
          setResponse(fullResponse);
        } else {
          setResponse(null); // Don't render on screen
        }
        
        // Speak the offers
        speakOffers(data.offers);
      } else if (data.response) {
        // Check if response contains pay.google.com link
        if (data.response.includes("pay.google.com")) {
          setResponse(data.response);
        } else {
          setResponse(null); // Don't render on screen, only speak
        }
        speakText(data.response);
      } else {
        // Handle generic responses with language-specific fallbacks
        const fallbackResponses = {
          en: "I couldn't find any specific offers for your request. Please try asking about food, rides, or shopping.",
          hi: "मुझे आपके अनुरोध के लिए कोई विशिष्ट ऑफर नहीं मिला। कृपया भोजन, सवारी या खरीदारी के बारे में पूछने का प्रयास करें।",
        };
        const fallbackText =
          fallbackResponses[
            selectedLanguage as keyof typeof fallbackResponses
          ] || fallbackResponses.en;
        setResponse(null); // Don't render on screen, only speak
        speakText(fallbackText);
      }
    } catch (e) {
      const errorMessages = {
        en: "Sorry, there was an error contacting the backend. Please try again.",
        hi: "क्षमा करें, बैकएंड से संपर्क करने में त्रुटि हुई। कृपया पुनः प्रयास करें।",
      };
      const errorText =
        errorMessages[selectedLanguage as keyof typeof errorMessages] ||
        errorMessages.en;
      setResponse(errorText);
      speakText(errorText);
    }
    setLoading(false);
  };

  // Speak a summary of the offers
  const speakOffers = (offers: any[]) => {
    if (!window.speechSynthesis) return;

    // Create language-specific responses
    const responses = {
      en: `Based on your requirements, Here are some offers I found. ${offers
        .slice(0, 3)
        .map(
          (offer: any) =>
            `${offer.vendor} with your ${
              offer.credit_card
            }: ${offer.offer.replace(/\u20b9/g, "rupees ")}`
        )
        .join(". Next, ")}. Would you like to hear more?`,
      hi: `मैंने कुछ ऑफर पाए हैं। ${offers
        .slice(0, 3)
        .map(
          (offer: any) =>
            `${offer.vendor} आपके ${
              offer.credit_card
            } के साथ: ${offer.offer.replace(/\u20b9/g, "रुपये ")}`
        )
        .join(". अगला, ")}. क्या आप और सुनना चाहते हैं?`,
    };

    const utter = new window.SpeechSynthesisUtterance(
      responses[selectedLanguage as keyof typeof responses]
    );
    const voice = getVoiceForLanguage(
      LANGUAGES[selectedLanguage as keyof typeof LANGUAGES].voice
    );
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  };

  // Speak a generic text
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    const utter = new window.SpeechSynthesisUtterance(text);
    const voice = getVoiceForLanguage(
      LANGUAGES[selectedLanguage as keyof typeof LANGUAGES].voice
    );
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  };

  // Close modal and stop recognition
  const handleClose = () => {
    setOpen(false);
    setListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Stop any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Get language-specific prompts
  const getLanguagePrompt = () => {
    const prompts = {
      en: listening
        ? "Listening..."
        : transcript
        ? `You said: "${transcript}"`
        : "Tap to speak",
      hi: listening
        ? "सुन रहा हूं..."
        : transcript
        ? `आपने कहा: "${transcript}"`
        : "बोलने के लिए टैप करें",
    };
    return prompts[selectedLanguage as keyof typeof prompts];
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(startListening, 400);
        }}
        className="chatbot-button"
        style={{
          position: "fixed",
          right: 24,
          bottom: 104, // 24px base + 80px bottom nav height
          zIndex: 1000,
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #4f8cff, #a259ff)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Open Chatbot"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </button>

      {/* Fullscreen Modal */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30, 34, 44, 0.95)",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.3s",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: 32,
              right: 32,
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 32,
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            ×
          </button>

          {/* Language Selector */}
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            style={{
              position: "absolute",
              top: 32,
              left: 32,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 20,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {LANGUAGES[selectedLanguage as keyof typeof LANGUAGES].name} 🌐
          </button>

          {showLanguageSelector && (
            <div
              style={{
                position: "absolute",
                top: 70,
                left: 32,
                background: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: 8,
                zIndex: 2001,
              }}
            >
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedLanguage(code);
                    setShowLanguageSelector(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    background:
                      selectedLanguage === code
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                    border: "none",
                    color: "#fff",
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}

          {/* Siri-style animated listening effect */}
          <div style={{ marginBottom: 32 }}>
            <div className={`siri-wave ${listening ? "listening" : ""}`} />
          </div>

          <div style={{ color: "#fff", fontSize: 24, marginBottom: 16 }}>
            {getLanguagePrompt()}
          </div>

          {loading && (
            <div style={{ color: "#fff", fontSize: 18 }}>
              {selectedLanguage === "hi" ? "सोच रहा हूं..." : "Thinking..."}
            </div>
          )}
          {response && (
            <div
              style={{
                color: "#fff",
                fontSize: 20,
                marginTop: 24,
                whiteSpace: "pre-line",
                textAlign: "center",
              }}
            >
              {extractGooglePayLink(response) ? (
                <button
                  onClick={() => {
                    const link = extractGooglePayLink(response);
                    if (link) {
                      window.open(link, '_blank');
                    }
                  }}
                  style={{
                    background: "linear-gradient(135deg, #4285f4, #34a853)",
                    border: "none",
                    color: "#fff",
                    padding: "16px 32px",
                    borderRadius: 12,
                    fontSize: 18,
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(66, 133, 244, 0.3)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {selectedLanguage === "hi" ? "Google Pay में खोलें" : "Open in Google Pay"}
                </button>
              ) : (
                response
              )}
            </div>
          )}
        </div>
      )}

      {/* Siri Wave Animation Styles */}
      <style>{`
        .siri-wave {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle at 60% 40%, #a259ff 0%, #4f8cff 100%);
          box-shadow: 0 0 32px 8px #a259ff55;
          position: relative;
          animation: pulse 1.5s infinite;
        }
        .siri-wave.listening {
          animation: pulse 0.7s infinite alternate;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 32px 8px #a259ff55; }
          100% { transform: scale(1.15); box-shadow: 0 0 48px 16px #4f8cff88; }
        }
        
        /* Responsive positioning for ChatBot button */
        @media (max-width: 768px) {
          .chatbot-button {
            bottom: 104px !important; /* Above mobile bottom nav (80px + 24px margin) */
            right: 16px !important; /* Slightly closer to edge on mobile */
          }
        }
        
        @media (min-width: 769px) {
          .chatbot-button {
            bottom: 32px !important; /* Standard desktop positioning */
            right: 24px !important;
          }
        }
        
        /* Safe area support for devices with notches */
        @supports(padding: max(0px)) {
          @media (max-width: 768px) {
            .chatbot-button {
              bottom: max(104px, calc(80px + 24px + env(safe-area-inset-bottom))) !important;
              right: max(16px, env(safe-area-inset-right)) !important;
            }
          }
        }
      `}</style>
    </>
  );
};

export default ChatbotSiri;
