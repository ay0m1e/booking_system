import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./admin.css";

const API_ROOT = "https://bookingsystem-production-19c2.up.railway.app";
const TOKEN_KEYS = ["token", "ms_token"];
const ADMIN_FLAG = "is_admin";

function getToken() {
  if (typeof window === "undefined") return "";
  for (const key of TOKEN_KEYS) {
    const val = window.localStorage.getItem(key);
    if (val) return val;
  }
  return "";
}

function isAdminUser() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_FLAG) === "true";
}

function buildAuthHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    Authorisation: `Bearer ${token}`,
  };
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    if (!isAdminUser()) {
      navigate("/", { replace: true });
      return;
    }

    async function fetchBookings() {
      setLoading(true);
      setStatusMemo({ tone: "", text: "" });
      try {
        const res = await fetch(`${API_ROOT}/api/admin/bookings`, {
          headers: buildAuthHeaders(),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to load bookings.");
        }
        const list = Array.isArray(payload)
          ? payload
          : payload.bookings || [];
        setBookings(list);
      } catch (error) {
        setStatusMemo({
          tone: "error",
          text: error.message || "Failed to fetch bookings.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [navigate]);

  async function deleteBooking(id) {
    const confirm = window.confirm("Delete this booking?");
    if (!confirm) return;
    setDeleting(id);
    setStatusMemo({ tone: "", text: "" });
    try {
      const res = await fetch(`${API_ROOT}/api/admin/bookings/${id}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to delete booking.");
      }
      setBookings((prev) => prev.filter((b) => String(b.id) !== String(id)));
      setStatusMemo({ tone: "success", text: "Booking deleted." });
    } catch (error) {
      setStatusMemo({
        tone: "error",
        text: error.message || "Failed to delete booking.",
      });
    } finally {
      setDeleting("");
    }
  }

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-shell">
        <section className="admin-card">
          <h1 className="admin-heading">Bookings</h1>
          <p className="admin-text">
            Review and manage all bookings across users and services.
          </p>

          {statusMemo.text && (
            <div
              className={`admin-status ${
                statusMemo.tone ? `admin-status--${statusMemo.tone}` : ""
              }`}
            >
              {statusMemo.text}
            </div>
          )}

          {loading ? (
            <div className="admin-placeholder">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="admin-placeholder">No bookings found.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((bk) => {
                    const userName = bk.user_name || bk.name || "—";
                    const userEmail = bk.user_email || bk.email || "—";
                    const dateString = bk.date ? String(bk.date) : "";
                    const parsedDate = new Date(dateString);
                    const safeDate = Number.isNaN(parsedDate.getTime())
                      ? dateString.slice(0, 10)
                      : parsedDate.toISOString().slice(0, 10);
                    const timeString = bk.time || "";
                    const normalizedTime =
                      timeString.length === 5 ? `${timeString}:00` : timeString;
                    const bookingDateTime = new Date(
                      `${safeDate}T${normalizedTime}`
                    );
                    const now = new Date();
                    const parsedTime = bookingDateTime.getTime();
                    const isPast =
                      Number.isNaN(parsedTime) ? false : bookingDateTime < now;
                    return (
                      <tr
                        key={bk.id}
                        className={
                          String(bk.payment_status).toLowerCase() === "paid"
                            ? "admin-row--paid"
                            : ""
                        }
                      >
                        <td data-label="ID">{bk.id}</td>
                        <td data-label="User">{userName}</td>
                        <td data-label="Email">{userEmail}</td>
                        <td data-label="Service">{bk.service}</td>
                        <td data-label="Date">{bk.date}</td>
                        <td data-label="Time">{bk.time}</td>
                        <td data-label="Payment">
                          {bk.payment_method || "—"}
                        </td>
                        <td data-label="Status">
                          {String(bk.payment_status || "pending").toLowerCase() ===
                          "paid" ? (
                            <span className="admin-badge admin-badge--success">
                              Paid
                            </span>
                          ) : (
                            <span className="admin-badge">Pending</span>
                          )}
                        </td>
                        <td data-label="Notes">{bk.notes || "—"}</td>
                        <td data-label="Created">
                          {bk.created_at
                            ? new Date(bk.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td data-label="Actions">
                          <div className="admin-table-actions">
                            {isPast ? (
                              <span className="admin-badge admin-badge--muted">
                                Past booking
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="admin-button"
                                onClick={() => deleteBooking(bk.id)}
                                disabled={deleting === bk.id}
                              >
                                {deleting === bk.id ? "Deleting..." : "Delete"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
