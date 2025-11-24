import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Button from "./Button";

export default function Services() {
  const [activeTab, setActiveTab] = useState("ladies");

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

      <section className="w-full flex justify-center mt-20">
        <div className="w-[92%] max-w-[1400px]">
          {/* PAGE TITLE */}
          <h1 className="text-5xl font-light tracking-tight text-center mb-16">
            Our Services
          </h1>

          {/* TAB BUTTONS */}
          <div className="flex justify-center gap-4 mb-12">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2 rounded-full text-[15px] tracking-wide transition ${
                  activeTab === tab.key
                    ? "bg-[#2f4a34] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SERVICES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {services[activeTab].map((service, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-[30px] shadow-md border border-gray-200 hover:shadow-lg transition"
              >
                <h3 className="text-xl font-medium tracking-wide mb-4 text-[#2f4a34]">
                  {service}
                </h3>

                <p className="text-gray-600 mb-6">
                  A premium service tailored to your needs.
                </p>

                <a href={`/booking?service=${encodeURIComponent(service)}`}>
                  <Button
                    label="Book Now"
                    hoverColor="#2f4a34"
                    className="px-6 py-2 text-sm"
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
