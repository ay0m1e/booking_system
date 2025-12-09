import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./admin.css";

const API_ROOT = "https://booking-system-xrmp.onrender.com";
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

function buildAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    Authorisation: `Bearer ${token}`,
  };
}

function isAdminUser() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_FLAG) === "true";
}

export default function AdminEditService() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    category: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdminUser()) {
      navigate("/", { replace: true });
      return;
    }

    async function loadService() {
      setLoading(true);
      setStatusMemo({ tone: "", text: "" });
      try {
        const res = await fetch(`${API_ROOT}/api/admin/services`, {
          headers: buildAuthHeaders(),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to load service.");
        }
        const list = Array.isArray(payload) ? payload : payload.services || [];
        const match = list.find((svc) => String(svc.id) === String(id));
        if (!match) {
          throw new Error("Service not found.");
        }
        setForm({
          name: match.name || "",
          price: match.price ?? "",
          duration: match.duration ?? "",
          category: match.category || "",
          is_active: match.is_active !== false,
        });
      } catch (error) {
        setStatusMemo({
          tone: "error",
          text: error.message || "Failed to load service.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [id, navigate]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAdminUser()) {
      navigate("/", { replace: true });
      return;
    }
    setSubmitting(true);
    setStatusMemo({ tone: "", text: "" });

    try {
      const res = await fetch(`${API_ROOT}/api/admin/services/${id}`, {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          duration: Number(form.duration),
          category: form.category.trim(),
          is_active: Boolean(form.is_active),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to update service.");
      }
      navigate("/admin/services", { replace: true });
    } catch (error) {
      setStatusMemo({
        tone: "error",
        text: error.message || "Failed to update service.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-shell">
        <section className="admin-card">
          <h1 className="admin-heading">Edit Service</h1>
          <p className="admin-text">
            Update service details, pricing, and activation status.
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
            <div className="bookings-placeholder">Loading service...</div>
          ) : (
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="admin-field">
                <label className="admin-label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="admin-input"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="price">
                  Price
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  className="admin-input"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="duration">
                  Duration (minutes)
                </label>
                <input
                  id="duration"
                  name="duration"
                  type="number"
                  className="admin-input"
                  value={form.duration}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="category">
                  Category
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  className="admin-input"
                  value={form.category}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="admin-field admin-checkbox">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                <label className="admin-label" htmlFor="is_active">
                  Active
                </label>
              </div>

              <div className="admin-form-actions">
                <button
                  type="submit"
                  className="admin-button admin-button--solid"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
                <Link to="/admin/services" className="admin-button">
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
