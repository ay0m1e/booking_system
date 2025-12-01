import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./auth.css";

const AUTH_BASE = "https://booking-system-xrmp.onrender.com";
const TOKEN_KEY = "ms_token";
const EMAIL_KEY = "ms_user_email";

export default function Login() {
  const [emailPad, setEmailPad] = useState("");
  const [passPad, setPassPad] = useState("");
  const [sendGate, setSendGate] = useState({ firing: false });
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();

    if (!emailPad.trim() || !passPad) {
      setStatusMemo({
        tone: "error",
        text: "Both email and password are required.",
      });
      return;
    }

    setSendGate({ firing: true });
    setStatusMemo({ tone: "", text: "" });

    const cleanEmail = emailPad.trim().toLowerCase();

    try {
      const res = await fetch(`${AUTH_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: passPad,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || "Unable to sign in.");
      }

      if (payload.token) {
        window.localStorage.setItem(TOKEN_KEY, payload.token);
        window.localStorage.setItem(EMAIL_KEY, cleanEmail);
      }

      setStatusMemo({
        tone: "success",
        text: "Signed in successfully. Redirecting...",
      });
      navigate("/booking", { replace: true });
    } catch (error) {
      console.error(error);
      setStatusMemo({
        tone: "error",
        text: error.message || "Login failed.",
      });
    } finally {
      setSendGate({ firing: false });
    }
  }

  return (
    <div className="auth-page">
      <Header />
      <div className="auth-shell">
        <section className="auth-card">
          <h1 className="auth-title">Welcome Back</h1>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="auth-input"
                value={emailPad}
                onChange={(e) => setEmailPad(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="auth-input"
                value={passPad}
                onChange={(e) => setPassPad(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={sendGate.firing}
            >
              {sendGate.firing ? "Signing in..." : "Sign In"}
            </button>

            {statusMemo.text && (
              <div
                className={`auth-status ${
                  statusMemo.tone ? `auth-status--${statusMemo.tone}` : ""
                }`}
              >
                {statusMemo.text}
              </div>
            )}
          </form>

          <div className="auth-links">
            Need an account? <Link to="/register">Create one</Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
