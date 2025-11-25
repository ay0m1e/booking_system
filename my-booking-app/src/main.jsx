import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";

import LandingPage from "./Landing_page";
import Services from "./Services";
import Booking from "./Booking";


import "./index.css";

function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  return null;
}

function AOSInitializer() {
  const location = useLocation();

  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: "ease-out",
      once: true,
    });
  }, []);

  useEffect(() => {
    AOS.refresh();
  }, [location.pathname, location.hash]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AOSInitializer />
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/services" element={<Services />} />
        <Route path="/booking" element={<Booking />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
