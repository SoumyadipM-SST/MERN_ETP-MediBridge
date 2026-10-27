import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Badge, QueryState } from "../components/ui.jsx";
import { PrescriptionUpload } from "../features/commerce/Prescriptions.jsx";
import { ConsultationNotes } from "../features/consultation/ConsultationNotes.jsx";
import { Conversation } from "../features/consultation/Conversation.jsx";
import JitsiVideoRoom from "../features/consultation/JitsiVideoRoom.jsx";
import { PrescriptionEditor } from "../features/consultation/PrescriptionEditor.jsx";
import { RoomStage } from "../features/consultation/RoomStage.jsx";
import {
  VideoCountdown,
  videoRemaining,
} from "../features/consultation/VideoCountdown.jsx";
import { useApp } from "../hooks/useApp.js";
import { useData } from "../hooks/useData.js";
import { useNow } from "../hooks/useNow.js";
import { date } from "../utils/format.js";

function Consultation() {
  const { id } = useParams();
  const now = useNow(1000);
  const { user } = useApp();
  const query = useData(["consultation", id], `/consultations/${id}`, {
    refetchInterval: 5000,
  });
  const [joined, setJoined] = useState(false);
  const [video, setVideo] = useState(false);
  const closeVideo = useCallback(() => setVideo(false), []);
  const messages = useData(["messages", id], `/consultations/${id}/messages`, {
    enabled: ["doctor", "patient"].includes(user.role),
    refetchInterval: joined ? 2500 : false,
  });
  const prescriptions = useData("room-prescriptions", "/prescriptions", {
    enabled: ["doctor", "patient"].includes(user.role),
  });
  const products = useData("rx-products", "/medicines?limit=100", {
    enabled: user.role === "doctor",
  });
  return (
    <main id="main-content" tabIndex={-1} className="container section consultation">
      <Link className="back-link" to="/consultations?tab=mine">
        <ChevronLeft size={16} /> Back to your appointments
      </Link>
      <QueryState query={query.data ? { ...query, error: null } : query}>
        {(appointment) => {
          const ended =
            videoRemaining(appointment, now, query.dataUpdatedAt) === 0 ||
            ["completed", "cancelled", "missed"].includes(appointment.status);
          const rx = prescriptions.data?.find((p) => p.appointment === id);
          return (
            <>
              <div className="consultation-title">
                <div>
                  <span className="eyebrow">
                    CONSULTATION / AUTHORISED PARTICIPANTS
                  </span>
                  <h1>Consultation</h1>
                  <p>
                    {appointment.doctor.user.name} ↔ {appointment.patient.name} ·{" "}
                    {date(appointment.start)}
                  </p>
                </div>
                <Badge status={appointment.status} />
              </div>
              <div className="consultation-layout">
                <div>
                  <VideoCountdown
                    appointment={appointment}
                    receivedAt={query.dataUpdatedAt}
                  />
                  <RoomStage
                    appointment={appointment}
                    ended={ended}
                    joined={joined}
                    setJoined={setJoined}
                    video={video}
                    setVideo={setVideo}
                  />
                  {video && joined && !ended && (
                    <JitsiVideoRoom key={id} appointment={id} onClose={closeVideo} />
                  )}{" "}
                  {(joined || ended) && (
                    <Conversation id={id} ended={ended} messages={messages} />
                  )}
                </div>
                <aside>
                  <ConsultationNotes
                    id={id}
                    appointment={appointment}
                    joined={joined}
                    ended={ended}
                  />
                  {user.role === "doctor" &&
                    !["cancelled", "missed"].includes(appointment.status) &&
                    (!rx || rx.status === "draft") &&
                    products.data && (
                      <PrescriptionEditor
                        key={rx?._id || "new"}
                        appointment={id}
                        existing={rx}
                        products={products.data.items}
                        joined={joined || appointment.status === "completed"}
                      />
                    )}
                  {user.role === "doctor" &&
                    (!rx || rx.status === "draft") &&
                    (joined || appointment.status === "completed") && (
                      <section className="panel">
                        <PrescriptionUpload appointment={id} />
                      </section>
                    )}
                  <section className="panel">
                    <div className="content-heading">
                      <h3>Prescription</h3>
                      {rx && <Badge status={rx.status} />}
                    </div>
                    {rx ? (
                      <>
                        <p>{rx.instructions}</p>
                        {rx.items.map((i) => (
                          <div className="compact-row" key={i.medicine}>
                            <span>
                              {i.name}
                              <small className="table-sub">{i.instructions}</small>
                            </span>
                            <strong>×{i.quantity}</strong>
                          </div>
                        ))}
                        <Link className="text-link" to="/history">
                          View prescriptions <ArrowUpRight size={14} />
                        </Link>
                      </>
                    ) : (
                      <p className="muted">
                        An issued prescription will appear here when your doctor
                        creates one.
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            </>
          );
        }}
      </QueryState>
    </main>
  );
}
export { Consultation };
