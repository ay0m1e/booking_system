import { Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./account.css";

export default function PaymentCancel() {
  return (
    <div className="account-page">
      <Header />
      <div className="account-shell">
        <section className="bookings-card">
          <h1 className="bookings-heading">Payment was cancelled</h1>
          <p className="bookings-text">
            Your booking is still pending. You can return to bookings or pay
            again later.
          </p>
          <Link className="account-link" to="/booking">
            Return to bookings
          </Link>
        </section>
      </div>
      <Footer />
    </div>
  );
}
