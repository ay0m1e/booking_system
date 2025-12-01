import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <section className="site-footer">
      <footer className="site-footer__shell" data-aos="fade-up">
        <div className="site-footer__grid">
          {/* Left column repeats the brand story for visitors landing mid-page. */}
          <div>
            <h2 className="site-footer__title">
              <Link to="/">Mane Society </Link>
            </h2>
            <p className="site-footer__text">
              A modern unisex salon dedicated to precision, creativity and
              intentional luxury. Where your look is crafted with care.
            </p>
          </div>

          <div>
            {/* Middle column gives quick navigation for folks scrolling to the end. */}
            <h3 className="site-footer__heading">Explore</h3>
            <ul className="site-footer__links">
              <li>
                <Link to="/services" className="site-footer__link">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/#gallery" className="site-footer__link">
                  Gallery
                </Link>
              </li>
              <li>
                <Link to="/#testimonials" className="site-footer__link">
                  Reviews
                </Link>
              </li>
              <li>
                <Link to="/services" className="site-footer__link">
                  Book Appointment
                </Link>
              </li>
            </ul>
          </div>

          <div>
            {/* Contact info stays visible here so it's easy to copy into phones. */}
            <h3 className="site-footer__heading">Contact Us</h3>
            <ul className="site-footer__contact">
              <li>📍 12 Liverpool Street, London</li>
              <li>📞 +44 7917 435 250</li>
              <li>✉️ hello@manesociety.com</li>
            </ul>
          </div>
        </div>

        <div className="site-footer__meta">
          {/* Auto-updated year keeps the footer from going stale. */}
          © {new Date().getFullYear()} Mane Society. All rights reserved.
        </div>
      </footer>
    </section>
  );
}
