import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

function buildAuthHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    Authorisation: `Bearer ${token}`,
  };
}

function isAdminUser() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_FLAG) === "true";
}

export default function AdminServicesList() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminUser()) {
      navigate("/", { replace: true });
      return;
    }

    async function fetchServices() {
      setLoading(true);
      setStatusMemo({ tone: "", text: "" });
      try {
        const res = await fetch(`${API_ROOT}/api/admin/services`, {
          headers: buildAuthHeaders(),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to load services.");
        }
        setServices(Array.isArray(payload) ? payload : payload.services || []);
      } catch (error) {
        setStatusMemo({
          tone: "error",
          text: error.message || "Failed to fetch services.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [navigate]);

  async function deactivateService(id) {
    if (!isAdminUser()) {
      navigate("/", { replace: true });
      return;
    }
    const confirm = window.confirm("Deactivate this service?");
    if (!confirm) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/services/${id}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to deactivate service.");
      }
      setServices((prev) =>
        prev.map((svc) =>
          String(svc.id) === String(id) ? { ...svc, is_active: false } : svc
        )
      );
      setStatusMemo({
        tone: "success",
        text: "Service deactivated.",
      });
    } catch (error) {
      setStatusMemo({
        tone: "error",
        text: error.message || "Failed to deactivate service.",
      });
    }
  }

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-shell">
        <section className="admin-card">
          <h1 className="admin-heading">Services</h1>
          <p className="admin-text">
            Manage all services, pricing, durations, and availability from here.
          </p>

          <div className="admin-actions">
            <Link to="/admin/services/new" className="admin-button admin-button--solid">
              Create New Service
            </Link>
          </div>

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
            <div className="admin-placeholder">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="admin-placeholder">No services available.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc) => (
                    <tr key={svc.id}>
                    <td data-label="ID">{svc.id}</td>
                    <td data-label="Name">{svc.name}</td>
                    <td data-label="Price">{svc.price}</td>
                    <td data-label="Duration">{svc.duration}</td>
                    <td data-label="Category">{svc.category}</td>
                    <td data-label="Status">
                      {svc.is_active === false ? (
                        <span className="admin-badge">Inactive</span>
                      ) : (
                        "Active"
                      )}
                    </td>
                    <td data-label="Actions">
                        <div className="admin-table-actions">
                          <Link
                            to={`/admin/services/${svc.id}/edit`}
                            className="admin-button"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="admin-button"
                            onClick={() => deactivateService(svc.id)}
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
