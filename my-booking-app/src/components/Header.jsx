import { useState } from "react";
import Button from "../Button";
import { Link } from "react-router-dom";


export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="w-full px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between border-b border-gray-200 bg-white">
        {/* BRAND */}

        <h1 className="text-[24px] sm:text-[28px] font-light tracking-[0.15em] uppercase">
          <Link to="/">Mane Society </Link>
        </h1>

        {/* DESKTOP NAV */}
        <div className="hidden lg:flex items-center gap-10 text-[15px] font-light tracking-wide">
          <Link
            to="/"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Home
          </Link>
          <Link
            to="/services"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Services
          </Link>
          <Link
            to="/#gallery"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Gallery
          </Link>
          <Link
            to="/#testimonials"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Reviews
          </Link>

          <Link to="/services">
            <Button
              label="Book"
              hoverColor="#2f4a34"
              className="px-6 py-2 text-[14px]"
            />
          </Link>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="lg:hidden text-gray-700 text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="lg:hidden w-full px-6 py-4 bg-white shadow-md border-b border-gray-200 flex flex-col gap-4 text-[16px] font-light tracking-wide">
          <a href="/" className="text-gray-700 hover:text-black">
            Home
          </a>
          <a href="/services" className="text-gray-700 hover:text-black">
            Services
          </a>
          <a href="#gallery" className="text-gray-700 hover:text-black">
            Gallery
          </a>
          <a href="#testimonials" className="text-gray-700 hover:text-black">
            Reviews
          </a>
          <Link to="/services">
            <Button
              label="Book"
              hoverColor="#2f4a34"
              className="w-fit mt-2"
            ></Button>
          </Link>
        </div>
      )}
    </>
  );
}
