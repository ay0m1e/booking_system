import AOS from "aos";
import "aos/dist/aos.css";
import "./landingPage.css";
import { useState } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "./Button.jsx";
import Header from "./components/Header";
import Footer from "./components/Footer";

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    AOS.init({
      duration: 900, // speed of animation
      easing: "ease-out",
      once: true, // animate only once
    });
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <section className="w-full flex justify-center">
        <div className="hero-container">
          {/* LEFT */}
          <div className="hero-left" data-aos="fade-right">
            <h2 className="text-[52px] lg:text-[68px] font-light tracking-tight leading-[1.05] mb-6">
              Redefining
              <br /> Salon Experience
            </h2>

            <p className="text-gray-600 text-lg tracking-wide leading-relaxed max-w-md mb-8">
              A modern hair studio where craft meets creativity. Precision cuts,
              bespoke colourwork, and luxury grooming.
            </p>

            <Link to="/services">
              <button className="btn-primary">Book Appointment</button>{" "}
            </Link>
          </div>

          {/* MIDDLE IMAGE */}
          <div className="hero-img-container" data-aos="zoom-in">
            <img
              src="/images/salon-image.jpg"
              alt="Salon"
              className="hero-image rounded-[36px] shadow-xl"
            />
          </div>

          {/* RIGHT CARDS */}
          <div className="hero-right" data-aos="fade-left">
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

      <div className="w-full flex justify-center mt-24 mb-10">
        <div className="h-[2px] w-[120px] bg-[#cddfcd] rounded-full"></div>
      </div>

      <section className="w-full flex justify-center mt-24">
        <div className="w-[92%] max-w-[1400px] px-6 sm:px-10 md:px-14 lg:px-20 py-20 bg-white rounded-[40px] shadow-md">
          <div className="flex flex-col lg:flex-row gap-14 items-center">
            {/* Left Image */}
            <div className="flex-1" data-aos="fade-up">
              <img
                src="/images/stylist_at_work1.jpeg"
                alt="Stylist at Work"
                className="w-full rounded-[30px] shadow-lg object-cover"
              />
            </div>

            {/* Right Text */}
            <div className="flex-1 flex flex-col" data-aos="fade-left">
              <h3 className="text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-6">
                Craft, Care and Creativity
              </h3>

              <p className="text-gray-600 text-lg leading-[1.8] mb-8">
                We believe your hair is an extension of your identity. Our
                stylists blend artistry with technical precision to create looks
                that are timeless, expressive and uniquely you.
              </p>

              <p className="text-gray-600 text-lg leading-[1.8] mb-10">
                From subtle enhancement to bold transformation, we tailor every
                session with intention, luxury, and detail.
              </p>

              <Button
                label="Discover Our Story"
                className="btn-primary w-fit text-[16px] px-10 py-4"
                hoverColor="#766017ff"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="w-full flex justify-center mt-24 mb-10">
        <div className="h-[2px] w-[120px] bg-[#cddfcd] rounded-full"></div>
      </div>

      {/* GALLERY SECTION */}
      <section id="gallery" className="w-full flex justify-center mt-32">
        <div className="w-[92%] max-w-[1400px] px-6 sm:px-10 md:px-14 lg:px-20">
          {/* Heading */}
          <h3
            className="text-4xl lg:text-5xl font-light tracking-tight text-center mb-16"
            data-aos="fade-up"
          >
            Our Gallery
          </h3>

          {/* Gallery Grid */}
          <div
            className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
            data-aos="fade-up"
            data-aos-offset="200"
            data-aos-duration="800"
          >
            <img
              src="/images/gall_1.jpeg"
              className="w-full rounded-[30px] shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              data-aos="fade-up"
            />

            <img
              src="/images/gall_2.jpeg"
              className="w-full rounded-[30px] shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              data-aos="fade-up"
            />

            <img
              src="/images/gall_3.jpeg"
              className="w-full rounded-[30px] shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              data-aos="fade-up"
              data-aos-delay="300"
            />

            <img
              src="/images/gall_5.jpeg"
              className="w-full rounded-[30px] shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              data-aos="fade-up"
            />

            <img
              src="/images/gall_6.jpeg"
              className="w-full rounded-[30px] shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              data-aos="fade-up"
              data-aos-delay="150"
            />

            <img
              src="/images/gall_8.jpeg"
              className="w-full rounded-[30px] shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              data-aos="fade-up"
            />
          </div>
        </div>
      </section>

      <div className="w-full flex justify-center mt-24 mb-10">
        <div className="h-[2px] w-[120px] bg-[#cddfcd] rounded-full"></div>
      </div>

      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" className="w-full flex justify-center mt-32">
        <div className="w-[92%] max-w-[1400px] px-6 sm:px-10 md:px-14 lg:px-20">
          {/* Heading */}
          <h3
            className="text-4xl lg:text-5xl font-light tracking-tight text-center mb-16"
            data-aos="fade-up"
          >
            What Clients Say
          </h3>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Card 1 */}
            <div
              className="bg-white p-10 rounded-[30px] shadow-lg border border-gray-200"
              data-aos="fade-up"
            >
              <p className="text-gray-700 text-lg leading-[1.8] mb-6">
                “Absolutely the best salon experience I've had. My stylist
                understood exactly what I wanted and executed it perfectly.”
              </p>
              <h4 className="text-[#2f4a34] font-semibold tracking-wide text-lg">
                Olamide T.
              </h4>
            </div>

            {/* Card 2 */}
            <div
              className="bg-white p-10 rounded-[30px] shadow-lg border border-gray-200"
              data-aos="fade-up"
              data-aos-delay="150"
            >
              <p className="text-gray-700 text-lg leading-[1.8] mb-6">
                “Elegant atmosphere, professional staff, and the attention to
                detail is unmatched. My colour has never looked better.”
              </p>
              <h4 className="text-[#2f4a34] font-semibold tracking-wide text-lg">
                Adebola O.
              </h4>
            </div>

            {/* Card 3 */}
            <div
              className="bg-white p-10 rounded-[30px] shadow-lg border border-gray-200"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <p className="text-gray-700 text-lg leading-[1.8] mb-6">
                “I left feeling like a brand new person. The quality, care and
                creativity were exceptional.”
              </p>
              <h4 className="text-[#2f4a34] font-semibold tracking-wide text-lg">
                Paula .
              </h4>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LandingPage;
