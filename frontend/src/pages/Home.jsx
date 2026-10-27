import { Link } from "react-router-dom";

import { QueryState } from "../components/ui.jsx";
import { AppointmentRecords } from "../features/appointments/AppointmentRecords.jsx";
import { useApp } from "../hooks/useApp.js";
import { useData } from "../hooks/useData.js";
import { date, money } from "../utils/format.js";

export function Home() {
  const { user } = useApp();
  const query = useData("dashboard", "/dashboard");
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container section home-dashboard"
    >
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {user.role === "pharmacy" ? "Pharmacist" : user.role} / OVERVIEW
          </span>
          <h1>Hello, {user.name}.</h1>
          <p>
            Your consultations, medical records and pharmacy activity in one place.
          </p>
        </div>
        <Link className="btn secondary small" to="/profile">
          Your profile
        </Link>
      </div>
      <QueryState query={query}>
        {(data) =>
          user.role === "pharmacy" ? (
            <>
              <div className="dashboard-metrics">
                <div>
                  <strong>{data.medicineCount}</strong>
                  <span>Medicines in inventory</span>
                </div>
                <div>
                  <strong>{data.lowStock.length}</strong>
                  <span>Low-stock items</span>
                </div>
                <div>
                  <strong>{data.unavailable.length}</strong>
                  <span>Unavailable items</span>
                </div>
              </div>
              <div className="dashboard-columns">
                <section className="panel">
                  <div className="content-heading">
                    <h2>Orders requiring action</h2>
                    <Link to="/orders" className="text-link">
                      Manage orders →
                    </Link>
                  </div>
                  {data.orders.length ? (
                    data.orders.map((order) => (
                      <Link
                        className="compact-row"
                        key={order._id}
                        to={`/orders?order=${order._id}`}
                      >
                        <span>
                          {order.items.map((item) => item.name).join(", ")}
                        </span>
                        <strong>{money(order.total)}</strong>
                        <span>{order.status.replaceAll("_", " ")}</span>
                      </Link>
                    ))
                  ) : (
                    <p className="muted">No orders require action.</p>
                  )}
                </section>
                <section className="panel">
                  <h2>Inventory attention</h2>
                  {[
                    ...data.lowStock,
                    ...data.unavailable.filter(
                      (item) => !data.lowStock.some((low) => low._id === item._id),
                    ),
                  ]
                    .slice(0, 6)
                    .map((item) => (
                      <div className="compact-row" key={item._id}>
                        <span>{item.name}</span>
                        <span>
                          {item.available === false
                            ? item.unavailabilityReason
                            : `${item.sellableStock} eligible / ${item.stock} total units`}
                        </span>
                      </div>
                    ))}
                  <Link to="/inventory" className="text-link">
                    Manage medicines →
                  </Link>
                </section>
              </div>
              <section className="panel">
                <h2>Recent stock activity</h2>
                {data.activity.length ? (
                  data.activity.map((item) => (
                    <div className="compact-row" key={item._id}>
                      <span>{item.medicine?.name}</span>
                      <span>
                        {item.delta > 0 ? "+" : ""}
                        {item.delta} units · {item.reason}
                      </span>
                      <time>{date(item.createdAt)}</time>
                    </div>
                  ))
                ) : (
                  <p className="muted">No stock movements recorded yet.</p>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="account-summary">
                <div>
                  <span className="eyebrow">YOUR ACCOUNT</span>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <span>{user.phone || "Add a contact number in your profile"}</span>
                </div>
                <div className="record-actions">
                  <Link className="btn" to="/consultations">
                    {user.role === "doctor"
                      ? "View consultations"
                      : "Book a consultation"}
                  </Link>
                  {user.role === "patient" && (
                    <>
                      <Link className="btn secondary" to="/pharmacy">
                        Browse medicines
                      </Link>
                      <Link className="text-link" to="/cart">
                        Open cart →
                      </Link>
                    </>
                  )}
                </div>
              </section>
              <section className="home-section">
                <div className="content-heading">
                  <h2>Upcoming & ongoing consultations</h2>
                  <Link className="text-link" to="/consultations?tab=mine">
                    View all →
                  </Link>
                </div>
                <AppointmentRecords records={data.upcoming} />
              </section>
              <div className="dashboard-columns">
                <section className="panel">
                  <h2>Recent consultations</h2>
                  <AppointmentRecords records={data.recent} compact />
                  <Link className="text-link" to="/history">
                    Open history →
                  </Link>
                </section>
                <section className="panel">
                  <h2>
                    {user.role === "patient"
                      ? "Recent medicine orders"
                      : "Recent clinical activity"}
                  </h2>
                  {user.role === "patient" ? (
                    data.orders.length ? (
                      data.orders.map((order) => (
                        <Link
                          className="compact-row"
                          key={order._id}
                          to={`/history?tab=orders&order=${order._id}`}
                        >
                          <span>
                            {order.items.map((item) => item.name).join(", ")}
                          </span>
                          <span>{order.status.replaceAll("_", " ")}</span>
                        </Link>
                      ))
                    ) : (
                      <p className="muted">
                        Your medicine orders will appear after a verified checkout.
                      </p>
                    )
                  ) : (
                    <p>
                      {data.recent.length} recent consultation records are available
                      in your history.
                    </p>
                  )}
                  <h3 className="subheading">Prescriptions</h3>
                  {data.prescriptions.length ? (
                    data.prescriptions.map((rx) => (
                      <div className="compact-row" key={rx._id}>
                        <span>
                          {rx.kind === "upload"
                            ? "Uploaded prescription"
                            : rx.items.map((item) => item.name).join(", ")}
                        </span>
                        <span>{rx.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No prescription records yet.</p>
                  )}
                </section>
              </div>
            </>
          )
        }
      </QueryState>
    </main>
  );
}
