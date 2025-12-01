import { useState, useEffect } from "react";
import Button from "../Button";
import { Link } from "react-router-dom";
import "./Header.css";

const TOKEN_KEY = "ms_token"; // keep token key in one place so it's easy to update later

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tokenPocket, setTokenPocket] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_KEY) || "";
  });

  useEffect(() => {
    // sync local token into state so nav reflects login/logout instantly
    function syncToken() {
      setTokenPocket(window.localStorage.getItem(TOKEN_KEY) || "");
    }

    window.addEventListener("storage", syncToken);
    const poller = setInterval(syncToken, 1000);
    return () => {
      window.removeEventListener("storage", syncToken);
      clearInterval(poller);
    };
  }, []);

  const loggedIn = Boolean(tokenPocket); // convenience flag for nav toggles

  return (
    <>
      <nav className="header">
        <h1 className="header__brand">
          <Link to="/">Mane Society </Link>
        </h1>

        <div className="header__links">
          {/* Desktop nav stays flat so it feels calm. */}
          <Link
            to="/"
            className="header__link"
          >
            Home
          </Link>
          <Link
            to="/services"
            className="header__link"
          >
            Services
          </Link>
          <Link
            to="/#gallery"
            className="header__link"
          >
            Gallery
          </Link>
          <Link
            to="/#testimonials"
            className="header__link"
          >
            Reviews
          </Link>

          {loggedIn ? (
            <>
              <Link to="/account" className="header__link">
                Account
              </Link>
              <Link to="/my-bookings" className="header__link">
                My Bookings
              </Link>
              <Link to="/logout" className="header__link">
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="header__link">
                Login
              </Link>
              <Link to="/register" className="header__link">
                Register
              </Link>
            </>
          )}

          <Link to="/services">
            <Button
              label="Book"
              hoverColor="#2f4a34"
              className="button--compact header__cta-button"
            />
          </Link>
        </div>

        <button
          className="header__toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {menuOpen && (
        <div className="header__mobile-menu">
          <a href="/" className="header__mobile-link">
            Home
          </a>
          <a href="/services" className="header__mobile-link">
            Services
          </a>
          <a href="#gallery" className="header__mobile-link">
            Gallery
          </a>
          <a href="#testimonials" className="header__mobile-link">
            Reviews
          </a>
          {loggedIn ? (
            <>
              <Link
                to="/account"
                className="header__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                Account
              </Link>
              <Link
                to="/my-bookings"
                className="header__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                My Bookings
              </Link>
              <Link
                to="/logout"
                className="header__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="header__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="header__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
          <Link to="/services" onClick={() => setMenuOpen(false)}>
            <Button
              label="Book"
              hoverColor="#2f4a34"
              className="button--compact header__mobile-button"
            />
          </Link>
        </div>
      )}
    </>
  );
}
