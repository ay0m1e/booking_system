import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./auth.css";

const AUTH_BASE = "https://booking-system-xrmp.onrender.com";
const TOKEN_KEY = "ms_token";
const EMAIL_KEY = "ms_user_email";
const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
]);
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function isAllowedEmail(email) {
  if (!EMAIL_REGEX.test(email)) return false;
  const domain = email.split("@")[1];
  return ALLOWED_EMAIL_DOMAINS.has(domain);
}

export default function Register() {
  const [namePad, setNamePad] = useState("");
  const [emailPad, setEmailPad] = useState("");
  const [passPad, setPassPad] = useState("");
  const [sendGate, setSendGate] = useState({ firing: false });
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const navigate = useNavigate();

  async function autoLogin(email, password) {
    const res = await fetch(`${AUTH_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error || "Unable to log in after registering.");
    }
    if (payload.token) {
      window.localStorage.setItem(TOKEN_KEY, payload.token);
      window.localStorage.setItem(EMAIL_KEY, email);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    if (!namePad.trim() || !emailPad.trim() || !passPad) {
      setStatusMemo({
        tone: "error",
        text: "All fields are required.",
      });
      return;
    }

    const sanitizedEmail = emailPad.trim().toLowerCase();

    if (!isAllowedEmail(sanitizedEmail)) {
      setStatusMemo({
        tone: "error",
        text:
          "Use a supported email (gmail/outlook/hotmail/live/yahoo/ymail/icloud/me/mac).",
      });
      return;
    }

    setSendGate({ firing: true });
    setStatusMemo({ tone: "", text: "" });

    try {
      const res = await fetch(`${AUTH_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: namePad.trim(),
          email: sanitizedEmail,
          password: passPad,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          res.status === 409
            ? payload.error || "Email already registered. Try signing in."
            : payload.error ||
              "Unable to register. Check your email and try again.";
        setStatusMemo({
          tone: "error",
          text: message,
        });
        return;
      }

      await autoLogin(sanitizedEmail, passPad);

      setStatusMemo({
        tone: "success",
        text: "Account ready. Redirecting...",
      });
      navigate("/booking", { replace: true });
    } catch (error) {
      console.error(error);
      setStatusMemo({
        tone: "error",
        text: error.message || "Registration failed.",
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
          <h1 className="auth-title">Create Account</h1>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-name">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                className="auth-input"
                value={namePad}
                onChange={(e) => setNamePad(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-email">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                className="auth-input"
                value={emailPad}
                onChange={(e) => setEmailPad(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <p className="auth-help">
                Supported: gmail, outlook, hotmail, live, yahoo, ymail, icloud, me, mac.
              </p>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                className="auth-input"
                value={passPad}
                onChange={(e) => setPassPad(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={sendGate.firing}
            >
              {sendGate.firing ? "Setting you up..." : "Register"}
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
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
