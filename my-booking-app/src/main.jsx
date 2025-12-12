import { useEffect } from "react";
import { useLocation, BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import AOS from "aos";
import "aos/dist/aos.css";

import LandingPage from "./Landing_page";
import Services from "./Services";
import Booking from "./Booking";
import Login from "./Login";
import Register from "./Register";
import Account from "./Account";
import MyBookings from "./MyBookings";
import Logout from "./Logout";
import AdminServicesList from "./AdminServicesList";
import AdminCreateService from "./AdminCreateService";
import AdminEditService from "./AdminEditService";
import AdminBookings from "./AdminBookings";
import AdminUsers from "./AdminUsers";
import FAQChat from "./FAQChat";
import FAQWidget from "./FAQWidget";

import "./index.css";

function ScrollToHash() {
  // Watch the URL hash so clicking nav links scrolls smoothly to anchors.
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
  // Centralize AOS setup so route changes re-run animations.
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
      {/* Global helpers so every route gets scroll + animation behavior. */}
      <AOSInitializer />
      <ScrollToHash />
      <Routes>
        {/* Public marketing routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/services" element={<Services />} />
        {/* Core booking flow */}
        <Route path="/booking" element={<Booking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Account and session management */}
        <Route path="/account" element={<Account />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/logout" element={<Logout />} />
        {/* Admin area */}
        <Route path="/admin/services" element={<AdminServicesList />} />
        <Route path="/admin/services/new" element={<AdminCreateService />} />
        <Route path="/admin/services/:id/edit" element={<AdminEditService />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/faq" element={<FAQChat />} />
      </Routes>
      <FAQWidget />
    </BrowserRouter>
  </React.StrictMode>
);
