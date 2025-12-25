import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./account.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";
const TOKEN_KEY = "ms_token";

function buildAuthHeaders(token) {
  // Some requests historically used both spellings, so we keep both.
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.Authorisation = `Bearer ${token}`;
  }
  return headers;
}

// Tiny helpers to show the appointment info in friendlier words
function prettyDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayName = dayNames[date.getUTCDay()];
  const dayNumber = date.getUTCDate();
  const monthName = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${dayName} • ${dayNumber} ${monthName} ${year}`;
}

function prettyTime(timeString) {
  if (!timeString) return "";

  const [rawHour, rawMinute = "00"] = timeString.split(":");
  const hour = parseInt(rawHour, 10);
  if (Number.isNaN(hour)) return timeString;

  const minutes = rawMinute.slice(0, 2).padEnd(2, "0");
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${hour12}:${minutes} ${suffix}`;
}

function isPastBooking(dateString, timeString) {
  // Combine the date and time strings into a timestamp to compare to "now".
  if (!dateString || !timeString) return false;
  const cleanTime =
    timeString.length === 5 && timeString.includes(":")
      ? `${timeString}:00`
      : timeString.includes(":")
        ? timeString
        : `${timeString}:00`;
  const combined = new Date(`${dateString}T${cleanTime}`);
  if (Number.isNaN(combined.getTime())) return false;
  return combined.getTime() < Date.now();
}

function prettyPaymentMethod(method) {
  if (!method) return "Pay in person";
  if (method === "online") return "Pay online";
  if (method === "in_person") return "Pay in person";
  return method;
}

function prettyPaymentStatus(status) {
  if (!status) return "Pending";
  const clean = String(status).toLowerCase();
  if (clean === "paid") return "Paid";
  if (clean === "pending") return "Pending";
  return status;
}

