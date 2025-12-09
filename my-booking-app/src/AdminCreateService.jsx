import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function AdminCreateService() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    category: "",
  });
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdminUser()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

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
      const res = await fetch(`${API_ROOT}/api/admin/services`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          duration: Number(form.duration),
          category: form.category.trim(),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to create service.");
      }

      navigate("/admin/services", { replace: true });
    } catch (error) {
      setStatusMemo({
        tone: "error",
        text: error.message || "Failed to create service.",
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
          <h1 className="admin-heading">Create Service</h1>
          <p className="admin-text">
            Add a new service to your catalogue with price, duration, and category.
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

            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-button admin-button--solid"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Create Service"}
              </button>
              <Link to="/admin/services" className="admin-button">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
      <Footer />
    </div>
  );
}
