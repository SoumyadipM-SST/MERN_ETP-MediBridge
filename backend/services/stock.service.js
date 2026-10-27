import { Medicine } from "../models/index.js";
import { ensure } from "../utils/lib.js";

// Expiry is a calendar date on the pack, valid through that day in India.
// Comparing ISO dates avoids dependence on the server's local timezone.
export function stockDate(now = new Date()) {
  return new Date(+now + 330 * 60_000).toISOString().slice(0, 10);
}

export function stockBatches(product) {
  return product.batches?.length
    ? product.batches.map((batch) => batch.toObject?.() || { ...batch })
    : [
        {
          batchId: "legacy",
          label: "Existing stock",
          expiryDate: null,
          stock: product.stock,
        },
      ];
}

export function eligibleBatches(product, today = stockDate()) {
  return stockBatches(product)
    .filter(
      (batch) => batch.stock > 0 && batch.expiryDate && batch.expiryDate >= today,
    )
    .sort(
      (a, b) =>
        a.expiryDate.localeCompare(b.expiryDate) ||
        a.batchId.localeCompare(b.batchId),
    );
}

export function medicineView(product) {
  const result = product.toObject?.() || { ...product };
  const today = stockDate();
  const soon = stockDate(new Date(Date.now() + 30 * 86400_000));
  result.batches = stockBatches(product).map((batch) => ({
    ...batch,
    expiryStatus: !batch.expiryDate
      ? "not_recorded"
      : batch.expiryDate < today
        ? "expired"
        : batch.expiryDate <= soon
          ? "expiring_soon"
          : "in_date",
  }));
  result.sellableStock = eligibleBatches(product, today).reduce(
    (sum, batch) => sum + batch.stock,
    0,
  );
  return result;
}

export async function allocateStock(medicineId, quantity, session) {
  const product = await Medicine.findById(medicineId).session(session);
  ensure(
    product?.active && product.available !== false,
    409,
    "A medicine became unavailable. A refund will be requested.",
  );
  const eligible = eligibleBatches(product);
  ensure(
    eligible.reduce((sum, batch) => sum + batch.stock, 0) >= quantity,
    409,
    `${product.name} has insufficient stock with a recorded, valid expiry date. A refund will be requested.`,
  );
  let remaining = quantity;
  const allocations = [];
  for (const batch of eligible) {
    const taken = Math.min(remaining, batch.stock);
    allocations.push({
      batchId: batch.batchId,
      label: batch.label,
      expiryDate: batch.expiryDate,
      quantity: taken,
    });
    remaining -= taken;
    if (!remaining) break;
  }
  product.batches = stockBatches(product).map((batch) => ({
    ...batch,
    stock:
      batch.stock -
      (allocations.find((item) => item.batchId === batch.batchId)?.quantity || 0),
  }));
  product.stock -= quantity;
  await product.save({ session }); // Concurrent stock/expiry edits conflict with this transactional write.
  return { product, allocations };
}

export async function validateFulfilment(order, session) {
  const products = await Medicine.find({
    _id: { $in: order.items.map((item) => item.medicine) },
  }).session(session);
  const today = stockDate();
  for (const item of order.items) {
    const product = products.find(
      (candidate) => String(candidate._id) === String(item.medicine),
    );
    ensure(
      product?.active && product.available !== false,
      409,
      `${item.name} is unavailable for fulfilment.`,
    );
    // Legacy orders have no batch allocation. Do not guess which pack was sold.
    ensure(
      item.batches?.length &&
        item.batches.reduce((sum, batch) => sum + batch.quantity, 0) ===
          item.quantity,
      409,
      `${item.name} has no recorded batch allocation. Cancel and reorder after inventory expiry is recorded.`,
    );
    for (const allocation of item.batches) {
      const batch = product.batches.find(
        (candidate) => candidate.batchId === allocation.batchId,
      );
      ensure(
        batch?.expiryDate &&
          batch.expiryDate >= today &&
          allocation.expiryDate >= today,
        409,
        `${item.name}: an allocated batch is expired or its expiry is unknown. Fulfilment is blocked.`,
      );
    }
    // Serialize fulfilment against a pharmacist changing expiry/availability.
    await Medicine.updateOne(
      { _id: product._id },
      { $inc: { stockVersion: 1 } },
      { session },
    );
  }
}
