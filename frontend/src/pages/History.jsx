import { useSearchParams } from "react-router-dom";

import { QueryState } from "../components/ui.jsx";
import { AppointmentRecords } from "../features/appointments/AppointmentRecords.jsx";
import { Orders } from "../features/commerce/Orders.jsx";
import {
  PrescriptionCard,
  PrescriptionUpload,
} from "../features/commerce/Prescriptions.jsx";
import { useApp } from "../hooks/useApp.js";
import { useData } from "../hooks/useData.js";
import { useNow } from "../hooks/useNow.js";

export function HistoryPage() {
  const now = useNow();
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const query = useData("history", "/history");
  const orders = user.role === "patient" && params.get("tab") === "orders";
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR RECORDS</span>
          <h1>
            {user.role === "doctor" ? "Consultation history" : "Medical history"}
          </h1>
          <p>
            Consultations, prescriptions and medicine orders are linked only when an
            actual relationship exists.
          </p>
        </div>
      </div>
      {user.role === "patient" && (
        <nav className="page-tabs" aria-label="Medical history sections">
          <button
            className={!orders ? "active" : ""}
            onClick={() => setParams({ tab: "consultations" })}
          >
            Consultations
          </button>
          <button
            className={orders ? "active" : ""}
            onClick={() => setParams({ tab: "orders" })}
          >
            Medicine orders
          </button>
        </nav>
      )}
      {orders ? (
        <Orders />
      ) : (
        <QueryState query={query}>
          {(data) => (
            <>
              <AppointmentRecords
                records={data.appointments.filter(
                  (item) =>
                    !["booked", "confirmed"].includes(item.status) ||
                    +new Date(item.end) < now,
                )}
                history
              />
              {user.role === "patient" && (
                <section className="panel section-panel">
                  <h2>Other prescription documents</h2>
                  <p>
                    These uploads are independent of a consultation unless a doctor
                    linked them to one.
                  </p>
                  <PrescriptionUpload />
                  {data.prescriptions
                    .filter((rx) => !rx.appointment)
                    .map((rx) => (
                      <PrescriptionCard key={rx._id} rx={rx} />
                    ))}
                </section>
              )}
            </>
          )}
        </QueryState>
      )}
    </main>
  );
}
