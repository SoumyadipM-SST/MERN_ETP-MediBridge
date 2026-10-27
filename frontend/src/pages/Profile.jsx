import {
  Availability,
  Professional,
} from "../features/appointments/DoctorSchedule.jsx";
import { useApp } from "../hooks/useApp.js";
import { Profile } from "./Auth.jsx";

export function ProfilePage() {
  const { user } = useApp();
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h1>Profile</h1>
          <p>
            Keep your contact details
            {user.role === "doctor"
              ? ", professional profile and availability"
              : ""}{" "}
            up to date.
          </p>
        </div>
      </div>
      <div className="profile-layout">
        <Profile />
        {user.role === "doctor" && <Professional />}
      </div>
      {user.role === "doctor" && (
        <section className="panel section-panel">
          <Availability />
        </section>
      )}
    </main>
  );
}
