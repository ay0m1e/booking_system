import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./Assistant.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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

  async function sendToAssistant(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage({ role: "user", content: trimmed });
    setInput("");
    setLoading(true);

    try {
      const payload = { query: trimmed };

      const res = await fetch(`${API_ROOT}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Unable to reply right now.");

      const reply =
        data.message ||
        data.answer ||
        data.response ||
        "I couldn't find an answer just now.";
      addMessage({
        role: "assistant",
        content: reply
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
              Ask anything about salon details and booking steps—we’ll answer from the FAQ.
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
              placeholder="Type a question about services, hours, or booking..."
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
