import {
  Cart,
  Inventory,
  Medicine,
  Order,
  Payment,
  Prescription,
} from "../models/index.js";
import { ensure, same, transaction } from "../utils/lib.js";
import {
  allocateStock,
  eligibleBatches,
  medicineView,
  stockBatches,
  validateFulfilment,
} from "./stock.service.js";

export function orderable(product, quantity = 1) {
  return (
    product?.active &&
    product.available !== false &&
    eligibleBatches(product).reduce((sum, batch) => sum + batch.stock, 0) >= quantity
  );
}

export async function cartView(user) {
  const cart = await Cart.findOne({ user });
  const medicineIds = cart?.items.map((item) => item.medicine) || [];
  await cart?.populate("items.medicine");
  const items = (cart?.items || []).map((item, index) => ({
    medicineId: medicineIds[index],
    medicine: item.medicine ? medicineView(item.medicine) : null,
    quantity: item.quantity,
    lineTotal: (item.medicine?.price || 0) * item.quantity,
    orderable: Boolean(orderable(item.medicine, item.quantity)),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 0 && subtotal < 50000 ? 4900 : 0;
  return {
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    payment: cart?.payment,
  };
}

export async function checkPrescription(userId, prescriptionId, items, session) {
  const needed = items.some((item) => item.requiresPrescription);
  if (!needed && !prescriptionId) return null;
  const rx = await Prescription.findOne({
    _id: prescriptionId,
    patient: userId,
    status: { $in: ["issued", "approved"] },
    expiresAt: { $gt: new Date() },
    order: { $exists: false },
  }).session(session);
  ensure(rx, 400, "Select a valid, unused prescription belonging to you.");
  if (rx.kind === "digital")
    for (const item of items.filter((line) => line.requiresPrescription)) {
      const prescribed = rx.items.find((line) => same(line.medicine, item.medicine));
      ensure(
        prescribed && prescribed.quantity >= item.quantity,
        400,
        `${item.name} is not covered by this prescription quantity.`,
      );
    }
  return rx;
}

export async function preparePayment(user, body) {
  return transaction(async (session) => {
    const cart = await Cart.findOneAndUpdate(
      { user: user._id },
      { $set: { updatedAt: new Date() } },
      { new: true, session },
    );
    ensure(cart?.items.length, 400, "Your cart is empty.");
    const products = await Medicine.find({
      _id: { $in: cart.items.map((line) => line.medicine) },
    }).session(session);
    for (const line of cart.items) {
      const product = products.find((item) => same(item._id, line.medicine));
      ensure(
        orderable(product, line.quantity),
        409,
        `${product?.name || "An item"} has insufficient available stock with a recorded, valid expiry date.`,
      );
    }
    if (cart.payment) {
      const pending = await Payment.findById(cart.payment).session(session);
      if (pending && ["creating", "pending"].includes(pending.state)) {
        ensure(
          pending.gatewayOrderId,
          409,
          "Checkout is being prepared. Please retry in a moment.",
        );
        return { payment: pending, created: false };
      }
    }
    const previous = await Payment.findOne({
      patient: user._id,
      idempotencyKey: body.idempotencyKey,
    }).session(session);
    if (previous) return { payment: previous, created: false };
    const items = [];
    for (const line of cart.items) {
      const product = products.find((item) => same(item._id, line.medicine));
      ensure(
        orderable(product, line.quantity),
        409,
        `${product?.name || "An item"} is out of stock or unavailable for ordering.`,
      );
      items.push({
        medicine: product._id,
        name: product.name,
        quantity: line.quantity,
        price: product.price,
        requiresPrescription: product.requiresPrescription,
      });
    }
    await checkPrescription(user._id, body.prescription, items, session);
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    const shipping = subtotal < 50000 ? 4900 : 0;
    const [payment] = await Payment.create(
      [
        {
          patient: user._id,
          idempotencyKey: body.idempotencyKey,
          items,
          address: body.address,
          prescription: body.prescription,
          subtotal,
          shipping,
          amount: subtotal + shipping,
        },
      ],
      { session },
    );
    cart.payment = payment._id;
    await cart.save({ session });
    return { payment, created: true };
  });
}

export async function finalizeOrder(paymentId, gatewayPayment) {
  return transaction(async (session) => {
    const payment = await Payment.findById(paymentId).session(session);
    if (payment.state === "paid")
      return Order.findById(payment.order).session(session);
    ensure(
      payment.state === "pending",
      409,
      "This checkout was cancelled or is no longer active.",
    );
    const cart = await Cart.findOneAndUpdate(
      { user: payment.patient, payment: payment._id },
      { $set: { updatedAt: new Date() } },
      { new: true, session },
    );
    ensure(cart, 409, "The original checkout is no longer active.");
    const items = [];
    for (const line of payment.items) {
      const { product, allocations } = await allocateStock(
        line.medicine,
        line.quantity,
        session,
      );
      items.push({
        ...line.toObject(),
        requiresPrescription: product.requiresPrescription,
        batches: allocations,
      });
    }
    const rx = await checkPrescription(
      payment.patient,
      payment.prescription,
      items,
      session,
    );
    const status = items.some((item) => item.requiresPrescription)
      ? "awaiting_review"
      : "confirmed";
    const [order] = await Order.create(
      [
        {
          patient: payment.patient,
          items,
          subtotal: payment.subtotal,
          shipping: payment.shipping,
          total: payment.amount,
          address: payment.address,
          prescription: rx?._id,
          appointment: rx?.appointment,
          status,
          payment: payment._id,
          idempotencyKey: payment.idempotencyKey,
          history: [
            {
              status,
              at: new Date(),
              actor: payment.patient,
              reason:
                "Razorpay test payment verified by the backend; stock allocated.",
            },
          ],
        },
      ],
      { session },
    );
    if (rx) {
      rx.order = order._id;
      await rx.save({ session });
    }
    for (const item of items)
      await Inventory.create(
        [
          {
            medicine: item.medicine,
            actor: payment.patient,
            delta: -item.quantity,
            reason: `Order ${order._id}`,
          },
        ],
        { session },
      );
    cart.items = [];
    cart.payment = undefined;
    await cart.save({ session });
    payment.state = "paid";
    payment.gatewayPaymentId = gatewayPayment.id;
    payment.order = order._id;
    payment.message = "Test payment verified and order confirmed.";
    await payment.save({ session });
    return order;
  });
}

async function restoreStock(order, actor, session) {
  for (const item of order.items) {
    const product = await Medicine.findById(item.medicine).session(session);
    ensure(
      product,
      409,
      "The original inventory record is missing; stock cannot be restored safely.",
    );
    const batches = stockBatches(product);
    const allocations = item.batches?.length
      ? item.batches
      : [
          {
            batchId: "legacy",
            label: "Existing stock",
            expiryDate: null,
            quantity: item.quantity,
          },
        ];
    for (const allocation of allocations) {
      let batch = batches.find((entry) => entry.batchId === allocation.batchId);
      if (!batch) {
        batch = {
          batchId: allocation.batchId,
          label: allocation.label,
          expiryDate: allocation.expiryDate,
          stock: 0,
        };
        batches.push(batch);
      }
      batch.stock += allocation.quantity;
    }
    product.batches = batches;
    product.stock += item.quantity;
    await product.save({ session });
    await Inventory.create(
      [
        {
          medicine: item.medicine,
          actor,
          delta: item.quantity,
          reason: `Cancelled order ${order._id}`,
        },
      ],
      { session },
    );
  }
}

export async function changeOrder(user, orderId, status, reason) {
  return transaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    ensure(order, 404, "Order not found.");
    ensure(
      user.role === "pharmacy" ||
        (same(order.patient, user._id) &&
          status === "cancelled" &&
          ["awaiting_review", "confirmed"].includes(order.status)),
      403,
      "You cannot change this order.",
    );
    const transitions = {
      awaiting_review: ["cancelled"],
      confirmed: ["packed", "cancelled"],
      packed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };
    ensure(
      transitions[order.status]?.includes(status),
      409,
      "That order transition is not permitted. Complete prescription review before packing.",
    );
    if (status === "cancelled") await restoreStock(order, user._id, session);
    else await validateFulfilment(order, session);
    order.status = status;
    order.history.push({ status, at: new Date(), actor: user._id, reason });
    await order.save({ session });
    return order;
  });
}

export async function reviewOrder(user, orderId, decision, reason) {
  ensure(
    user.role === "pharmacy",
    403,
    "Only pharmacists can review prescription orders.",
  );
  return transaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    ensure(
      order?.status === "awaiting_review",
      409,
      "This order is not awaiting review.",
    );
    const rx = await Prescription.findById(order.prescription).session(session);
    ensure(rx && rx.status !== "draft", 409, "An issued prescription is required.");
    ensure(
      decision === "rejected" || +rx.expiresAt > Date.now(),
      409,
      "The prescription has expired; reject the review.",
    );
    if (decision === "approved") await validateFulfilment(order, session);
    rx.status = decision;
    rx.reviews.push({ reviewer: user._id, decision, reason, at: new Date() });
    await rx.save({ session });
    order.status = decision === "approved" ? "confirmed" : "cancelled";
    if (decision === "rejected") await restoreStock(order, user._id, session);
    order.history.push({
      status: order.status,
      at: new Date(),
      actor: user._id,
      reason,
    });
    await order.save({ session });
    return order;
  });
}
