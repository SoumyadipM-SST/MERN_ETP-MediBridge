import { z } from "zod";

import { Order } from "../models/index.js";
import { changeOrder, reviewOrder } from "../services/commerce.service.js";
import {
  beginPayment,
  cancelPayment,
  ownedPayment,
  paymentConfigured,
  paymentView,
  reconcilePayment,
  requestRefund,
  verifyPayment,
} from "../services/payments.service.js";
import { send } from "../utils/http.js";
import { ensure, id, parse, same, text } from "../utils/lib.js";

export async function orders(req, res) {
  const filter = req.user.role === "patient" ? { patient: req.user._id } : {};
  if (req.query.status) filter.status = String(req.query.status);
  send(
    res,
    await Order.find(filter)
      .sort("-createdAt")
      .limit(100)
      .populate("patient", "name")
      .populate("payment", "state"),
  );
}
export async function order(req, res) {
  const result = await Order.findById(parse(id, req.params.id))
    .populate("patient", "name")
    .populate("payment", "state");
  ensure(result, 404, "Order not found.");
  ensure(
    req.user.role === "pharmacy" || same(result.patient, req.user._id),
    403,
    "This order is private.",
  );
  send(res, result);
}
export async function changeOrderStatus(req, res) {
  const body = parse(
    z
      .object({
        status: z.enum(["packed", "shipped", "delivered", "cancelled"]),
        reason: text(500),
      })
      .strict(),
    req.body,
  );
  const result = await changeOrder(
    req.user,
    parse(id, req.params.id),
    body.status,
    body.reason,
  );
  if (result.status === "cancelled") await requestRefund(result.payment);
  send(res, result);
}
export async function reviewPrescriptionOrder(req, res) {
  const body = parse(
    z
      .object({ decision: z.enum(["approved", "rejected"]), reason: text(500) })
      .strict(),
    req.body,
  );
  const result = await reviewOrder(
    req.user,
    parse(id, req.params.id),
    body.decision,
    body.reason,
  );
  if (result.status === "cancelled") await requestRefund(result.payment);
  send(res, result);
}
export function paymentConfig(_req, res) {
  send(res, { configured: paymentConfigured(), mode: "test" });
}
export async function checkout(req, res) {
  const body = parse(
    z
      .object({
        address: text(500).min(15),
        prescription: id.optional(),
        idempotencyKey: z.string().uuid(),
      })
      .strict(),
    req.body,
  );
  send(res, await beginPayment(req.user, body), 201);
}
export async function payment(req, res) {
  send(res, paymentView(await ownedPayment(req.user, parse(id, req.params.id))));
}
export async function verify(req, res) {
  const body = parse(
    z
      .object({
        razorpay_order_id: z.string().regex(/^order_\w+$/),
        razorpay_payment_id: z.string().regex(/^pay_\w+$/),
        razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
      })
      .strict(),
    req.body,
  );
  send(res, await verifyPayment(req.user, parse(id, req.params.id), body));
}
export async function reconcile(req, res) {
  send(res, await reconcilePayment(req.user, parse(id, req.params.id)));
}
export async function cancel(req, res) {
  send(res, await cancelPayment(req.user, parse(id, req.params.id)));
}
