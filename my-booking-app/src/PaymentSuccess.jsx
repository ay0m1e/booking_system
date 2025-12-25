import { Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./account.css";

export default function PaymentSuccess() {
  return (
    <div className="account-page">
      <Header />
      <div className="account-shell">
        <section className="bookings-card">
          <h1 className="bookings-heading">Payment successful</h1>
          <p className="bookings-text">
            Your booking is confirmed. A receipt has been sent to your email.
          </p>
          <Link className="account-link" to="/my-bookings">
            View my bookings
          </Link>
        </section>
      </div>
      <Footer />
    </div>
  );
}
