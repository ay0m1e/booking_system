import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./Assistant.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const msgIdRef = useRef(0);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const addMessage = (message) => {
    const id = `msg-${msgIdRef.current++}`;
    setMessages((prev) => [...prev, { ...message, id }]);
    return id;
  };

  // Reuse the same token lookup logic used in booking so assistant requests carry auth when available.
  const tokenKeyHints = [
    "ms_token",
    "token",
    "maneAuthToken",
    "maneToken",
    "bookingToken",
    "authToken",
    "jwt",
    "accessToken",
  ];

  function getStoredToken() {
    const stores = [localStorage, sessionStorage].filter(Boolean);

    // First, check known keys in order so we don't pick an old/stale token.
    for (const store of stores) {
      for (const key of tokenKeyHints) {
        const val = store.getItem(key);
        if (val) return val;
      }
    }

    // Fallback: any key containing "token".
    for (const store of stores) {
      for (let idx = 0; idx < store.length; idx += 1) {
        const keyName = store.key(idx);
        if (keyName && keyName.toLowerCase().includes("token")) {
          const value = store.getItem(keyName);
          if (value) return value;
        }
      }
    }

    return "";
  }

  async function sendToAssistant(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage({ role: "user", content: trimmed });
    setInput("");
    setLoading(true);

    try {
      const payload = { query: trimmed };
      if (sessionId) payload.session_id = sessionId;
      const token = getStoredToken();
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers.Authorisation = `Bearer ${token}`;
      }

      const res = await fetch(`${API_ROOT}/api/assistant`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Unable to reply right now.");

      if (data.session_id) setSessionId(data.session_id);

      const reply =
        data.message ||
        data.answer ||
        data.response ||
        "I couldn't find an answer just now.";
      addMessage({
        role: "assistant",
        content: reply,
        availableSlots: Array.isArray(data.available_slots) ? data.available_slots : [],
        slotsDisabled: false,
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendToAssistant(input);
  }

  function handleSlotClick(msgId, slot) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, slotsDisabled: true } : m))
    );
    sendToAssistant(slot);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="assistant-page">
      <Header />
      <div className="assistant-shell">
        <section className="assistant-card">
          <div className="assistant-header">
            <h1 className="assistant-title">Assistant</h1>
            <p className="assistant-subtitle">
              Ask anything about booking or salon details and get guided replies.
            </p>
          </div>

          <div className="assistant-chat-window">
            {messages.length === 0 && !loading && (
              <div className="assistant-empty">
                Start a conversation about services, availability, or salon info.
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`assistant-bubble ${
                  msg.role === "user"
                    ? "assistant-bubble--user"
                    : "assistant-bubble--bot"
                }`}
              >
                <p className="assistant-bubble__text">{msg.content}</p>

                {msg.role === "assistant" && msg.availableSlots?.length ? (
                  <div className="assistant-slots">
                    {msg.availableSlots.map((slot) => (
                      <button
                        key={slot}
                        className="assistant-slot"
                        disabled={loading || msg.slotsDisabled}
                        onClick={() => handleSlotClick(msg.id, slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {loading && (
              <div className="assistant-bubble assistant-bubble--bot">
                <span className="assistant-typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="assistant-input-bar" onSubmit={handleSubmit}>
            <textarea
              className="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question or booking request..."
              rows={1}
              disabled={loading}
            />
            <button
              className="assistant-send"
              type="submit"
              disabled={loading || !input.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      </div>
      <Footer />
    </div>
  );
}
