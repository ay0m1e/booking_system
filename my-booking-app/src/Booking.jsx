import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Button from "./Button";

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
    <>
      <Header />

      <section className="w-full flex justify-center mt-16">
        <div className="w-[92%] max-w-[1100px]">
          {/* PAGE TITLE */}
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-8">
            Book an Appointment
          </h1>

          {/* SERVICE + DATE CONTROLS */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-12">
            {/* SERVICE SELECTOR */}
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-2">
                Service
              </label>
              <input
                type="text"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#2f4a34] transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                Duration: {durationMinutes} minutes
              </p>
            </div>

            {/* DATE PICKER */}
            <div className="w-full md:w-[220px]">
              <label className="block text-sm text-gray-600 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#2f4a34] transition"
              />
            </div>
          </div>

          {/* SLOTS GRID */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#2f4a34]">
              Available times
            </h2>
            {loading && (
              <span className="text-sm text-gray-500">
                Checking availability…
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-20">
            {slots.map((slot) => (
              <div
                key={slot.time}
                className={`rounded-2xl border px-4 py-3 flex flex-col gap-2
                  ${
                    slot.available
                      ? "border-[#c8dec8] bg-[#f5fbf5]"
                      : "border-gray-200 bg-gray-100 opacity-70"
                  }
                `}
              >
                <span className="text-[15px] font-medium text-gray-800">
                  {slot.time}
                </span>

                {slot.available ? (
                  <Button
                    label="Book"
                    hoverColor="#2f4a34"
                    className="px-3 py-1 text-[13px]"
                  >
                  </Button>
                ) : (
                  <span className="text-[12px] text-gray-500">Unavailable</span>
                )}
              </div>
            ))}

            {/* If backend sends no slots */}
            {!loading && slots.length === 0 && (
              <p className="text-gray-500 text-sm col-span-full">
                No slots found for this date.
              </p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
