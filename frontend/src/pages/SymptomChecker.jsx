import React, { useState, useEffect, useRef } from "react";

const API_ENDPOINT = "http://localhost:5000/api/symptom-checker";

const SymptomChecker = ({ onClose }) => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // NEW: State for selected language, default to English
  const [selectedLanguage, setSelectedLanguage] = useState("en-US"); 

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Speech Recognition based on selectedLanguage
  useEffect(() => {
    if (SpeechRecognition) { // Only proceed if SpeechRecognition is supported
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        // Event listeners for recognition
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
        };
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
      // CRITICAL: Update lang property whenever selectedLanguage changes
      recognitionRef.current.lang = selectedLanguage; 
    }
  }, [SpeechRecognition, selectedLanguage]); // Depend on selectedLanguage

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = async (base64Audio) => {
    if (!base64Audio) {
      console.warn("No speech data received for playback.");
      return;
    }

    let audioContext = null;
    try {
      const base64String = base64Audio.includes(",")
        ? base64Audio.split(",")[1]
        : base64Audio;

      const binaryString = atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        if (audioContext) audioContext.close();
      };
      source.start(0);
      console.log("Audio playback started successfully.");
    } catch (e) {
      console.error("Error decoding or playing audio:", e);
    }
  };

  const analyzeSymptoms = async (userSymptomDescription) => {
    if (!userSymptomDescription.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please describe your symptoms." },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userSymptomDescription },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptom_description: userSymptomDescription,
          // CRITICAL: Send the selected language code to the backend
          language_code: selectedLanguage.split('-')[0] // Use e.g., "en" from "en-US"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantText = data.result || "No response text provided.";
        const assistantSpeechData = data.speech_data || null;
        const assistantMessage = data.message || "No additional message.";
        const isValidBase64 = data.isValidbase64 === true;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantText },
        ]);

        if (assistantMessage && assistantMessage !== "Audio generated successfully.") {
             console.warn("Backend message:", assistantMessage);
        }
        if (!isValidBase64) {
          console.warn("Backend indicated invalid base64 audio coding.");
        }

        if (assistantSpeechData && isValidBase64) {
          speakText(assistantSpeechData);
        } else {
          console.warn("No valid speech data received from backend, or base64 indicated invalid.");
        }
      } else {
        console.error("Backend error response:", data);
        const errMsg = data.error || "An unknown error occurred on the server.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errMsg}` },
        ]);
      }
    } catch (error) {
      console.error("Network or parsing error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setInputText("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    analyzeSymptoms(inputText);
  };

  // Define some common languages/locales supported by Web Speech API
  const languageOptions = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "kn-IN", name: "Kannada (India)" }, // ISO 639-1 code for Kannada
    { code: "hi-IN", name: "Hindi (India)" },
    { code: "te-IN", name: "Telugu (India)" },
    { code: "ta-IN", name: "Tamil (India)" },
    // Add more as needed, check Web Speech API browser compatibility
  ];

  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="symptom-checker-title"
    >
      <div style={styles.modal}>
        <h2 id="symptom-checker-title" style={styles.title}>
          🩺 Symptom Checker
        </h2>
        <button
          onClick={onClose}
          style={styles.closeBtn}
          aria-label="Close Symptom Checker"
          type="button"
        >
          ✖
        </button>

        {/* NEW: Language Selector */}
        <div style={styles.languageSelector}>
          <label htmlFor="language-select" style={styles.label}>Input Language:</label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isLoading || isListening}
            style={styles.select}
          >
            {languageOptions.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={styles.chatBox}
          aria-live="polite"
          aria-atomic="false"
          tabIndex={0}
        >
          {messages.length === 0 && (
            <div style={styles.initialMessage}>
              Describe your symptoms and get advice here.
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.chatMessage,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? "#1e90ff" : "#dff9fb",
                color: msg.role === "user" ? "white" : "#130f40",
              }}
              aria-label={msg.role === "user" ? "User message" : "AI response"}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div
              style={{
                ...styles.chatMessage,
                alignSelf: "flex-start",
                fontStyle: "italic",
              }}
            >
              AI is typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            aria-label="Enter your symptoms"
            placeholder="Describe your symptoms here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            style={styles.textarea}
            disabled={isLoading}
          />

          <div style={styles.buttonsRow}>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              style={{
                ...styles.button,
                backgroundColor: isListening ? "#ff4d4d" : "#1e90ff",
              }}
              aria-pressed={isListening}
              disabled={isLoading}
            >
              {isListening ? "Stop Listening 🎙️" : "Speak Symptoms 🎤"}
            </button>

            <button
              type="submit"
              style={styles.button}
              disabled={isLoading || !inputText.trim()}
            >
              Check Symptoms
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "30px",
    width: "100%",
    maxWidth: "600px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
    position: "relative",
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "80vh",
  },
  title: {
    margin: "0 0 20px 0",
    fontWeight: "700",
    color: "#0b3c5d",
  },
  closeBtn: {
    position: "absolute",
    top: "20px",
    right: "20px",
    background: "transparent",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#0b3c5d",
  },
  languageSelector: { // NEW STYLE
    marginBottom: "15px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  label: { // NEW STYLE
    color: "#0b3c5d",
    fontSize: "1rem",
    fontWeight: "600",
  },
  select: { // NEW STYLE
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#f8f9fa",
  },
  chatBox: {
    flexGrow: 1,
    overflowY: "auto",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "14px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "#f8f9fa",
  },
  chatMessage: {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: "16px",
    fontSize: "1rem",
    whiteSpace: "pre-wrap",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  initialMessage: {
    fontStyle: "italic",
    color: "#666",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  textarea: {
    fontSize: "1rem",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    resize: "vertical",
    fontFamily: "'Poppins', sans-serif",
  },
  buttonsRow: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
  },
  button: {
    backgroundColor: "#1e90ff",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: "600",
    transition: "background-color 0.3s ease",
    outlineOffset: "3px",
  },
};

export default SymptomChecker;