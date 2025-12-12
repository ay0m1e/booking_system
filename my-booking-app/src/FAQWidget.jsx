import { useEffect, useRef, useState } from "react";
import "./FAQWidget.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";

export default function FAQWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userEntry = { sender: "user", text: trimmed };
    setMessages((prev) => [...prev, userEntry]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_ROOT}/api/faq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to get an answer right now.");
      }
      const answer = payload.answer || payload.response || "I don't have an answer yet.";
      setMessages((prev) => [...prev, { sender: "bot", text: answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: error.message || "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSend(e);
    }
  }

  return (
    <>
      <button className="faq-fab" onClick={() => setOpen((o) => !o)}>
        FAQ
      </button>

      {open && (
        <div className="faq-widget">
          <div className="faq-widget__header">
            <div>
              <h3 className="faq-widget__title">FAQ Assistant</h3>
              <p className="faq-widget__subtitle">Ask a question, get quick answers.</p>
            </div>
            <button
              className="faq-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Close FAQ"
            >
              ✕
            </button>
          </div>

          <div className="faq-widget__chat">
            {messages.length === 0 && !loading && (
              <div className="faq-widget__empty">Hi! Ask me anything about bookings.</div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${
                  msg.sender === "user" ? "chat-bubble-user" : "chat-bubble-bot"
                }`}
              >
                {msg.text}
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
              placeholder="Type your question..."
              rows={1}
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
