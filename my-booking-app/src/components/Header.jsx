import { useState, useEffect } from "react";
import Button from "../Button";
import { Link } from "react-router-dom";
import "./Header.css";

const TOKEN_KEYS = ["token", "ms_token"]; // prefer new token key but keep fallback
const ADMIN_FLAG = "is_admin";

export default function Header() {
  // Controls the hamburger menu visibility on mobile.
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  // Cache token so nav items can switch between auth/non-auth views.
  const [tokenPocket, setTokenPocket] = useState(() => {
    if (typeof window === "undefined") return "";
    for (const key of TOKEN_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val) return val;
    }
    return "";
  });
  const [adminFlag, setAdminFlag] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADMIN_FLAG) === "true";
  });

  useEffect(() => {
    // sync local token into state so nav reflects login/logout instantly
    function syncToken() {
      if (typeof window === "undefined") return;
      let found = "";
      for (const key of TOKEN_KEYS) {
        const val = window.localStorage.getItem(key);
        if (val) {
          found = val;
          break;
        }
      }
      setTokenPocket(found);
      setAdminFlag(window.localStorage.getItem(ADMIN_FLAG) === "true");
    }

    window.addEventListener("storage", syncToken);
    const poller = setInterval(syncToken, 1000);
    return () => {
      window.removeEventListener("storage", syncToken);
      clearInterval(poller);
    };
  }, []);

  const loggedIn = Boolean(tokenPocket); // convenience flag for nav toggles
  const isAdmin = adminFlag === true;

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
          <Link
            to="/assistant"
            className="header__link"
          >
            Assistant
          </Link>
          {isAdmin && (
            <div className="header__admin">
              <button
                type="button"
                className="header__link header__admin-toggle"
                onClick={() => setAdminMenuOpen((open) => !open)}
              >
                Admin Panel ▾
              </button>
              {adminMenuOpen && (
                <div className="header__admin-menu">
                  <Link to="/admin/services" className="header__admin-item">
                    Services
                  </Link>
                  <Link to="/admin/users" className="header__admin-item">
                    Users
                  </Link>
                  <Link to="/admin/bookings" className="header__admin-item">
                    Bookings
                  </Link>
                </div>
              )}
            </div>
          )}

          {loggedIn ? (
            <>
              <Link to="/account" className="header__link">
                Account
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
          onClick={() => {
            setMenuOpen(!menuOpen);
            setAdminMenuOpen(false);
          }}
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
          <Link
            to="/assistant"
            className="header__mobile-link"
            onClick={() => setMenuOpen(false)}
          >
            Assistant
          </Link>
          {isAdmin && (
            <Link
              to="/admin/services"
              className="header__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              Admin: Services
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/users"
              className="header__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              Admin: Users
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/bookings"
              className="header__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              Admin: Bookings
            </Link>
          )}
          {loggedIn ? (
            <>
              <Link
                to="/account"
                className="header__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                Account
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
