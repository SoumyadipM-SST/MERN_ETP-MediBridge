import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Badge, Empty, QueryState } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useData } from "../../hooks/useData.js";
import { date, label, money } from "../../utils/format.js";
import { OrderDetail } from "./OrderDetail.jsx";

function Orders() {
  const { user } = useApp();
  const [filter, setFilter] = useState("");
  const query = useData(["orders", filter], `/orders?status=${filter}&limit=100`);
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("order"));
  return (
    <>
      <div className="content-heading">
        <h2>Orders & delivery tracking</h2>
        <select
          aria-label="Filter orders"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All order statuses</option>
          {[
            "awaiting_review",
            "confirmed",
            "packed",
            "shipped",
            "delivered",
            "cancelled",
          ].map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </div>
      <QueryState query={query}>
        {(items) =>
          items.length ? (
            <div className="record-list">
              {items.map((order) => (
                <article className="record" key={order._id}>
                  <button
                    className="order-summary"
                    aria-expanded={open === order._id}
                    onClick={() => setOpen(open === order._id ? null : order._id)}
                  >
                    <div>
                      <span className="eyebrow">
                        ORDER / {order._id.slice(-8).toUpperCase()}
                      </span>
                      <h3>{order.items.map((i) => i.name).join(", ")}</h3>
                      <p>
                        {order.appointment
                          ? "Order associated with a consultation"
                          : "Standalone medicine order"}
                      </p>
                      <p>
                        {date(order.createdAt)} · {order.patient?.name} ·{" "}
                        {money(order.total)}
                      </p>
                    </div>
                    <Badge status={order.status} />
                    <ChevronDown size={18} />
                  </button>
                  {open === order._id && <OrderDetail order={order} />}
                </article>
              ))}
            </div>
          ) : (
            <Empty title="No orders in this view">
              {user.role === "patient" ? (
                <Link to="/pharmacy">Browse medicines</Link>
              ) : (
                "Patient orders will appear here after verified checkout."
              )}
            </Empty>
          )
        }
      </QueryState>
    </>
  );
}
export { Orders };
