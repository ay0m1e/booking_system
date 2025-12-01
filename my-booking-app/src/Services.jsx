import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Button from "./Button";
import "./Services.css";

export default function Services() {
  const [activeTab, setActiveTab] = useState("ladies"); // default to most popular group

  // Tab labels
  const tabs = [
    { key: "ladies", label: "Ladies" },
    { key: "men", label: "Men" },
    { key: "kids", label: "Kids" },
    { key: "unisex", label: "Unisex" },
    { key: "other", label: "Other" },
  ];

  // Services list
  const services = {
    ladies: [
      "Cut & Style",
      "Silk Press",
      "Colour",
      "Highlights",
      "Balayage",
      "Braids",
      "Extensions",
      "Treatments",
    ],
    men: [
      "Fade",
      "Clipper Cut",
      "Beard Grooming",
      "Colouring",
      "Hot Towel Shave",
      "Line-Up",
      "Treatments",
    ],
    kids: ["Boys’ Haircut", "Girls’ Haircut", "Protective Styles"],
    unisex: ["Wash & Blow Dry", "Treatments", "Hair Spa"],
    other: ["Wedding / Bridal Styling", "Special Event Styling"],
  };

  return (
    <>
      <Header />

      {/* Whole page is basically tabs + cards so users see offerings quickly. */}
      <section className="services">
        <div className="services__container">
          <h1 className="services__title">Our Services</h1>

          <div className="services__tabs">
            {/* Simple tab strip because there are only a few categories. */}
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`services__tab ${
                  activeTab === tab.key ? "services__tab--active" : ""
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="services__grid">
            {/* I just loop the active list so maintenance stays easy. */}
            {services[activeTab].map((service, index) => (
              <div key={index} className="services__card">
                <h3 className="services__card-title">{service}</h3>

                <p className="services__card-text">
                  A premium service tailored to your needs.
                </p>

                {/* Link straight to booking with preselected service to save clicks. */}
                <a href={`/booking?service=${encodeURIComponent(service)}`}>
                  <Button
                    label="Book Now"
                    hoverColor="#2f4a34"
                    className="button--compact services__card-button"
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
