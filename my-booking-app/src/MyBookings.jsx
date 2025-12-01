import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./account.css";

const API_ROOT = "http://127.0.0.1:5000";
const TOKEN_KEY = "ms_token";

function buildAuthHeaders(token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.Authorisation = `Bearer ${token}`;
  }
  return headers;
}

export default function MyBookings() {
  const navigate = useNavigate();
  const [tokenPocket, setTokenPocket] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_KEY) || "";
  });

  const [bookingStack, setBookingStack] = useState([]);
  const [sendGate, setSendGate] = useState({ probing: false, canceling: "" });
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [viewStage, setViewStage] = useState("idle"); // idle | loading | empty | ready | error

  useEffect(() => {
    if (!tokenPocket) {
      setStatusMemo({
        tone: "error",
        text: "Please sign in to see your bookings.",
      });
      setViewStage("error");
      return;
    }

    async function fetchBookings() {
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
    function syncToken() {
      setTokenPocket(window.localStorage.getItem(TOKEN_KEY) || "");
    }

    window.addEventListener("storage", syncToken);
    return () => window.removeEventListener("storage", syncToken);
  }, []);

  function handleAuthRedirect() {
    navigate("/login");
  }

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
            <div className="bookings-list">
              {bookingStack.map((booking) => (
                <article key={booking.id} className="booking-card">
                  <div className="booking-card__header">
                    <h2 className="booking-card__service">{booking.service}</h2>
                    <span className="booking-card__time">
                      {booking.date} at {booking.time}
                    </span>
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
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
