import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./account.css";

const tokenHints = [
  "ms_token",
  "ms_user_email",
  "maneAuthToken",
  "maneToken",
  "bookingToken",
  "authToken",
  "jwt",
  "accessToken",
];

export default function Logout() {
  const navigate = useNavigate();
  // signGate toggles the loading copy while tokens are being cleared.
  const [signGate, setSignGate] = useState({ clearing: true });

  useEffect(() => {
    // Remove any possible auth/session keys so logout is thorough.
    function wipeToken() {
      if (typeof window === "undefined") return;
      tokenHints.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
    }

    wipeToken();
    setSignGate({ clearing: false });
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 400);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="account-page" style={{ justifyContent: "center" }}>
      <div className="account-shell">
        <div className="bookings-card">
          <h1 className="bookings-heading">Signing out</h1>
          <p className="bookings-text">
            {signGate.clearing
              ? "Closing your session..."
              : "Redirecting you to the homepage."}
          </p>
        </div>
      </div>
    </div>
  );
}
