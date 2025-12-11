import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./FAQChat.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";

export default function FAQChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

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
    <div className="faq-page">
      <Header />
      <div className="faq-shell">
        <section className="faq-card">
          <div className="faq-header">
            <h1 className="faq-title">FAQ Assistant</h1>
            <p className="faq-subtitle">
              Ask a question and our assistant will reply with answers from our FAQ.
            </p>
          </div>

          <div className="faq-chat-window">
            {messages.length === 0 && !loading && (
              <div className="faq-empty">Start the conversation by asking a question.</div>
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

          <form className="faq-input-bar" onSubmit={handleSend}>
            <textarea
              className="faq-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              rows={1}
            />
            <button className="faq-send" type="submit" disabled={loading || !input.trim()}>
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      </div>
      <Footer />
    </div>
  );
}
