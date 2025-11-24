import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <section
      className="w-full mt-32 pt-10 pb-14 flex justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/images/footer_bg.png')",
      }}
    >
      <footer
        className="w-[92%] max-w-[1000px] bg-white rounded-[40px] shadow-[0_10px_50px_rgba(0,0,0,0.15)] px-10 py-16 md:px-16 lg:px-20 relative"
        data-aos="fade-up"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {/* BRAND */}
          <div>
            <h2 className="text-[26px] font-light tracking-[0.15em] uppercase text-[#2f4a34] mb-5">
              Mane Society
            </h2>
            <p className="text-gray-700 leading-[1.8] max-w-xs">
              A modern unisex salon dedicated to precision, creativity and
              intentional luxury. Where your look is crafted with care.
            </p>
          </div>

          {/* LINKS */}
          <div>
            <h3 className="text-[18px] font-medium tracking-wide mb-5 text-[#2f4a34]">
              Explore
            </h3>
            <ul className="flex flex-col gap-3 text-gray-800">
              <li>
                <Link to="/services" className="hover:text-black transition">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/#gallery" className="hover:text-black transition">
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  to="/#testimonials"
                  className="hover:text-black transition"
                >
                  Reviews
                </Link>
              </li>
              <li>
                <Link to="/booking" className="hover:text-black transition">
                  Book Appointment
                </Link>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="text-[18px] font-medium tracking-wide mb-5 text-[#2f4a34]">
              Contact Us
            </h3>
            <ul className="text-gray-800 leading-[1.8]">
              <li>📍 12 Liverpool Street, London</li>
              <li>📞 +44 7917 435 250</li>
              <li>✉️ hello@manesociety.com</li>
            </ul>
          </div>
        </div>

        <div className="text-center text-gray-600 text-sm mt-14">
          © {new Date().getFullYear()} Mane Society. All rights reserved.
        </div>
      </footer>
    </section>
  );
}
