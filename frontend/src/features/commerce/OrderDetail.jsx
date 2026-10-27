import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";

import { expiryLabel } from "../../components/Expiry.jsx";
import { Badge, Field, QueryState } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useData } from "../../hooks/useData.js";
import { API, api } from "../../services/api.js";
import { date, label, money } from "../../utils/format.js";

function OrderDetail({ order }) {
  const { user, action, pending } = useApp();
  const staff = user.role === "pharmacy";
  const rx = useData(
    ["order-rx", order.prescription],
    `/prescriptions/${order.prescription}`,
    { enabled: Boolean(order.prescription) },
  );
  const next = { confirmed: "packed", packed: "shipped", shipped: "delivered" }[
    order.status
  ];
  return (
    <div className="order-detail">
      <div className="detail-columns">
        <div>
          <span className="eyebrow">ORDER ITEMS & DELIVERY</span>
          {order.items.map((i) => (
            <div className="compact-row" key={i.medicine}>
              <span>
                {i.name} × {i.quantity}
                {i.requiresPrescription && " · Rx"}
                {i.batches?.length ? (
                  i.batches.map((batch) => (
                    <span className="table-sub" key={batch.batchId}>
                      {batch.label} · {batch.quantity} units · Expiry date:{" "}
                      {expiryLabel(batch.expiryDate)}
                    </span>
                  ))
                ) : (
                  <span className="table-sub">
                    Batch expiry not recorded for this existing order.
                  </span>
                )}
              </span>
              <strong>{money(i.quantity * i.price)}</strong>
            </div>
          ))}
          <p>
            <MapPin size={15} /> {order.address}
          </p>
          <p>
            Items {money(order.subtotal)} + shipping {money(order.shipping)} ={" "}
            <strong>{money(order.total)}</strong>
          </p>
          <Badge status={order.payment?.state || "pending"} />
        </div>
        <div>
          <span className="eyebrow">FULFILMENT TIMELINE</span>
          <ol className="timeline">
            {order.history.map((h, i) => (
              <li key={i}>
                <strong>{label(h.status)}</strong>
                <time>{date(h.at)}</time>
                <p>{h.reason}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {order.prescription && (
        <QueryState query={rx}>
          {(prescription) => (
            <div className="notice">
              <strong>
                Attached {prescription.kind} prescription ·{" "}
                {label(prescription.status)}
              </strong>
              {prescription.items.map((i) => (
                <p key={i.medicine}>
                  {i.name} · maximum quantity {i.quantity} · {i.instructions}
                </p>
              ))}
              <p>{prescription.instructions}</p>
              {prescription.file && (
                <a
                  className="text-link"
                  href={`${API}/api/files/${prescription.file}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download private document <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          )}
        </QueryState>
      )}
      {staff && order.status === "awaiting_review" && (
        <form
          className="review-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const decision = e.nativeEvent.submitter.value;
            const reason = e.target.reason.value;
            if (
              confirm(
                `${decision === "approved" ? "Approve this prescription and release the order for packing" : "Reject the prescription, cancel the order and process refund"}?`,
              )
            )
              await action(
                () =>
                  api(`/orders/${order._id}/review`, {
                    method: "POST",
                    body: { decision, reason },
                  }),
                "Prescription review recorded.",
              );
          }}
        >
          <h3>Explicit prescription review</h3>
          <p className="muted">
            Inspect the document or issued items, the quantities, and validity before
            deciding. Uploaded content has not been interpreted by the system.
          </p>
          <Field label="Decision reason">
            <textarea name="reason" required maxLength={500} rows={2} />
          </Field>
          <div className="record-actions">
            <button className="btn small" value="approved" disabled={pending}>
              Approve review
            </button>
            <button
              className="btn danger-btn small"
              value="rejected"
              disabled={pending}
            >
              Reject & cancel
            </button>
          </div>
        </form>
      )}
      <div className="record-actions">
        {staff && next && (
          <button
            className="btn small"
            disabled={pending}
            onClick={() =>
              action(
                () =>
                  api(`/orders/${order._id}/status`, {
                    method: "PATCH",
                    body: {
                      status: next,
                      reason: `Fulfilment status updated by the pharmacist.`,
                    },
                  }),
                `Order marked ${next}.`,
              )
            }
          >
            Mark {next} <ArrowRight size={14} />
          </button>
        )}
        {(["awaiting_review", "confirmed"].includes(order.status) ||
          (staff && order.status === "packed")) && (
          <button
            className="text-link danger"
            disabled={pending}
            onClick={() => {
              if (confirm("Cancel this order, restore stock and process refund?"))
                action(
                  () =>
                    api(`/orders/${order._id}/status`, {
                      method: "PATCH",
                      body: {
                        status: "cancelled",
                        reason: `Cancelled by ${user.role}.`,
                      },
                    }),
                  "Order cancelled; stock restored. Payment history shows the provider refund status.",
                );
            }}
          >
            Cancel order
          </button>
        )}
      </div>
    </div>
  );
}
export { OrderDetail };
