import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Button from "./Button";
import "./Booking.css";

const API_ROOT = "https://booking-system-xrmp.onrender.com";

// Core slot template used as a UI fallback whenever the API can't provide data.
// These are not "real" slots—they're only shown when the backend gives us nothing.
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
  "Boys Haircut": 45,
  "Girls Haircut": 45,
  "Protective Styles": 120,
  "Wash & Blow Dry": 45,
  "Hair Spa": 60,
  "Wedding / Bridal Styling": 180,
  "Special Event Styling": 120,
};

// Possible storage keys where a token might live (I search these first).
// Having this list lets me preserve funky naming without hardcoding one key.
const tokenKeyHints = [
  "maneAuthToken",
  "maneToken",
  "bookingToken",
  "authToken",
  "jwt",
  "accessToken",
  "ms_token",
];

// Returns today's date as YYYY-MM-DD so the picker never dips into the past.
// This makes sure the native date input always has a valid min attribute.
function todayStamp() {
  const baseline = new Date();
  baseline.setHours(0, 0, 0, 0);
  return baseline.toISOString().slice(0, 10);
}

// Looks through local/session storage to recover any saved JWT using my funky key names.
// I also scan every key containing "token" so new auth flows are automatically supported.
function scoutToken() {
  if (typeof window === "undefined") {
    return { token: "", source: "" };
  }

  const storageUnits = [window.localStorage, window.sessionStorage];

  for (const unit of storageUnits) {
    if (!unit) continue;

    for (const hint of tokenKeyHints) {
      const value = unit.getItem?.(hint);
      if (value) {
        return { token: value, source: hint };
      }
    }

    for (let idx = 0; idx < unit.length; idx += 1) {
      const keyName = unit.key(idx);
      if (keyName && keyName.toLowerCase().includes("token")) {
        const value = unit.getItem(keyName);
        if (value) {
          return { token: value, source: keyName };
        }
      }
    }
  }

  return { token: "", source: "" };
}

// Builds headers for every fetch, mirroring both Authorization spellings because my backend sometimes mis-spells it.
// This helps the Flask decorator accept the request even if the server expects "Authorisation".
function buildHeaders(tokenValue) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (tokenValue) {
    headers.Authorization = `Bearer ${tokenValue}`;
    headers.Authorisation = `Bearer ${tokenValue}`;
  }

  return headers;
}

// Converts whatever the backend sends into a uniform slot list so the UI only deals with {time, available}.
// The backend can send arrays of objects, arrays of strings, or plain objects keyed by time.
// We only switch to fallback slots when there are zero entries, not when values are all false.
function normalizeSlots(rawSlots) {
  if (!rawSlots) {
    return [];
  }

  if (Array.isArray(rawSlots)) {
    const mapped = rawSlots
      .map((slot) => {
        if (typeof slot === "string") {
          return { time: slot, available: true };
        }
        if (slot && typeof slot === "object") {
          const hasBoolean = typeof slot.available === "boolean";
          return {
            time: slot.time,
            available: hasBoolean ? slot.available : true,
          };
        }
        return null;
      })
      .filter(Boolean);

    return mapped;
  }

  if (typeof rawSlots === "object") {
    const entries = Object.entries(rawSlots || {});
    if (!entries.length) {
      return [];
    }

    return entries.map(([time, available]) => ({
      time,
      available: Boolean(available),
    }));
  }

  return [];
}

