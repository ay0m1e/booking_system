import { useState } from "react";
import Button from "../Button";
import { Link } from "react-router-dom";
import "./Header.css";


export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="header">
        <h1 className="header__brand">
          <Link to="/">Mane Society </Link>
        </h1>

        <div className="header__links">
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
          <Link to="/services">
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
