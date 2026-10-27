import { Check, Plus, X } from "lucide-react";

import {
  Badge,
  Empty,
  Field,
  IconButton,
  QueryState,
} from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useData } from "../../hooks/useData.js";
import { api } from "../../services/api.js";
import { date } from "../../utils/format.js";
import { formValues } from "../../utils/forms.js";

function Availability() {
  const query = useData("slots", "/doctor/slots");
  const { action, pending } = useApp();
  return (
    <div className="dashboard-columns">
      <section className="panel">
        <h2>Set consultation availability</h2>
        <p>
          Choose a local time. The server stores it in UTC and prevents overlaps.
          Every slot lasts 30 minutes.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const result = await action(
              () =>
                api("/doctor/slots", {
                  method: "POST",
                  body: { start: new Date(form.start.value).toISOString() },
                }),
              "Availability added.",
            );
            if (result) form.reset();
          }}
        >
          <Field
            label="Date & start time"
            name="start"
            type="datetime-local"
            required
          />
          <button className="btn" disabled={pending}>
            Add 30-minute slot <Plus size={17} />
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Upcoming appointment slots</h2>
        <QueryState query={query}>
          {(slots) =>
            slots.length ? (
              <div className="slot-list">
                {slots.map((s) => (
                  <div className="compact-row" key={s._id}>
                    <span>{date(s.start)}</span>
                    {s.appointment ? (
                      <Badge status="booked" />
                    ) : (
                      <IconButton
                        label={`Remove slot ${date(s.start)}`}
                        disabled={pending}
                        onClick={() => {
                          if (confirm("Remove this unbooked slot?"))
                            action(
                              () =>
                                api(`/doctor/slots/${s._id}`, {
                                  method: "DELETE",
                                }),
                              "Slot removed.",
                            );
                        }}
                      >
                        <X size={16} />
                      </IconButton>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No upcoming slots" />
            )
          }
        </QueryState>
      </section>
    </div>
  );
}

function Professional() {
  const query = useData("professional", "/doctor/profile");
  const { action, pending } = useApp();
  return (
    <QueryState query={query}>
      {(doctor) => (
        <section className="panel narrow">
          <h2>Professional profile</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = formValues(e.target);
              await action(
                () =>
                  api("/doctor/profile", {
                    method: "PATCH",
                    body: {
                      ...data,
                      fee: Math.round(Number(data.fee) * 100),
                      experience: Number(data.experience),
                    },
                  }),
                "Professional profile saved.",
              );
            }}
          >
            <Field
              label="Specialty"
              name="specialty"
              required
              maxLength={100}
              defaultValue={doctor.specialty}
            />
            <Field
              label="Qualifications"
              name="qualification"
              required
              maxLength={150}
              defaultValue={doctor.qualification}
            />
            <div className="form-grid">
              <Field
                label="Years of experience"
                name="experience"
                type="number"
                min="0"
                max="60"
                required
                defaultValue={doctor.experience}
              />
              <Field
                label="Consultation fee (₹)"
                name="fee"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                required
                defaultValue={doctor.fee / 100}
              />
            </div>
            <Field label="Mode">
              <select name="mode" defaultValue={doctor.mode}>
                <option value="online">online</option>
                <option value="in-person">in-person</option>
              </select>
            </Field>
            <Field label="Profile introduction">
              <textarea
                name="bio"
                required
                maxLength={1500}
                rows={4}
                defaultValue={doctor.bio}
              />
            </Field>
            <button className="btn" disabled={pending}>
              Save professional profile <Check size={17} />
            </button>
          </form>
        </section>
      )}
    </QueryState>
  );
}
export { Availability, Professional };
