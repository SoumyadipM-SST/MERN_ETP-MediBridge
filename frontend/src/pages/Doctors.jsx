import { ArrowRight, ChevronLeft, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { DoctorCard } from "../components/DoctorCard.jsx";
import { Empty, Field, QueryState } from "../components/ui.jsx";
import { useApp } from "../hooks/useApp.js";
import { useData } from "../hooks/useData.js";
import { api } from "../services/api.js";
import { date, money } from "../utils/format.js";

function Doctors() {
  const [params, setParams] = useSearchParams();
  const all = useData("doctors", "/doctors");
  const query = {
    ...all,
    data: all.data?.filter((doctor) => {
      const search = (params.get("q") || "").toLowerCase();
      return (
        `${doctor.user.name} ${doctor.specialty}`.toLowerCase().includes(search) &&
        (!params.get("specialty") || doctor.specialty === params.get("specialty")) &&
        (!params.get("mode") || doctor.mode === params.get("mode")) &&
        (params.get("available") !== "true" || doctor.nextSlot)
      );
    }),
  };
  function filter(k, v) {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next);
  }
  return (
    <section className="doctor-directory">
      <div className="content-heading">
        <h2>Find a doctor</h2>
      </div>
      <div className="doctor-filters">
        <div className="input-icon">
          <Search size={18} />
          <input
            aria-label="Search doctors"
            placeholder="Name or specialty"
            value={params.get("q") || ""}
            onChange={(e) => filter("q", e.target.value)}
          />
        </div>
        <select
          aria-label="Specialty"
          value={params.get("specialty") || ""}
          onChange={(e) => filter("specialty", e.target.value)}
        >
          <option value="">All specialties</option>
          {[...new Set(all.data?.map((d) => d.specialty))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Consultation mode"
          value={params.get("mode") || ""}
          onChange={(e) => filter("mode", e.target.value)}
        >
          <option value="">All consultation modes</option>
          <option value="online">Online</option>
          <option value="in-person">In person</option>
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={params.get("available") === "true"}
            onChange={(e) => filter("available", e.target.checked ? "true" : "")}
          />{" "}
          Available slots
        </label>
        <button className="text-link" onClick={() => setParams({})}>
          Clear
        </button>
      </div>
      <QueryState query={query}>
        {(items) =>
          items.length ? (
            <div className="doctor-grid">
              {items.map((d) => (
                <DoctorCard key={d._id} doctor={d} />
              ))}
            </div>
          ) : (
            <Empty title="No matching doctors">
              Try another specialty or clear the filters.
            </Empty>
          )
        }
      </QueryState>
    </section>
  );
}

function DoctorDetail() {
  const { id } = useParams();
  const { user, action, pending } = useApp();
  const navigate = useNavigate();
  const query = useData(["doctor", id], `/doctors/${id}`);
  const [slot, setSlot] = useState("");
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <Link className="back-link" to="/consultations">
        <ChevronLeft size={16} /> Back to the directory
      </Link>
      <QueryState query={query}>
        {(doctor) => (
          <div className="booking-layout">
            <div className="doctor-profile">
              <span className="eyebrow">{doctor.specialty} / DOCTOR PROFILE</span>
              <h1>{doctor.user.name}</h1>
              <p>{doctor.bio}</p>
              <dl className="detail-list">
                <div>
                  <dt>Qualifications</dt>
                  <dd>{doctor.qualification}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{doctor.experience} years</dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd>{doctor.mode} · scheduled slots shown below</dd>
                </div>
              </dl>
            </div>
            <section className="panel booking-panel">
              <span className="eyebrow">APPOINTMENT BOOKING</span>
              <h2>Book a consultation</h2>
              <p className="muted">
                Times are shown in your browser’s local timezone. Medicine checkout
                is paid securely through Razorpay.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) {
                    navigate("/login", {
                      state: { from: `/consultations/doctors/${id}` },
                    });
                    return;
                  }
                  const result = await action(
                    () =>
                      api(
                        slot === "instant"
                          ? "/appointments/instant"
                          : "/appointments",
                        {
                          method: "POST",
                          body:
                            slot === "instant"
                              ? { doctor: id }
                              : { slot, reason: e.target.reason.value },
                        },
                      ),
                    slot === "instant"
                      ? "Consultation request created. Waiting for the assigned doctor."
                      : "Appointment booked.",
                  );
                  if (result)
                    navigate(
                      slot === "instant"
                        ? `/consultations/${result._id}`
                        : "/consultations?tab=mine",
                    );
                }}
              >
                <Field label="Consultation date & time">
                  <select
                    required
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                  >
                    <option value="">Choose a date & time</option>
                    {doctor.slots.map((s) => (
                      <option value={s._id} key={s._id}>
                        {date(s.start)}
                      </option>
                    ))}
                    {doctor.mode === "online" && (
                      <option value="instant">Instant Consultation</option>
                    )}
                  </select>
                </Field>
                {!doctor.slots.length && (
                  <div className="notice">
                    No scheduled slots are currently available. The doctor can add
                    availability in their profile.
                  </div>
                )}
                {slot === "instant" && (
                  <p className="notice">
                    Online consultation request. The assigned doctor must accept and
                    begin the session.{" "}
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setSlot("")}
                    >
                      Return to scheduled slots
                    </button>
                  </p>
                )}
                <Field label="What would you like to discuss?">
                  <textarea
                    name="reason"
                    required={slot !== "instant"}
                    disabled={slot === "instant"}
                    minLength={3}
                    maxLength={1000}
                    placeholder="Briefly describe the reason for your appointment"
                    rows={3}
                  />
                </Field>
                <div className="total-line">
                  <span>Consultation fee (reference)</span>
                  <strong>
                    {slot === "instant"
                      ? "Instant consultation fee waived"
                      : money(doctor.fee)}
                  </strong>
                </div>
                <button
                  className="btn wide"
                  disabled={
                    pending || !slot || Boolean(user && user.role !== "patient")
                  }
                >
                  {pending
                    ? "Booking…"
                    : slot === "instant"
                      ? "Request instant consultation"
                      : "Book appointment"}{" "}
                  <ArrowRight size={18} />
                </button>
                {user && user.role !== "patient" && (
                  <p className="footnote">
                    Sign in with a patient account to book an appointment.
                  </p>
                )}
              </form>
            </section>
          </div>
        )}
      </QueryState>
    </main>
  );
}

export { Doctors, DoctorDetail };
