import { Check } from "lucide-react";

import { Field } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";

function ConsultationNotes({ id, appointment, joined, ended }) {
  const { user, action, pending } = useApp();
  return (
    <section className="panel">
      <span className="eyebrow">THE CONSULTATION RECORD</span>
      <h2>Consultation notes</h2>
      {user.role === "doctor" && (!ended || appointment.status === "completed") ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await action(
              () =>
                api(`/consultations/${id}/notes`, {
                  method: "PUT",
                  body: { notes: e.target.notes.value },
                }),
              "Consultation notes saved.",
            );
          }}
        >
          <Field label="Consultation notes">
            <textarea
              name="notes"
              defaultValue={appointment.notes}
              rows={6}
              maxLength={10000}
              required
            />
          </Field>
          <button
            className="btn secondary small"
            disabled={pending || (!joined && appointment.status !== "completed")}
          >
            Save notes <Check size={14} />
          </button>
          {!joined && appointment.status !== "completed" && (
            <p className="footnote">
              Open the consultation workspace before saving notes.
            </p>
          )}
        </form>
      ) : (
        <p className="preserve-text">
          {appointment.notes || "No consultation notes have been saved."}
        </p>
      )}
    </section>
  );
}
export { ConsultationNotes };
