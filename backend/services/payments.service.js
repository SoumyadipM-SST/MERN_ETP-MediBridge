import { createHmac, timingSafeEqual } from "node:crypto";

import { Cart, Payment } from "../models/index.js";
import { AppError, ensure, same } from "../utils/lib.js";
import { finalizeOrder, preparePayment } from "./commerce.service.js";

export const paymentConfigured = () =>
  /^rzp_test_/.test(process.env.RAZORPAY_KEY_ID || "") &&
  Boolean(process.env.RAZORPAY_KEY_SECRET);

async function gateway(path, method = "GET", body) {
  ensure(
    paymentConfigured(),
    503,
    "Razorpay test mode is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.",
  );
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError(
      503,
      "Razorpay could not be reached. Check payment status before retrying.",
    );
  }
  const data = await response.json().catch(() => {
    throw new AppError(
      502,
      "Razorpay returned an unreadable response. Check payment status before retrying.",
    );
  });
  ensure(
    ![401, 403].includes(response.status),
    503,
    "Razorpay rejected the test credentials. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env; use keys from the same Test Mode pair.",
  );
  ensure(
    response.ok,
    502,
    "Razorpay could not complete this request. Check the test-mode configuration or retry payment status.",
  );
  return data;
}

export function paymentView(payment) {
  return {
    _id: payment._id,
    state: payment.state,
    amount: payment.amount,
    currency: payment.currency,
    gatewayOrderId: payment.gatewayOrderId,
    order: payment.order,
    message: payment.message,
    keyId: paymentConfigured() ? process.env.RAZORPAY_KEY_ID : undefined,
  };
}

export async function ownedPayment(user, id) {
  const payment = await Payment.findById(id);
  ensure(payment && same(payment.patient, user._id), 404, "Payment not found.");
  return payment;
}

export async function beginPayment(user, body) {
  ensure(
    paymentConfigured(),
    503,
    "Configure Razorpay test keys in backend/.env before paying. No order has been created.",
  );
  const { payment, created } = await preparePayment(user, body);
  if (!created) return paymentView(payment);
  try {
    const order = await gateway("/orders", "POST", {
      amount: payment.amount,
      currency: "INR",
      receipt: String(payment._id),
    });
    ensure(
      order.id && order.amount === payment.amount && order.currency === "INR",
      502,
      "Razorpay returned an invalid order.",
    );
    payment.gatewayOrderId = order.id;
    payment.state = "pending";
    await payment.save();
    return paymentView(payment);
  } catch (error) {
    payment.state = "failed";
    payment.message = "Checkout could not be prepared. No payment was confirmed.";
    await payment.save();
    await Cart.updateOne(
      { user: user._id, payment: payment._id },
      { $unset: { payment: 1 } },
    );
    throw error;
  }
}

export function verifySignature(orderId, paymentId, signature) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return (
    /^[a-f0-9]{64}$/i.test(signature) &&
    timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))
  );
}

export async function requestRefund(paymentId) {
  const payment = await Payment.findById(paymentId);
  if (!payment?.gatewayPaymentId || payment.state === "refunded") return;
  const claimed = await Payment.findOneAndUpdate(
    {
      _id: paymentId,
      $or: [
        { state: { $in: ["paid", "pending", "cancelled"] } },
        {
          state: "refund_pending",
          gatewayRefundId: { $exists: false },
          refundAttemptAt: { $lt: new Date(Date.now() - 30000) },
        },
      ],
    },
    {
      $set: {
        state: "refund_pending",
        refundAttemptAt: new Date(),
        message:
          "Payment was captured, but this order cannot be fulfilled. Refund is being checked with Razorpay.",
      },
    },
    { new: true },
  );
  if (!claimed) return;
  try {
    const existing = await gateway(`/payments/${payment.gatewayPaymentId}/refunds`);
    let refund = existing.items?.find(
      (item) =>
        item.amount === payment.amount &&
        ["pending", "processed"].includes(item.status),
    );
    if (!refund)
      refund = await gateway(
        `/payments/${payment.gatewayPaymentId}/refund`,
        "POST",
        { amount: payment.amount, receipt: String(payment._id) },
      );
    await Payment.updateOne(
      { _id: paymentId },
      {
        $set: {
          gatewayRefundId: refund.id,
          state: refund.status === "processed" ? "refunded" : "refund_pending",
          message:
            refund.status === "processed"
              ? "Razorpay confirms the test refund."
              : "Razorpay refund requested; processing is pending.",
        },
      },
    );
  } catch {
    /* Keep the explicit pending state; never report a refund that the provider has not confirmed. */
  }
}

async function settle(payment, proof) {
  ensure(
    proof.order_id === payment.gatewayOrderId &&
      proof.amount === payment.amount &&
      proof.currency === payment.currency,
    400,
    "Payment order, amount or currency does not match the server checkout.",
  );
  ensure(
    proof.status === "captured" && proof.captured === true,
    409,
    "Payment is not captured yet. Use Check payment status; do not pay again.",
  );
  if (payment.state === "paid") return paymentView(payment);
  if (["refund_pending", "refunded"].includes(payment.state))
    return paymentView(payment);
  try {
    await finalizeOrder(payment._id, proof);
  } catch (error) {
    if (error.status && [400, 409].includes(error.status)) {
      await Payment.updateOne(
        { _id: payment._id, state: { $ne: "paid" } },
        { $set: { gatewayPaymentId: proof.id, message: error.message } },
      );
      await requestRefund(payment._id);
      await Cart.updateOne({ payment: payment._id }, { $unset: { payment: 1 } });
    } else throw error;
  }
  return paymentView(await Payment.findById(payment._id));
}

export async function verifyPayment(user, id, body) {
  const payment = await ownedPayment(user, id);
  ensure(paymentConfigured(), 503, "Razorpay test keys are not configured.");
  ensure(
    body.razorpay_order_id === payment.gatewayOrderId &&
      verifySignature(
        payment.gatewayOrderId,
        body.razorpay_payment_id,
        body.razorpay_signature,
      ),
    400,
    "Payment signature could not be verified.",
  );
  return settle(payment, await gateway(`/payments/${body.razorpay_payment_id}`));
}

export async function reconcilePayment(user, id) {
  const payment = await ownedPayment(user, id);
  if (payment.state === "refund_pending" && payment.gatewayPaymentId) {
    await requestRefund(payment._id);
    const proof = await gateway(`/payments/${payment.gatewayPaymentId}`);
    if (proof.amount_refunded >= payment.amount) {
      payment.state = "refunded";
      payment.message = "Razorpay confirms the test refund.";
      await payment.save();
    }
    return paymentView(await Payment.findById(payment._id));
  }
  if (
    ["paid", "refunded", "failed"].includes(payment.state) ||
    !payment.gatewayOrderId
  )
    return paymentView(payment);
  const result = await gateway(`/orders/${payment.gatewayOrderId}/payments`);
  const captured = result.items?.find((item) => item.status === "captured");
  return captured ? settle(payment, captured) : paymentView(payment);
}

export async function cancelPayment(user, id) {
  let view = await reconcilePayment(user, id);
  if (["paid", "refund_pending", "refunded"].includes(view.state)) return view;
  const payment = await Payment.findOneAndUpdate(
    { _id: id, patient: user._id, state: { $in: ["pending", "creating"] } },
    {
      $set: {
        state: "cancelled",
        message:
          "Checkout closed. No order is confirmed. Check payment status if your bank shows a payment.",
      },
    },
    { new: true },
  );
  await Cart.updateOne({ user: user._id, payment: id }, { $unset: { payment: 1 } });
  return payment ? paymentView(payment) : view;
}