export default function MyBookings() {
  const navigate = useNavigate();
  const [tokenPocket, setTokenPocket] = useState(() => {
    // Hydrate auth from storage so the page survives refreshes.
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_KEY) || "";
  });

  const [bookingStack, setBookingStack] = useState([]);
  // sendGate tracks loading and which booking (if any) is being cancelled.
  const [sendGate, setSendGate] = useState({ probing: false, canceling: "" });
  // statusMemo feeds the inline status banner.
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [viewStage, setViewStage] = useState("idle"); // idle | loading | empty | ready | error

  useEffect(() => {
    if (!tokenPocket) {
      // Short-circuit when there is no auth token.
      setStatusMemo({
        tone: "error",
        text: "Please sign in to see your bookings.",
      });
      setViewStage("error");
      return;
    }

    async function fetchBookings() {
      // Pull the latest bookings for this user.
      setSendGate((prev) => ({ ...prev, probing: true }));
      setStatusMemo({ tone: "", text: "" });
      setViewStage("loading");

      try {
        const res = await fetch(`${API_ROOT}/api/my-bookings`, {
          headers: {
            ...buildAuthHeaders(tokenPocket),
            "Content-Type": "application/json",
          },
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to fetch bookings.");
        }

        const list = Array.isArray(payload)
          ? payload
          : payload.bookings || [];

        if (list.length === 0) {
          setViewStage("empty");
        } else {
          setViewStage("ready");
        }
        setBookingStack(list);
      } catch (error) {
        console.error(error);
        setViewStage("error");
        setStatusMemo({
          tone: "error",
          text: error.message || "Something went wrong fetching bookings.",
        });
      } finally {
        setSendGate((prev) => ({ ...prev, probing: false }));
      }
    }

    fetchBookings();
  }, [tokenPocket]);

  function confirmCancel(bookingId) {
    if (!tokenPocket) {
      setStatusMemo({
        tone: "error",
        text: "You need to be logged in to cancel a booking.",
      });
      return;
    }

    // Basic confirmation guard before issuing the DELETE request.
    const approve =
      typeof window !== "undefined"
        ? window.confirm("Cancel this booking?")
        : true;

    if (!approve) return;
    handleCancel(bookingId);
  }

  async function handleCancel(bookingId) {
    setSendGate((prev) => ({ ...prev, canceling: bookingId }));
    setStatusMemo({ tone: "", text: "" });

    try {
      const res = await fetch(`${API_ROOT}/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: buildAuthHeaders(tokenPocket),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to cancel booking.");
      }

      setBookingStack((prev) => {
        const nextList = prev.filter((booking) => booking.id !== bookingId);
        setViewStage(nextList.length === 0 ? "empty" : "ready");
        return nextList;
      });

      setStatusMemo({
        tone: "success",
        text: "Booking cancelled.",
      });
    } catch (error) {
      console.error(error);
      setStatusMemo({
        tone: "error",
        text: error.message || "Failed to cancel booking.",
      });
    } finally {
      setSendGate((prev) => ({ ...prev, canceling: "" }));
    }
  }

  useEffect(() => {
    // Listen for storage changes so multi-tab updates stay in sync.
    function syncToken() {
      setTokenPocket(window.localStorage.getItem(TOKEN_KEY) || "");
    }

    window.addEventListener("storage", syncToken);
    return () => window.removeEventListener("storage", syncToken);
  }, []);

  function handleAuthRedirect() {
    // Helper for the inline "login" link shown when unauthenticated.
    navigate("/login");
  }

  const { upcomingBookings, pastBookings } = useMemo(() => {
    // Normalize bookings into two buckets so the render can stay simple.
    const upcoming = [];
    const past = [];
    bookingStack.forEach((booking) => {
      const pastFlag =
        typeof booking.is_past === "boolean"
          ? booking.is_past
          : isPastBooking(booking.date, booking.time);
      if (pastFlag) {
        past.push(booking);
      } else {
        upcoming.push(booking);
      }
    });
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookingStack]);

  const loading = viewStage === "loading";

  return (
    <div className="account-page">
      <Header />
      <div className="account-shell">
        <section className="bookings-card">
          <h1 className="bookings-heading">Your Bookings</h1>
          <p className="bookings-text">
            Track your appointments, leave notes, or plan the next visit. Every
            booking shows the service, day, and stylist notes if you left any.
          </p>

          {statusMemo.text && (
            <div
              className={`bookings-status ${
                statusMemo.tone ? `bookings-status--${statusMemo.tone}` : ""
              }`}
            >
              {statusMemo.text}
            </div>
          )}

          {viewStage === "error" && (
            <div className="bookings-placeholder">
              {tokenPocket ? (
                "We couldn't load your bookings right now."
              ) : (
                <>
                  Please{" "}
                  <button
                    type="button"
                    className="bookings-inline-link"
                    onClick={handleAuthRedirect}
                  >
                    login
                  </button>{" "}
                  to see your bookings.
                </>
              )}
            </div>
          )}

          {viewStage === "empty" && (
            <div className="bookings-placeholder">
              No bookings yet. Ready for a refresh?{" "}
              <Link to="/booking" className="bookings-inline-link">
                Book a visit
              </Link>
            </div>
          )}

          {loading && (
            <div className="bookings-placeholder">Loading your bookings...</div>
          )}

          {viewStage === "ready" && (
            <>
              <div className="bookings-list">
                <h2 className="bookings-subheading">Upcoming</h2>
                {upcomingBookings.length === 0 ? (
                  <div className="bookings-placeholder bookings-placeholder--inline">
                    No upcoming bookings.
                  </div>
                ) : (
                  upcomingBookings.map((booking) => (
                    <article key={booking.id} className="booking-card">
                      <div className="booking-card__header">
                        <h2 className="booking-card__service">
                          {booking.service}
                        </h2>
                        <p className="booking-card__time">
                          {prettyDate(booking.date)} • {prettyTime(booking.time)}
                        </p>
                      </div>

                      {booking.notes && (
                        <p className="booking-card__notes">{booking.notes}</p>
                      )}

                      <div className="booking-card__meta">
                        <span>
                          Created:{" "}
                          {booking.created_at
                            ? new Date(booking.created_at).toLocaleString()
                            : "—"}
                        </span>
                        <span>
                          Payment: {prettyPaymentMethod(booking.payment_method)} •{" "}
                          {prettyPaymentStatus(booking.payment_status)}
                        </span>
                        {booking.payment_method === "online" &&
                          String(booking.payment_status).toLowerCase() ===
                            "pending" && (
                            <span className="booking-card__chip booking-card__chip--alert">
                              Payment required
                            </span>
                          )}
                      </div>

                      <div className="booking-card__actions">
                        <button
                          className="booking-card__cancel"
                          onClick={() => confirmCancel(booking.id)}
                          disabled={sendGate.canceling === booking.id}
                        >
                          {sendGate.canceling === booking.id
                            ? "Cancelling..."
                            : "Cancel"}
                        </button>
                        <Link
                          to={`/booking?service=${encodeURIComponent(
                            booking.service || ""
                          )}`}
                          className="booking-card__rebook"
                        >
                          Book again
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {pastBookings.length > 0 && (
                <div className="bookings-list bookings-list--secondary">
                  <h2 className="bookings-subheading">Past bookings</h2>
                  {pastBookings.map((booking) => (
                    <article key={booking.id} className="booking-card booking-card--past">
                      <div className="booking-card__header">
                        <h2 className="booking-card__service">
                          {booking.service}
                        </h2>
                        <p className="booking-card__time">
                          {prettyDate(booking.date)} • {prettyTime(booking.time)}
                        </p>
                      </div>

                      {booking.notes && (
                        <p className="booking-card__notes">{booking.notes}</p>
                      )}

                      <div className="booking-card__meta">
                        <span>
                          Created:{" "}
                          {booking.created_at
                            ? new Date(booking.created_at).toLocaleString()
                            : "—"}
                        </span>
                        <span>
                          Payment: {prettyPaymentMethod(booking.payment_method)} •{" "}
                          {prettyPaymentStatus(booking.payment_status)}
                        </span>
                        {booking.payment_method === "online" &&
                          String(booking.payment_status).toLowerCase() ===
                            "pending" && (
                            <span className="booking-card__chip booking-card__chip--alert">
                              Payment required
                            </span>
                          )}
                      </div>

                      <div className="booking-card__actions">
                        <span className="booking-card__chip">Past booking</span>
                        <Link
                          to={`/booking?service=${encodeURIComponent(
                            booking.service || ""
                          )}`}
                          className="booking-card__rebook"
                        >
                          Book again
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
