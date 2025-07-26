import React, { useState, useEffect } from "react";

// Extend the window interface for speech recognition
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Type for chat history (adjust as per your backend response structure)
type ChatHistoryItem = string; // Change to an object if your history is more complex

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = "en-IN"; // Can be changed to 'hi-IN', etc.
recognition.interimResults = false;

function VoiceAssistant() {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [responseText, setResponseText] = useState<string>("");

  const handleListen = () => {
    setIsListening(true);
    recognition.start();
  };

  const handleStop = () => {
    recognition.stop();
    setIsListening(false);
  };

  useEffect(() => {
    recognition.onresult = async (event: any) => {
      const userQuery = event.results[0][0].transcript;
      console.log(userQuery);
      //   setIsListening(false);

      //   // Send the query and history to your Flask backend
      //   const res = await fetch("http://localhost:5000/api/chat", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       query: userQuery,
      //       history: chatHistory,
      //       userId: "demo-user-001",
      //     }),
      //   });
      //   const data = await res.json();

      //   // Update state and speak the response
      //   setChatHistory(data.history);
      //   setResponseText(data.response);
      //   speak(data.response);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };
  }, [chatHistory]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // You can add logic here to select different voices/languages
    speechSynthesis.speak(utterance);
  };

  // UI rendering would go here...
  return (
    <div>
      <button onClick={handleListen} disabled={isListening}>
        {isListening ? "Listening..." : "Start Listening"}
      </button>
      <button onClick={handleStop} disabled={!isListening}>
        Stop Listening
      </button>
      {/* Render chat history and responses here */}
    </div>
  );
}

export default VoiceAssistant;
