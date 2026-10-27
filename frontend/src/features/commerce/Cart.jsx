import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  Badge,
  Empty,
  Field,
  Loading,
  ProductArt,
  QueryState,
} from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useData } from "../../hooks/useData.js";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../services/api.js";
import { loadRazorpay } from "../../services/razorpay.js";
import { date, money } from "../../utils/format.js";

export function Cart() {
  const now = useNow();
  const { user, cart, cartQuery, action, pending } = useApp();
  const [params] = useSearchParams();
  const storageKey = `medibridge-checkout-${user._id}`;
  const [paymentId, setPaymentId] = useState(
    () => sessionStorage.getItem(storageKey) || "",
  );
  const [latest, setLatest] = useState(null),
    [message, setMessage] = useState("");
  const [prescription, setPrescription] = useState(params.get("prescription") || "");
  const [address, setAddress] = useState(user.address || "");
  const selectedId = paymentId || cart?.payment;
  const paymentQuery = useData(["checkout", selectedId], `/payments/${selectedId}`, {
    enabled: Boolean(selectedId),
  });
  const payment = latest || paymentQuery.data;
  const config = useData("payment-config", "/payments/config");
  const prescriptions = useData("prescriptions", "/prescriptions");
  const inCheckout = payment && ["creating", "pending"].includes(payment.state);
  function remember(result) {
    if (!result) return;
    setLatest(result);
    setPaymentId(result._id);
    sessionStorage.setItem(storageKey, result._id);
    setMessage(
      result.message ||
        (result.state === "pending"
          ? "Checkout is pending. Payment must be verified by the server."
          : ""),
    );
  }
  async function reconcile() {
    remember(
      await action(() =>
        api(`/payments/${selectedId}/reconcile`, { method: "POST" }),
      ),
    );
  }
  async function closeCheckout(id = selectedId) {
    remember(await action(() => api(`/payments/${id}/cancel`, { method: "POST" })));
  }
  async function pay(event) {
    event.preventDefault();
    setMessage("");
    let session = inCheckout
      ? payment
      : await action(() =>
          api("/payments", {
            method: "POST",
            body: {
              address,
              ...(prescription ? { prescription } : {}),
              idempotencyKey: crypto.randomUUID(),
            },
          }),
        );
    if (!session) return;
    remember(session);
    if (session.state !== "pending") {
      setMessage(
        "This checkout cannot be opened. Check its payment status or close it before trying again.",
      );
      return;
    }
    const Razorpay = await action(loadRazorpay);
    if (!Razorpay) return;
    let verifying = false;
    const checkout = new Razorpay({
      key: session.keyId,
      order_id: session.gatewayOrderId,
      amount: session.amount,
      currency: session.currency,
      name: "MediBridge",
      description: "Medicine order",
      prefill: { name: user.name, email: user.email, contact: user.phone },
      retry: { enabled: false },
      theme: { color: "#087b72" },
      handler: async (response) => {
        verifying = true;
        setMessage("Verifying payment with the backend. Please wait.");
        const result = await action(() =>
          api(`/payments/${session._id}/verify`, { method: "POST", body: response }),
        );
        if (result) remember(result);
        else
          setMessage(
            "Payment confirmation is pending. Use Check payment status; do not pay again.",
          );
      },
      modal: {
        ondismiss: () => {
          if (!verifying) closeCheckout(session._id);
        },
      },
    });
    checkout.on("payment.failed", async () => {
      setMessage(
        "The payment attempt failed. No order is confirmed. You can check its status or retry after closing checkout.",
      );
      await closeCheckout(session._id);
    });
    checkout.open();
  }
  const validPrescriptions = (prescriptions.data || []).filter(
    (rx) =>
      !rx.order &&
      ["issued", "approved"].includes(rx.status) &&
      +new Date(rx.expiresAt) > now,
  );
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <div className="page-title">
        <div>
          <span className="eyebrow">CART / SECURE CHECKOUT</span>
          <h1>Your cart & checkout</h1>
          <p>
            Prices and availability are checked by the backend. An order is confirmed
            only after payment verification.
          </p>
        </div>
      </div>
      {payment && (
        <section
          className={`notice ${["refund_pending", "failed"].includes(payment.state) ? "error" : ""}`}
        >
          <div className="content-heading">
            <strong>Payment: {payment.state.replaceAll("_", " ")}</strong>
            <Badge status={payment.state} />
          </div>
          <p>
            {message ||
              payment.message ||
              "No order is confirmed until Razorpay capture is checked by the backend."}
          </p>
          {payment.state === "paid" && payment.order ? (
            <Link
              className="btn small"
              to={`/history?tab=orders&order=${payment.order}`}
            >
              View confirmed order
            </Link>
          ) : (
            <div className="record-actions">
              <button
                className="btn secondary small"
                disabled={pending}
                onClick={reconcile}
              >
                Check payment status
              </button>
              {inCheckout && (
                <button
                  className="text-link"
                  disabled={pending}
                  onClick={() => closeCheckout()}
                >
                  Close pending checkout
                </button>
              )}
            </div>
          )}
        </section>
      )}
      <QueryState query={cartQuery}>
        {(data) =>
          !data.items.length ? (
            <Empty title="Your cart is empty">
              <Link className="text-link" to="/pharmacy">
                Browse medicines →
              </Link>
            </Empty>
          ) : (
            <div className="checkout-layout">
              <section>
                {data.items.map((item) => (
                  <article
                    className="cart-item"
                    key={item.medicine?._id || item.medicineId}
                  >
                    <ProductArt
                      product={item.medicine || { name: "Unavailable medicine" }}
                    />
                    <div>
                      <h3>{item.medicine?.name || "Unavailable medicine"}</h3>
                      <p>
                        {money(item.medicine?.price)} per pack ·{" "}
                        {item.medicine?.pack}
                      </p>
                      {!item.orderable && (
                        <p className="danger">
                          {item.medicine?.unavailabilityReason ||
                            "This item or quantity cannot currently be ordered."}
                        </p>
                      )}
                      <div className="quantity-control">
                        <button
                          className="icon-button"
                          aria-label={`Decrease ${item.medicine?.name}`}
                          disabled={pending || Boolean(data.payment)}
                          onClick={() =>
                            action(() =>
                              api("/cart/items", {
                                method: "PUT",
                                body: {
                                  medicine: item.medicine?._id || item.medicineId,
                                  quantity: item.quantity - 1,
                                },
                              }),
                            )
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          className="icon-button"
                          aria-label={`Increase ${item.medicine?.name}`}
                          disabled={
                            pending || Boolean(data.payment) || !item.orderable
                          }
                          onClick={() =>
                            action(() =>
                              api("/cart/items", {
                                method: "PUT",
                                body: {
                                  medicine: item.medicine._id,
                                  quantity: item.quantity + 1,
                                },
                              }),
                            )
                          }
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          className="text-link danger"
                          disabled={pending || Boolean(data.payment)}
                          onClick={() =>
                            action(() =>
                              api("/cart/items", {
                                method: "PUT",
                                body: {
                                  medicine: item.medicine?._id || item.medicineId,
                                  quantity: 0,
                                },
                              }),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <strong>{money(item.lineTotal)}</strong>
                  </article>
                ))}
              </section>
              <section className="panel">
                <h2>Order summary</h2>
                <div className="summary-lines">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(data.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Delivery charge</span>
                    <strong>{money(data.shipping)}</strong>
                  </div>
                  <div className="total-line">
                    <span>Total</span>
                    <strong>{money(data.total)}</strong>
                  </div>
                </div>
                <p className="footnote">
                  ₹49 below ₹500; free delivery at ₹500 and above. Fast, secure
                  checkout.
                </p>
                <form onSubmit={pay}>
                  <Field label="Delivery address">
                    <textarea
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      minLength={15}
                      maxLength={500}
                      required
                      rows={3}
                      disabled={Boolean(inCheckout)}
                    />
                  </Field>
                  <Field label="Prescription">
                    <select
                      value={prescription}
                      onChange={(event) => setPrescription(event.target.value)}
                      disabled={Boolean(inCheckout)}
                      required={data.items.some(
                        (item) => item.medicine?.requiresPrescription,
                      )}
                    >
                      <option value="">Select if required</option>
                      {validPrescriptions.map((rx) => (
                        <option key={rx._id} value={rx._id}>
                          {rx.kind === "digital"
                            ? "Doctor prescription"
                            : "Uploaded document"}{" "}
                          · {date(rx.issuedAt)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Link className="text-link" to="/history">
                    Upload or view prescription documents →
                  </Link>
                  {config.isPending ? (
                    <Loading />
                  ) : config.error ? (
                    <p className="notice error">
                      Payment configuration could not be loaded. Check the backend
                      connection.
                    </p>
                  ) : (
                    !config.data.configured && (
                      <p className="notice">
                        Payment gateway is not configured. Checkout cannot accept
                        payments yet.
                      </p>
                    )
                  )}
                  {!data.items.every((item) => item.orderable) && (
                    <p className="notice error">
                      Remove unavailable items or reduce quantities before checkout.
                    </p>
                  )}
                  {inCheckout && (
                    <p className="notice">
                      Server checkout total: {money(payment.amount)}. Cart changes
                      are locked until this checkout is completed or closed.
                    </p>
                  )}
                  <button
                    className="btn wide"
                    disabled={
                      pending ||
                      !config.data?.configured ||
                      !data.items.every((item) => item.orderable) ||
                      payment?.state === "refund_pending"
                    }
                  >
                    <ShoppingBag size={17} />
                    {pending
                      ? "Please wait…"
                      : inCheckout
                        ? "Resume Razorpay checkout"
                        : "Pay with Razorpay"}
                  </button>
                </form>
              </section>
            </div>
          )
        }
      </QueryState>
    </main>
  );
}
