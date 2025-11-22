function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* NAVBAR */}
      <nav className="w-full flex items-center justify-between px-12 py-6 border-b border-gray-200">
        {/* Left Logo / Brand */}
        <h1 className="text-[28px] font-light tracking-[0.15em] uppercase">
          Mane Society
        </h1>

        {/* Right Links */}
        <div className="flex items-center gap-10 text-[15px] font-light tracking-wide">
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

          {/* Optional: CTA button for immediate booking */}
          <button className="ml-6 px-6 py-2 border border-gray-800 rounded-full text-[14px] tracking-wide hover:bg-gray-900 hover:text-white transition-all">
            Book Now
          </button>
        </div>
      </nav>

      {/* Placeholder for the rest of the landing page */}
      {/* HERO SECTION */}
      <section className="w-full flex justify-center mt-16">
        <div className="w-[90%] max-w-[1400px] bg-white rounded-[40px] shadow-lg px-16 py-20 flex gap-16">
          {/* LEFT TEXT BLOCK */}
          <div className="flex flex-col justify-center flex-1">
            <h2 className="text-6xl font-light tracking-tight leading-[1.1] mb-6">
              Redefining
              <br /> Salon Experience
            </h2>

            <p className="text-gray-600 text-lg tracking-wide leading-relaxed max-w-md mb-8">
              A modern hair studio where craft meets creativity. Precision cuts,
              bespoke colourwork, and luxury grooming.
            </p>

            <button className="mt-4 w-fit px-10 py-3 border border-gray-900 rounded-full text-[15px] tracking-wide hover:bg-gray-900 hover:text-white transition-all">
              Book Appointment
            </button>
          </div>

          {/* MIDDLE IMAGE */}
          <div className="flex-1 flex justify-center">
            <img
              src="/salon-image.jpg"
              alt="Salon Interior"
              className="h-[520px] w-full max-w-[520px] object-cover rounded-3xl shadow-md"
            />
          </div>

          {/* RIGHT SERVICE CARDS WITH GREEN ACCENT */}
          <div className="flex flex-col flex-1 gap-10 justify-center">
            {/* CARD 1 — Deep Rich Green */}
            <div className="rounded-[30px] p-10 shadow-lg bg-[#2f4a34] border border-[#203526] shadow-[0_6px_25px_rgba(32,53,38,0.35)]">
              <h3 className="text-2xl font-semibold tracking-wide mb-3 text-white">
                Cut & Style
              </h3>
              <p className="text-gray-200 text-[15px] leading-relaxed">
                Contemporary cuts and refined styling grounded in premium craft.
              </p>
            </div>

            {/* CARD 2 — Botanical Gradient */}
            <div className="rounded-[30px] p-10 shadow-sm bg-gradient-to-br from-[#e0f2d6] to-[#d3ecc6] border border-[#c3ddb5] shadow-[0_4px_20px_rgba(122,166,106,0.15)]">
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
