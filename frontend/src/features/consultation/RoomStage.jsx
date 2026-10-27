import { ArrowRight, Check, MessageCircle, Video } from "lucide-react";

import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";

function RoomStage({ appointment, ended, joined, setJoined, video, setVideo }) {
  const { user, action, pending } = useApp();
  const id = appointment._id;
  const instantWaiting =
    appointment.kind === "instant_test" && !appointment.video?.startedAt && !ended;
  return (
    <section className="room-stage">
      <div className="room-stage-top">
        <span>
          <span className="live-dot" />
          {ended
            ? "CONSULTATION RECORD"
            : joined
              ? "CONSULTATION WORKSPACE OPEN"
              : "READY WHEN YOU ARE"}
        </span>
        <span>CONSULTATION WORKSPACE</span>
      </div>
      <div className="room-participants">
        <div className="room-person">
          <span className="avatar">
            {appointment.doctor.user.name.replace("Dr. ", "")[0]}
          </span>
          <strong>{appointment.doctor.user.name}</strong>
          <span>Doctor</span>
        </div>
        <div className="room-bridge">
          <MessageCircle size={29} />
          <span>↔</span>
        </div>
        <div className="room-person">
          <span className="avatar patient-avatar">
            {appointment.patient.name[0]}
          </span>
          <strong>{appointment.patient.name}</strong>
          <span>Patient</span>
        </div>
      </div>
      <div className="room-status">
        <Video size={17} />
        <span>
          {ended
            ? "This consultation has ended. Your clinical records remain available."
            : appointment.videoAvailable
              ? "Live video consultation workspace. Beginning the consultation connects both participants."
              : "Consultation records remain available."}
        </span>
      </div>
      {instantWaiting && (
        <div className="notice" role="status">
          <strong>Consultation request · waiting for the assigned doctor</strong>
          <p>
            {appointment.status === "booked"
              ? "The assigned doctor must accept this request from Consultations → Upcoming & ongoing, then begin the consultation."
              : "The doctor has accepted. Waiting for the doctor to begin the consultation session."}
          </p>
          <p>
            Please ensure your audio and video permissions are ready when the
            consultation begins.
          </p>
          {user.role === "doctor" && appointment.status === "booked" && (
            <button
              className="btn small"
              disabled={pending}
              onClick={() =>
                action(
                  () =>
                    api(`/appointments/${id}/status`, {
                      method: "PATCH",
                      body: { status: "confirmed" },
                    }),
                  "Consultation request accepted. Begin when both participants are ready.",
                )
              }
            >
              Accept consultation
            </button>
          )}
          {user.role === "patient" && (
            <button
              className="btn secondary small"
              disabled={pending}
              onClick={async () => {
                if (!confirm("Cancel this waiting consultation request?")) return;
                await action(
                  () =>
                    api(`/appointments/${id}/status`, {
                      method: "PATCH",
                      body: { status: "cancelled" },
                    }),
                  "Waiting consultation request cancelled.",
                );
              }}
            >
              Cancel consultation request
            </button>
          )}
        </div>
      )}
      {!ended && (
        <div className="room-controls">
          {joined && appointment.videoAvailable && !video && (
            <button className="btn light" onClick={() => setVideo(true)}>
              Join video call <Video size={16} />
            </button>
          )}
          {!joined ? (
            <button
              className="btn light"
              disabled={pending || !appointment.canJoin}
              onClick={async () => {
                const result = await action(
                  () =>
                    api(`/consultations/${id}/join`, {
                      method: "POST",
                    }),
                  "Consultation workspace opened.",
                );
                if (result) setJoined(true);
              }}
            >
              {instantWaiting && user.role === "patient"
                ? "Waiting for the assigned doctor"
                : appointment.video?.startedAt
                  ? "Join existing consultation"
                  : "Begin consultation"}{" "}
              <ArrowRight size={17} />
            </button>
          ) : (
            <button
              className="btn light"
              onClick={() => {
                setJoined(false);
                setVideo(false);
              }}
            >
              Leave room
            </button>
          )}
          {user.role === "doctor" && appointment.consultationStatus === "active" && (
            <button
              className="btn room-complete"
              disabled={pending}
              onClick={async () => {
                if (
                  !confirm(
                    "Complete this consultation? Video access and chat will close. Clinical records remain available.",
                  )
                )
                  return;
                const result = await action(
                  () =>
                    api(`/appointments/${id}/status`, {
                      method: "PATCH",
                      body: { status: "completed" },
                    }),
                  "Consultation completed.",
                );
                if (result) {
                  setJoined(false);
                  setVideo(false);
                }
              }}
            >
              Complete consultation <Check size={17} />
            </button>
          )}
        </div>
      )}
      {!ended && !appointment.canJoin && !instantWaiting && (
        <p className="room-window">
          The room opens 30 minutes before the appointment and closes 30 minutes
          after it ends.
        </p>
      )}
    </section>
  );
}
export { RoomStage };