function normalizeDateValue(value) {
  if (!value) return "";
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function normalizeTimeValue(value) {
  if (!value && value !== 0) return "";

  if (typeof value === "number") {
    const hour = Math.floor(value);
    const minute = Math.round((value - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/(\d{1,2}):(\d{2})/);

    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = match[2];

      if (/pm/i.test(trimmed) && hour < 12) {
        hour += 12;
      } else if (/am/i.test(trimmed) && hour === 12) {
        hour = 0;
      }

      return `${String(hour).padStart(2, "0")}:${minute}`;
    }

    if (/^\d{4}$/.test(trimmed)) {
      return `${trimmed.slice(0, 2)}:${trimmed.slice(2)}`;
    }

    return trimmed.slice(0, 5);
  }

  try {
    return normalizeTimeValue(String(value));
  } catch {
    return "";
  }
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get service from ?service=... or fallback
  const initialService = searchParams.get("service") || "Cut & Style";

  const allServices = Object.keys(SERVICE_DURATIONS);
  const svcBucket = allServices.includes(initialService)
    ? allServices
    : [initialService, ...allServices];
  // Booking form state: these track all user inputs and what they selected.
  // svcPick/dtPick drive the availability fetch, chronTag marks the chosen slot,
  // notePad holds stylist notes that are sent via POST.
  const [svcPick, setSvcPick] = useState(initialService);
  const [dtPick, setDtPick] = useState(() => todayStamp());
  const [slotStack, setSlotStack] = useState([]);
  const [chronTag, setChronTag] = useState("");
  const [notePad, setNotePad] = useState("");

  // Auth + request helpers: keep token, loading flags, status banner, and a way to trigger re-fetches.
  // slotPulse is just a number; bumping it forces the availability effect to run again.
  const [tokenPocket, setTokenPocket] = useState(() => scoutToken());
  const [sendGate, setSendGate] = useState({ probing: false, firing: false });
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [slotPulse, setSlotPulse] = useState(0);

  const durationMinutes = SERVICE_DURATIONS[svcPick] || 60; // Displayed near the service field

  // Whenever service/date change I clear the chosen time so users can't book a stale slot.
  useEffect(() => {
    setChronTag("");
  }, [svcPick, dtPick]);

  useEffect(() => {
    if (!chronTag) return;
    const selectedSlot = slotStack.find(
      (slot) => normalizeTimeValue(slot.time) === chronTag
    );
    if (!selectedSlot || !selectedSlot.available) {
      setChronTag("");
    }
  }, [slotStack, chronTag]);

  // Every time service/date (or post-book refresh) change we call GET /api/availability to rebuild slotStack.
  // This effect handles:
  //   1. Loading indicators (sendGate.probing)
  //   2. Token refresh (scout token before every call)
  //   3. Normalizing the server payload
  //   4. Falling back only when the response is empty/malformed
  useEffect(() => {
    let keepRunning = true;

    async function loadSlots() {
      setSendGate((prev) => ({ ...prev, probing: true }));
      setStatusMemo((prev) =>
        prev.tone === "success" ? prev : { tone: "", text: "" }
      );

      const freshPocket = scoutToken(); // Grab the latest token before each request
      if (keepRunning) {
        setTokenPocket(freshPocket);
      }

      try {
        const query = new URLSearchParams({
          service: svcPick,
          date: dtPick,
        }).toString();
        const res = await fetch(
          `${API_ROOT}/api/availability?service=${encodeURIComponent(
            svcPick
          )}&date=${dtPick}`,
          {
            headers: buildHeaders(freshPocket.token),
          }
        );
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.error || "Unable to fetch availability");
        }

        const serverSlots = normalizeSlots(payload.slots); // Accepts objects even if all values are false

        if (!keepRunning) {
          return;
        }

        let preparedList;

        if (serverSlots.length) {
          preparedList = [...serverSlots].sort((a, b) =>
            (a.time || "").localeCompare(b.time || "")
          );
        } else {
          preparedList = ALL_TIMES.map((time) => ({ time, available: true }));
          // Only reaches here when payload.slots is missing or empty
          setStatusMemo({
            tone: "info",
            text: "Using fallback slots while the scheduler warms up.",
          });
        }

        if (freshPocket.token) {
          try {
            const mineRes = await fetch(`${API_ROOT}/api/my-bookings`, {
              headers: buildHeaders(freshPocket.token),
            });
            const minePayload = await mineRes.json().catch(() => ({}));
            if (mineRes.ok) {
              const mineList = Array.isArray(minePayload)
                ? minePayload
                : minePayload.bookings || [];
              const reservedForMe = mineList
                .filter(
                  (entry) => normalizeDateValue(entry.date) === dtPick
                )
                .map((entry) => normalizeTimeValue(entry.time))
                .filter(Boolean);

              if (reservedForMe.length) {
                preparedList = preparedList.map((slot) => {
                  if (reservedForMe.includes(normalizeTimeValue(slot.time))) {
                    return { ...slot, available: false, owned: true };
                  }
                  return slot;
                });
              }
            }
          } catch (err) {
            console.error("self-booking fetch failed", err);
          }
        }

        setSlotStack(preparedList);
      } catch (error) {
        console.error(error);
        if (keepRunning) {
          // Network or server errors drop us into the same fallback list so the UI stays usable
          setSlotStack(ALL_TIMES.map((time) => ({ time, available: true })));
          setStatusMemo({
            tone: "error",
            text: error.message || "Availability check failed.",
          });
        }
      } finally {
        if (keepRunning) {
          setSendGate((prev) => ({ ...prev, probing: false }));
        }
      }
    }

    loadSlots();

    return () => {
      keepRunning = false;
    };
  }, [svcPick, dtPick, slotPulse]);

  // Handles POST /api/book and re-fetches availability on success so the new slot is instantly blocked out.
  // Most of the logic is simple guards: require a slot, require a token, then send the payload.
  async function handleBooking() {
    const freshPocket = scoutToken();
    setTokenPocket(freshPocket);

    if (!chronTag) {
      setStatusMemo({
        tone: "error",
        text: "Pick an available slot before confirming.",
      });
      return;
    }

    if (!freshPocket.token) {
      setStatusMemo({
        tone: "error",
        text: "Sign in to load your booking token before submitting.",
      });
      navigate("/login");
      return;
    }

    setSendGate((prev) => ({ ...prev, firing: true }));
    setStatusMemo({ tone: "", text: "" });

    try {
      const res = await fetch("http://127.0.0.1:5000/api/book", {
        method: "POST",
        headers: buildHeaders(freshPocket.token),
        body: JSON.stringify({
          service: svcPick,
          date: dtPick,
          time: chronTag,
          notes: notePad.trim() ? notePad.trim() : null,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || "Unable to confirm booking");
      }

      setStatusMemo({
        tone: "success",
        text: "Booking confirmed. A confirmation email is on the way.",
      });
      setNotePad("");
      setChronTag("");
      setSlotPulse((count) => count + 1);
    } catch (error) {
      console.error(error);
      setStatusMemo({
        tone: "error",
        text: error.message || "Booking could not be completed.",
      });
    } finally {
      setSendGate((prev) => ({ ...prev, firing: false }));
    }
  }

  const slotButtonDisabled = sendGate.firing;
  const slotPicked = slotStack.find(
    (slot) => normalizeTimeValue(slot.time) === chronTag
  );
  const bookingButtonLocked =
    sendGate.firing || !chronTag || !slotPicked || !slotPicked.available;

  return (
    <div className="booking-page">
      <Header />

      <section className="booking">
        <div className="booking__container">
          <div className="booking__intro">
            <h1 className="booking__title">Book an Appointment</h1>
            <p className="booking__subtitle">
              Select your service, lock a date, and tap the slot that fits.
            </p>
          </div>

          {statusMemo.text && (
            <div
              className={`booking__alert booking__alert--${
                statusMemo.tone || "info"
              }`}
              role={statusMemo.tone === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {statusMemo.text}
            </div>
          )}

          {/* Service + date controls: lets users pick what they want before seeing slots */}
          <div className="booking__controls">
            <div className="booking__field">
              <label className="booking__label">Service</label>
              <select
                className="booking__input booking__select"
                value={svcPick}
                onChange={(event) => setSvcPick(event.target.value)}
                disabled={sendGate.probing || sendGate.firing}
              >
                {svcBucket.map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </select>
              <p className="booking__helper">
                Duration: {durationMinutes} minutes.{" "}
                <Link to="/services" className="booking__helper-link">
                  Browse all services
                </Link>
              </p>
            </div>

            <div className="booking__field booking__date-field">
              <label className="booking__label">Date</label>
              <input
                type="date"
                value={dtPick}
                min={todayStamp()}
                onChange={(e) => {
                  const picked = e.target.value;
                  const today = todayStamp();
                  if (!picked || picked < today) return;
                  setDtPick(picked);
                }}
                className="booking__input"
                disabled={sendGate.firing}
              />
            </div>
          </div>

          <div className="booking__slots-header">
            <h2 className="booking__slots-title">Available times</h2>
            {sendGate.probing && (
              <span className="booking__loading">Checking availability...</span>
            )}
          </div>

          {/* Slots pulled from API: each button shows whether the backend marked it available */}
          <div className="booking__slots-grid">
            {slotStack.map((slot) => {
              const normalizedTime = normalizeTimeValue(slot.time);
              const isPicked = chronTag === normalizedTime;
              const isOwned = slot.owned && !slot.available;

              return (
                <button
                  type="button"
                  key={`${slot.time}-${slot.available ? "open" : "closed"}`}
                  className={`booking__slot-card ${
                    slot.available && !isOwned
                      ? "booking__slot-card--available"
                      : "booking__slot-card--unavailable"
                  } ${isPicked ? "booking__slot-card--picked" : ""} ${
                    isOwned ? "booking__slot-card--owned" : ""
                  }`}
                  disabled={!slot.available || slotButtonDisabled || isOwned}
                  onClick={() => {
                    if (!slot.available || slotButtonDisabled || isOwned) {
                      return;
                    }
                    setChronTag(normalizedTime);
                  }}
                >
                  <span className="booking__slot-time">{slot.time}</span>
                  <span className="booking__slot-status">
                    {slot.available && !isOwned
                      ? isPicked
                        ? "Selected for you"
                        : "Tap to reserve"
                      : isOwned
                      ? "Already booked"
                      : "Unavailable"}
                  </span>
                </button>
              );
            })}

            {!sendGate.probing && slotStack.length === 0 && (
              <p className="booking__empty">No slots found for this date.</p>
            )}
          </div>

          {/* Notes + summary sidebar: stylist notes plus a quick overview of what will be booked */}
          <div className="booking__notes-grid">
            <div className="booking__field">
              <label className="booking__label">
                Notes to your stylist (optional)
              </label>
              <textarea
                className="booking__input booking__textarea"
                value={notePad}
                onChange={(event) => setNotePad(event.target.value)}
                placeholder="Texture notes, inspiration, or anything we should prep."
                disabled={sendGate.firing}
              />
              <p className="booking__helper">
                We share this internally with your stylist so they prep in
                advance.
              </p>
            </div>

            <div className="booking__summary">
              <div className="booking__summary-line">
                <span>Date</span>
                <strong>{dtPick}</strong>
              </div>
              <div className="booking__summary-line">
                <span>Slot</span>
                <strong>{chronTag || "Pick a time"}</strong>
              </div>
              <div className="booking__summary-line">
                <span>Duration</span>
                <strong>{durationMinutes} mins</strong>
              </div>
              <p className="booking__helper booking__token-hint">
                {tokenPocket.token
                  ? `Token ready from ${tokenPocket.source || "storage"}.`
                  : "Sign in so we can attach your booking token."}
              </p>
            </div>
          </div>

          <div className="booking__action-row">
            <Button
              label={
                sendGate.firing
                  ? "Booking..."
                  : tokenPocket.token
                  ? "Confirm booking"
                  : "Sign in to book"
              }
              hoverColor="#2f4a34"
              className={`button--wide booking__cta ${
                bookingButtonLocked ? "booking__cta--disabled" : ""
              }`}
              onClick={() => {
                if (bookingButtonLocked) return;
                handleBooking();
              }}
            />
            <p className="booking__helper booking__policy">
              Need to adjust something later? Reply to your confirmation email
              or call our desk.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
