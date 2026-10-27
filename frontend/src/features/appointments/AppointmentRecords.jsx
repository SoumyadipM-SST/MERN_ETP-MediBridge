import { FileText, Pill, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Empty } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../services/api.js";
import { date } from "../../utils/format.js";
import { PrescriptionCard } from "../commerce/Prescriptions.jsx";

export function AppointmentRecords({
  records = [],
  compact = false,
  history = false,
}) {
  const { user, action, pending } = useApp();
  const now = useNow();
  if (!records.length)
    return (
      <Empty title="No consultations in this view">
        Your appointment records will appear here.
      </Empty>
    );
  const change = (record, status) =>
    action(
      () =>
        api(`/appointments/${record._id}/status`, {
          method: "PATCH",
          body: { status },
        }),
      "Consultation status updated.",
    );
  return (
    <div className="record-list">
      {records.map((record) => {
        const active = ["booked", "confirmed"].includes(record.status);
        const joining =
          active &&
          now >= +new Date(record.start) - 1800000 &&
          now <= +new Date(record.end) + 1800000;
        const waiting =
          record.kind === "instant_test" && !record.video?.startedAt && active;
        const stage = waiting
          ? "waiting_for_doctor"
          : active
            ? now < +new Date(record.start)
              ? "upcoming"
              : now <= +new Date(record.end)
                ? "ongoing"
                : "past"
            : record.status;
        return (
          <article className="record" key={record._id}>
            <div className="record-header">
              <div>
                <span className="eyebrow">{date(record.start)}</span>
                <h3>
                  {user.role === "patient"
                    ? record.doctor?.user?.name
                    : record.patient?.name}
                </h3>
                <p>
                  {record.doctor?.specialty} · {record.reason}
                </p>
              </div>
              <Badge status={stage} />
            </div>
            {!compact && (
              <div className="record-actions">
                <Link className="btn small" to={`/consultations/${record._id}`}>
                  {waiting
                    ? "Open consultation request"
                    : joining
                      ? "Join consultation"
                      : "View consultation record"}
                </Link>
                {user.role === "patient" &&
                  active &&
                  (+new Date(record.start) > now ||
                    (record.kind === "instant_test" &&
                      !record.video?.startedAt)) && (
                    <button
                      className="text-link danger"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("Cancel this appointment and release its slot?"))
                          change(record, "cancelled");
                      }}
                    >
                      Cancel
                    </button>
                  )}
                {user.role === "doctor" && record.status === "booked" && (
                  <button
                    className="text-link"
                    disabled={pending}
                    onClick={() => change(record, "confirmed")}
                  >
                    {record.kind === "instant_test"
                      ? "Accept consultation"
                      : "Confirm"}
                  </button>
                )}
                {user.role === "doctor" && active && +new Date(record.end) < now && (
                  <button
                    className="text-link"
                    disabled={pending}
                    onClick={() => change(record, "missed")}
                  >
                    Mark missed
                  </button>
                )}
              </div>
            )}
            {history && (
              <div className="history-details-card">
                {/* 1. Clinical Consultation Notes */}
                <div className="history-subcard notes-card">
                  <div className="history-subcard-header">
                    <div className="subcard-title">
                      <FileText size={16} className="subcard-icon text-blue" />
                      <strong>Clinical consultation notes</strong>
                    </div>
                    {record.notes ? (
                      <span className="status-pill green">Recorded</span>
                    ) : (
                      <span className="status-pill neutral">No notes saved</span>
                    )}
                  </div>
                  {record.notes ? (
                    <div className="clinical-memo-box">
                      <p className="preserve-text">{record.notes}</p>
                    </div>
                  ) : (
                    <div className="clinical-empty-pill">
                      <span>No notes saved for this consultation session.</span>
                    </div>
                  )}
                </div>

                {/* 2. Medical Prescription */}
                <div className="history-subcard prescription-card-wrap">
                  <div className="history-subcard-header">
                    <div className="subcard-title">
                      <Pill size={16} className="subcard-icon text-teal" />
                      <strong>Medical prescription</strong>
                    </div>
                    {record.prescription ? (
                      <span className="status-pill teal">
                        {record.prescription.items?.length || 1} item
                        {record.prescription.items?.length !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="status-pill neutral">No prescription</span>
                    )}
                  </div>
                  {record.prescription ? (
                    <PrescriptionCard
                      rx={record.prescription}
                      appointment={record}
                    />
                  ) : (
                    <div className="clinical-empty-pill">
                      <span>
                        No associated prescription issued for this consultation.
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Related Medicine Orders */}
                <div className="history-subcard orders-card">
                  <div className="history-subcard-header">
                    <div className="subcard-title">
                      <ShoppingBag size={16} className="subcard-icon text-indigo" />
                      <strong>Related medicine orders</strong>
                    </div>
                    {record.orders?.length ? (
                      <span className="status-pill purple">
                        {record.orders.length} order
                        {record.orders.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="status-pill neutral">No orders</span>
                    )}
                  </div>
                  {record.orders?.length ? (
                    <div className="linked-orders-wrap">
                      {record.orders.map((order) => (
                        <div className="order-entry-row" key={order._id}>
                          <div className="order-entry-info">
                            <strong>
                              Order #{order._id.slice(-8).toUpperCase()}
                            </strong>
                            {order.items?.length ? (
                              <span className="order-entry-items">
                                {order.items.map((i) => i.name).join(", ")}
                              </span>
                            ) : null}
                          </div>
                          <div className="order-entry-actions">
                            <Badge status={order.status} />
                            {user.role === "patient" && (
                              <Link
                                className="btn small secondary"
                                to={`/history?tab=orders&order=${order._id}`}
                              >
                                View order →
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="clinical-empty-pill">
                      <span>
                        No medicine order is associated with this consultation.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
