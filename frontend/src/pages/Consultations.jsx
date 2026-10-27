import { useSearchParams } from "react-router-dom";

import { QueryState } from "../components/ui.jsx";
import { AppointmentRecords } from "../features/appointments/AppointmentRecords.jsx";
import { useApp } from "../hooks/useApp.js";
import { useData } from "../hooks/useData.js";
import { useNow } from "../hooks/useNow.js";
import { Doctors } from "./Doctors.jsx";

export function ConsultationsPage() {
  const now = useNow();
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || (user.role === "patient" ? "doctors" : "mine");
  const query = useData("appointments", "/appointments", {
    enabled: tab !== "doctors",
    refetchInterval: tab === "mine" ? 5000 : false,
  });
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <div className="page-title">
        <div>
          <span className="eyebrow">CONSULTATIONS / VIDEO APPOINTMENTS</span>
          <h1>Consultations</h1>
          <p>
            Book, join and follow your appointments. Consultation records and in-app
            room access are limited to the assigned patient and doctor.
          </p>
        </div>
      </div>
      <nav className="page-tabs" aria-label="Consultation sections">
        {user.role === "patient" && (
          <button
            className={tab === "doctors" ? "active" : ""}
            onClick={() => setParams({ tab: "doctors" })}
          >
            Browse doctors
          </button>
        )}
        <button
          className={tab === "mine" ? "active" : ""}
          onClick={() => setParams({ tab: "mine" })}
        >
          Upcoming & ongoing
        </button>
        <button
          className={tab === "past" ? "active" : ""}
          onClick={() => setParams({ tab: "past" })}
        >
          Previous consultations
        </button>
      </nav>
      {tab === "doctors" && user.role === "patient" ? (
        <Doctors />
      ) : (
        <QueryState query={query}>
          {(items) => (
            <AppointmentRecords
              records={items.filter((item) =>
                tab === "past"
                  ? !["booked", "confirmed"].includes(item.status) ||
                    +new Date(item.end) < now
                  : ["booked", "confirmed"].includes(item.status) &&
                    +new Date(item.end) >= now,
              )}
            />
          )}
        </QueryState>
      )}
    </main>
  );
}
