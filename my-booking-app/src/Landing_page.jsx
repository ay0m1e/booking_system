import { useEffect, useState } from "react";
import "./landingPage.css";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination, Autoplay } from "swiper/modules";
import Button from "./Button.jsx";
import Header from "./components/Header";
import Footer from "./components/Footer";

function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();

    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return (
    <div className="landing">
      <Header />

      {/* Hero section sets the tone with bold headline, quick copy, and CTA. */}
      <section className="landing__hero">
        <div className="landing__hero-shell">
          <div className="landing__hero-copy" data-aos="fade-right">
            {/* Hero copy stays short and punchy so visitors immediately feel the vibe. */}
            <h2 className="landing__hero-title">
              Redefining
              <br /> Salon Experience
            </h2>

            <p className="landing__hero-subtitle">
              A modern hair studio where craft meets creativity. Precision cuts,
              bespoke colourwork, and luxury grooming.
            </p>

            <Link to="/services">
              <Button
                label="Book Appointment"
                baseColor="#111827"
                hoverColor="#2f4a34"
                className="button--wide landing__hero-button"
              />
            </Link>
          </div>

          <div className="landing__hero-image-wrapper" data-aos="zoom-in">
            <img
              src="/images/salon-image.jpg"
              alt="Salon"
              className="landing__hero-image"
            />
          </div>

          <div className="landing__hero-cards" data-aos="fade-left">
            {/* These cards give quick peeks into signature services without overwhelming text. */}
            <div className="landing__card landing__card--dark">
              <h3 className="landing__card-title">Cut & Style</h3>
              <p className="landing__card-text">
                Contemporary cuts and refined styling rooted in premium craft.
              </p>
            </div>

            <div className="landing__card landing__card--gradient">
              <h3 className="landing__card-title">Colour & Texture</h3>
              <p className="landing__card-text">
                Bespoke colourwork crafted for richness, depth, and expression.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="landing__divider">
        <div className="landing__divider-bar"></div>
      </div>

      {/* Story block mixes imagery + narrative so visitors understand our ethos. */}
      <section className="landing__story">
        <div className="landing__story-shell">
          <div className="landing__story-layout">
            <div className="landing__story-media" data-aos="fade-up">
              <img
                src="/images/stylist_at_work1.jpeg"
                alt="Stylist at Work"
                className="landing__story-image"
              />
            </div>

            <div className="landing__story-content" data-aos="fade-left">
              <h3 className="landing__section-title">
                Craft, Care and Creativity
              </h3>

              <p className="landing__section-text">
                We believe your hair is an extension of your identity. Our
                stylists blend artistry with technical precision to create looks
                that are timeless, expressive and uniquely you.
              </p>

              <p className="landing__section-text landing__section-text--spaced">
                From subtle enhancement to bold transformation, we tailor every
                session with intention, luxury, and detail.
              </p>
              <Link to="/services">
                <Button
                  label="Book a Session"
                  className="button--wide landing__story-button"
                  hoverColor="#766017ff"
                />
              </Link>
              <div />
            </div>
          </div>
        </div>
      </section>

      <div className="landing__divider">
        <div className="landing__divider-bar"></div>
      </div>

      {/* Gallery strips show real work to build trust before booking. */}
      <section id="gallery" className="landing__gallery">
        <div className="landing__section-shell">
          <h3
            className="landing__section-title landing__section-title--center"
            data-aos="fade-up"
          >
            Our Gallery
          </h3>

          {isMobile ? (
            <Swiper
              modules={[Pagination, Autoplay]}
              pagination={{ clickable: true }}
              autoplay={{ delay: 2500, disableOnInteraction: false }}
              loop
            >
              <SwiperSlide>
                <img
                  src="/images/gall_1.jpeg"
                  className="landing__gallery-image"
                  data-aos="fade-up"
                />
              </SwiperSlide>

              <SwiperSlide>
                <img
                  src="/images/gall_2.jpeg"
                  className="landing__gallery-image"
                  data-aos="fade-up"
                />
              </SwiperSlide>

              <SwiperSlide>
                <img
                  src="/images/gall_3.jpeg"
                  className="landing__gallery-image"
                  data-aos="fade-up"
                  data-aos-delay="300"
                />
              </SwiperSlide>

              <SwiperSlide>
                <img
                  src="/images/gall_5.jpeg"
                  className="landing__gallery-image"
                  data-aos="fade-up"
                />
              </SwiperSlide>

              <SwiperSlide>
                <img
                  src="/images/gall_6.jpeg"
                  className="landing__gallery-image"
                  data-aos="fade-up"
                  data-aos-delay="150"
                />
              </SwiperSlide>

              <SwiperSlide>
                <img
                  src="/images/gall_8.jpeg"
                  className="landing__gallery-image"
                  data-aos="fade-up"
                />
              </SwiperSlide>
            </Swiper>
          ) : (
            <div
              className="landing__gallery-grid"
              data-aos="fade-up"
              data-aos-offset="200"
              data-aos-duration="800"
            >
              <img
                src="/images/gall_1.jpeg"
                className="landing__gallery-image"
                data-aos="fade-up"
              />

              <img
                src="/images/gall_2.jpeg"
                className="landing__gallery-image"
                data-aos="fade-up"
              />

              <img
                src="/images/gall_3.jpeg"
                className="landing__gallery-image"
                data-aos="fade-up"
                data-aos-delay="300"
              />

              <img
                src="/images/gall_5.jpeg"
                className="landing__gallery-image"
                data-aos="fade-up"
              />

              <img
                src="/images/gall_6.jpeg"
                className="landing__gallery-image"
                data-aos="fade-up"
                data-aos-delay="150"
              />

              <img
                src="/images/gall_8.jpeg"
                className="landing__gallery-image"
                data-aos="fade-up"
              />
            </div>
          )}
        </div>
      </section>

      <div className="landing__divider">
        <div className="landing__divider-bar"></div>
      </div>

      {/* Social proof to reassure new visitors that the experience matches the visuals. */}
      <section id="testimonials" className="landing__testimonials">
        <div className="landing__section-shell">
          <h3
            className="landing__section-title landing__section-title--center"
            data-aos="fade-up"
          >
            What Clients Say
          </h3>

          {isMobile ? (
            <Swiper
              modules={[Pagination, Autoplay]}
              pagination={{ clickable: true }}
              autoplay={{ delay: 2500, disableOnInteraction: false }}
              loop
            >
              <SwiperSlide>
                <div className="landing__testimonial-card" data-aos="fade-up">
                  <p className="landing__testimonial-text">
                    “Absolutely the best salon experience I've had. My stylist
                    understood exactly what I wanted and executed it perfectly.”
                  </p>
                  <h4 className="landing__testimonial-author">Olamide T.</h4>
                </div>
              </SwiperSlide>

              <SwiperSlide>
                <div
                  className="landing__testimonial-card"
                  data-aos="fade-up"
                  data-aos-delay="150"
                >
                  <p className="landing__testimonial-text">
                    “Elegant atmosphere, professional staff, and the attention
                    to detail is unmatched. My colour has never looked better.”
                  </p>
                  <h4 className="landing__testimonial-author">Adebola O.</h4>
                </div>
              </SwiperSlide>

              <SwiperSlide>
                <div
                  className="landing__testimonial-card"
                  data-aos="fade-up"
                  data-aos-delay="300"
                >
                  <p className="landing__testimonial-text">
                    “I left feeling like a brand new person. The quality, care
                    and creativity were exceptional.”
                  </p>
                  <h4 className="landing__testimonial-author">Paula .</h4>
                </div>
              </SwiperSlide>
            </Swiper>
          ) : (
            <div className="landing__testimonials-grid">
              <div className="landing__testimonial-card" data-aos="fade-up">
                <p className="landing__testimonial-text">
                  “Absolutely the best salon experience I've had. My stylist
                  understood exactly what I wanted and executed it perfectly.”
                </p>
                <h4 className="landing__testimonial-author">Olamide T.</h4>
              </div>

              <div
                className="landing__testimonial-card"
                data-aos="fade-up"
                data-aos-delay="150"
              >
                <p className="landing__testimonial-text">
                  “Elegant atmosphere, professional staff, and the attention to
                  detail is unmatched. My colour has never looked better.”
                </p>
                <h4 className="landing__testimonial-author">Adebola O.</h4>
              </div>

              <div
                className="landing__testimonial-card"
                data-aos="fade-up"
                data-aos-delay="300"
              >
                <p className="landing__testimonial-text">
                  “I left feeling like a brand new person. The quality, care and
                  creativity were exceptional.”
                </p>
                <h4 className="landing__testimonial-author">Paula .</h4>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LandingPage;
