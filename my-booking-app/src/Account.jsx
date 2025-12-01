import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./account.css";

const TOKEN_KEY = "ms_token";
const emailHints = [
  "ms_user_email",
  "user_email",
  "last_login_email",
  "login_email",
  "authEmail",
];

function scoutEmailTag() {
  if (typeof window === "undefined") {
    return "";
  }

  const shelves = [window.localStorage, window.sessionStorage];
  for (const shelf of shelves) {
    if (!shelf) continue;
    for (const hint of emailHints) {
      const value = shelf.getItem?.(hint);
      if (value) {
        return value;
      }
    }
  }

  return "";
}

export default function Account() {
  const navigate = useNavigate();
  const [tokenPocket, setTokenPocket] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_KEY) || "";
  });
  const [identityTag, setIdentityTag] = useState(() => scoutEmailTag());

  useEffect(() => {
    if (!tokenPocket) {
      navigate("/login", { replace: true });
    }
  }, [tokenPocket, navigate]);

  useEffect(() => {
    function syncIdentity() {
      setTokenPocket(window.localStorage.getItem(TOKEN_KEY) || "");
      setIdentityTag(scoutEmailTag());
    }

    window.addEventListener("storage", syncIdentity);
    return () => window.removeEventListener("storage", syncIdentity);
  }, []);

  function handleLogoutClick() {
    navigate("/logout");
  }

  const friendlyName = identityTag || "there";

  return (
    <div className="account-page">
      <Header />
      <div className="account-shell">
        <section className="account-card">
          <h1 className="account-heading">Account</h1>
          <p className="account-text">
            Hi {friendlyName}, welcome back to Mane Society. Keep tabs on your
            bookings or start a fresh appointment whenever you’re ready.
          </p>

          <div className="account-actions">
            <Link to="/my-bookings" className="account-link">
              View My Bookings
            </Link>
            <Link to="/booking" className="account-link">
              Book a new visit
            </Link>
            <button className="logout-button" onClick={handleLogoutClick}>
              Logout
            </button>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
