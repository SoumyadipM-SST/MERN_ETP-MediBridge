import { ArrowRight, Clock, Stethoscope, Video } from "lucide-react";
import { Link } from "react-router-dom";

import { money } from "../utils/format.js";

function DoctorCard({ doctor }) {
  return (
    <article className="doctor-card">
      <div className="doctor-portrait">
        <span className="portrait-initials">
          {doctor.user.name
            .replace("Dr. ", "")
            .split(" ")
            .map((s) => s[0])
            .join("")}
        </span>
        <Stethoscope size={85} strokeWidth={0.7} />
        <span className="portrait-tag">DOCTOR PROFILE</span>
      </div>
      <div className="doctor-info">
        <span className="eyebrow">{doctor.specialty}</span>
        <h3>{doctor.user.name}</h3>
        <p className="doctor-qualification">{doctor.qualification}</p>
        <p>{doctor.experience} years of experience</p>
        <div className="doctor-session">
          <span>
            <Clock size={14} /> 30 min
          </span>
          <span>
            <Video size={14} /> {doctor.mode}
          </span>
          <strong>
            {money(doctor.fee)} <small>/ session</small>
          </strong>
        </div>
        <div className="doctor-bottom">
          <span>
            <span className="live-dot" />
            {doctor.nextSlot ? "Appointments available" : "No open slots"}
          </span>
          <Link
            className="btn small"
            aria-label={`View ${doctor.user.name}`}
            to={`/consultations/doctors/${doctor._id}`}
          >
            View & book <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export { DoctorCard };
