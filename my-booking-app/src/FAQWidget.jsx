import { useEffect, useRef, useState } from "react";
import "./FAQWidget.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";

export default function FAQWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const msgIdRef = useRef(0);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

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

      if (!res.ok) throw new Error(data.error || "Unable to get an answer right now.");

      const reply =
        data.message ||
        data.answer ||
        data.response ||
        "I couldn't find an answer yet.";
      addMessage({
        role: "assistant",
        content: reply
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: error.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendToAssistant(input);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <>
      <button className="faq-fab" onClick={() => setOpen((o) => !o)}>
        Assistant
      </button>

      {open && (
        <div className="faq-widget">
          <div className="faq-widget__header">
            <div>
              <h3 className="faq-widget__title">Assistant</h3>
              <p className="faq-widget__subtitle">
                Ask about services, hours, booking steps, or policies.
              </p>
            </div>
            <button
              className="faq-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>

          <div className="faq-widget__chat">
            {messages.length === 0 && !loading && (
              <div className="faq-widget__empty">
                Hi! Ask me anything about services or booking.
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${
                  msg.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"
                }`}
              >
                <p className="assistant-bubble__text">{msg.content}</p>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble chat-bubble-bot">
                <span className="faq-typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="faq-widget__input" onSubmit={handleSend}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question..."
              rows={1}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
