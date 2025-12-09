import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Button from "./Button";
import "./Services.css";

const API_ROOT = "https://booking-system-xrmp.onrender.com";

export default function Services() {
  // Pull services from backend so the site reflects live data.
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [statusMemo, setStatusMemo] = useState({ tone: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let keepRunning = true;
    async function loadServices() {
      setLoading(true);
      setStatusMemo({ tone: "", text: "" });
      try {
        const res = await fetch(`${API_ROOT}/api/services`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to load services.");
        }
        const list = Array.isArray(payload)
          ? payload
          : payload.services || [];
        if (!keepRunning) return;
        setServices(list);
        if (list.length && !activeTab) {
          setActiveTab(list[0].category || "General");
        }
      } catch (error) {
        if (!keepRunning) return;
        setStatusMemo({
          tone: "error",
          text: error.message || "Failed to fetch services.",
        });
      } finally {
        if (keepRunning) setLoading(false);
      }
    }
    loadServices();
    return () => {
      keepRunning = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const bucket = new Map();
    services.forEach((svc) => {
      const cat = svc.category || "General";
      if (!bucket.has(cat)) bucket.set(cat, []);
      bucket.get(cat).push(svc);
    });
    return bucket;
  }, [services]);

  const tabs = Array.from(grouped.keys()).map((key) => ({
    key,
    label: key,
  }));

  const activeServices = grouped.get(activeTab) || [];

  return (
    <>
      <Header />

      {/* Whole page is basically tabs + cards so users see offerings quickly. */}
      <section className="services">
        <div className="services__container">
          <h1 className="services__title">Our Services</h1>

          {statusMemo.text && (
            <div
              className={`bookings-status ${
                statusMemo.tone ? `bookings-status--${statusMemo.tone}` : ""
              }`}
              style={{ marginTop: "12px" }}
            >
              {statusMemo.text}
            </div>
          )}

          {loading ? (
            <div className="bookings-placeholder">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="bookings-placeholder">
              No services available right now.
            </div>
          ) : (
            <>
              <div className="services__tabs">
                {/* Simple tab strip based on categories returned by API. */}
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`services__tab ${
                      activeTab === tab.key ? "services__tab--active" : ""
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="services__grid">
                {activeServices.map((service) => (
                  <div key={service.id || service.name} className="services__card">
                    <h3 className="services__card-title">{service.name}</h3>

                    <p className="services__card-text">
                      {service.category} • {service.duration} mins • £{service.price}
                    </p>

                    {/* Link straight to booking with preselected service to save clicks. */}
                    <a href={`/booking?service=${encodeURIComponent(service.name)}`}>
                      <Button
                        label="Book Now"
                        hoverColor="#2f4a34"
                        className="button--compact services__card-button"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
