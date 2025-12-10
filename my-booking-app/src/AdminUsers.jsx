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

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminUser()) {
      navigate("/", { replace: true });
      return;
    }

    async function fetchUsers() {
      setLoading(true);
      setStatusMemo({ tone: "", text: "" });
      try {
        const res = await fetch(`${API_ROOT}/api/admin/users`, {
          headers: buildAuthHeaders(),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to load users.");
        }
        const list = Array.isArray(payload) ? payload : payload.users || [];
        setUsers(list);
      } catch (error) {
        setStatusMemo({
          tone: "error",
          text: error.message || "Failed to fetch users.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [navigate]);

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-shell">
        <section className="admin-card">
          <h1 className="admin-heading">Users</h1>
          <p className="admin-text">Read-only list of all registered users.</p>

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
            <div className="admin-placeholder">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="admin-placeholder">No users found.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td data-label="ID">{user.id}</td>
                      <td data-label="Name">{user.name}</td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Created">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td data-label="Admin">
                        {user.is_admin ? (
                          <span className="admin-badge">Admin</span>
                        ) : (
                          "User"
                        )}
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
