import "./landingPage.css"
import { useState } from "react";


function LandingPage() {
  const [menuOpen, setMenuOpen ] = useState(false);
  return (

    <div className="min-h-screen bg-white flex flex-col">
      <nav className="w-full px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between border-b border-gray-200 bg-white">
        <h1 className="text-[24px] sm:text-[28px] font-light tracking-[0.15em] uppercase">
          Mane Society
        </h1>
        <div className="hidden lg:flex items-center gap-10 text-[15px] font-light tracking-wide">
          <a
            href="#"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Services
          </a>
          <a
            href="#"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Gallery
          </a>
          <a
            href="#"
            className="text-gray-700 hover:text-black transition-colors"
          >
            Book
          </a>

          <button className="ml-6 btn-primary px-6 py-2 text-[14px]">
            Book Now
          </button>
        </div>
        <button 
          className="lg:hidden text-gray-700 text-2xl"
          onClick = {() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰' }
        </button>
      </nav>

      {menuOpen && (
        <div className="lg:hidden w-full px-6 py-4 bg-white shadow-md border-b border-gray-200 flex flex-col gap-4 text-[16px] font-light tracking-wide">
          <a href="#" className="text-gray-700 hover:text-black">Services</a>
          <a href="#" className="text-gray-700 hover:text-black">Gallery</a>
          <a href="#" className="text-gray-700 hover:text-black">Book</a>
          <button className="btn-primary w-fit mt-2">Book Now</button>
        </div>
      )}


      <section className="w-full flex justify-center">
        <div className="hero-container">
          {/* LEFT */}
          <div className="hero-left">
            <h2 className="text-6xl font-light tracking-tight leading-[1.1] mb-6">
              Redefining
              <br /> Salon Experience
            </h2>

            <p className="text-gray-600 text-lg tracking-wide leading-relaxed max-w-md mb-8">
              A modern hair studio where craft meets creativity. Precision cuts,
              bespoke colourwork, and luxury grooming.
            </p>

            <button className="btn-primary">Book Appointment</button>
          </div>

          {/* MIDDLE IMAGE */}
          <div className="hero-image-wrapper">
            <img src="/salon-image.jpg" alt="Salon" className="hero-image" />
          </div>

          {/* RIGHT CARDS */}
          <div className="hero-right">
            <div className="card-dark">
              <h3 className="text-2xl font-semibold tracking-wide mb-3 text-white">
                Cut & Style
              </h3>
              <p className="text-gray-300 text-[15px] leading-relaxed">
                Contemporary cuts and refined styling rooted in premium craft.
              </p>
            </div>

            <div className="card-gradient">
              <h3 className="text-2xl font-medium tracking-wide mb-3 text-[#2f3e2e]">
                Colour & Texture
              </h3>
              <p className="text-gray-700 text-[15px] leading-relaxed">
                Bespoke colourwork crafted for richness, depth, and expression.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
