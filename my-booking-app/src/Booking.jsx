import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Button from "./Button";
import "./Booking.css";

// 1-hour slots for the day
const ALL_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

// Basic duration table (minutes)
const SERVICE_DURATIONS = {
  "Cut & Style": 60,
  "Silk Press": 120,
  Colour: 90,
  Highlights: 150,
  Balayage: 180,
  Braids: 180,
  Extensions: 150,
  Treatments: 60,
  Fade: 45,
  "Clipper Cut": 45,
  "Beard Grooming": 30,
  Colouring: 60,
  "Hot Towel Shave": 45,
  "Line-Up": 30,
  "Boys’ Haircut": 45,
  "Girls’ Haircut": 45,
  "Protective Styles": 120,
  "Wash & Blow Dry": 45,
  "Hair Spa": 60,
  "Wedding / Bridal Styling": 180,
  "Special Event Styling": 120,
};

export default function Booking() {
  const [searchParams] = useSearchParams();

  // Get service from ?service=... or fallback
  const initialService = searchParams.get("service") || "Cut & Style";

  const [selectedService, setSelectedService] = useState(initialService);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().slice(0, 10) // today as YYYY-MM-DD
  );
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch availability whenever date or service changes
  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/availability?date=${selectedDate}&service=${encodeURIComponent(
            selectedService
          )}`
        );

        if (!res.ok) {
          throw new Error("Failed to fetch availability");
        }

        const data = await res.json();
        // Expecting: { slots: [{ time: "09:00", available: true }, ...] }
        setSlots(data.slots || []);
      } catch (err) {
        console.error(err);
        // TEMP fallback while backend not ready: assume all available
        setSlots(ALL_TIMES.map((time) => ({ time, available: true })));
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [selectedDate, selectedService]);

  const durationMinutes = SERVICE_DURATIONS[selectedService] || 60;

  return (
    <div className="booking-page">
      <Header />

      <section className="booking">
        <div className="booking__container">
          <h1 className="booking__title">Book an Appointment</h1>

          <div className="booking__controls">
            <div className="booking__field">
              <label className="booking__label">Service</label>
              <input
                type="text"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="booking__input"
              />
              <p className="booking__helper">
                Duration: {durationMinutes} minutes
              </p>
            </div>

            <div className="booking__field booking__date-field">
              <label className="booking__label">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="booking__input"
              />
            </div>
          </div>

          <div className="booking__slots-header">
            <h2 className="booking__slots-title">Available times</h2>
            {loading && (
              <span className="booking__loading">Checking availability…</span>
            )}
          </div>

          <div className="booking__slots-grid">
            {slots.map((slot) => (
              <div
                key={slot.time}
                className={`booking__slot-card ${
                  slot.available
                    ? "booking__slot-card--available"
                    : "booking__slot-card--unavailable"
                }`}
              >
                <span className="booking__slot-time">{slot.time}</span>

                {slot.available ? (
                  <Button
                    label="Book"
                    hoverColor="#2f4a34"
                    className="button--small booking__slot-button"
                  />
                ) : (
                  <span className="booking__slot-status">Unavailable</span>
                )}
              </div>
            ))}

            {!loading && slots.length === 0 && (
              <p className="booking__empty">No slots found for this date.</p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
