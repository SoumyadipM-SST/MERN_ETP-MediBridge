import { randomUUID } from "node:crypto";

import { Inventory, Medicine } from "../models/index.js";
import { ensure, transaction } from "../utils/lib.js";
import { medicineView, stockBatches } from "./stock.service.js";

export function getCategoryImage(category) {
  if (category === "First aid") return "/assets/first-aid.svg";
  if (category === "Personal care") return "/assets/care-bottle.svg";
  if (category === "Prescription medicines" || category === "Prescription demo")
    return "/assets/rx.svg";
  if (category === "Medical devices") return "/assets/device.svg";
  return "/assets/pack.svg";
}

export async function createInventoryProduct(user, body) {
  return await transaction(async (session) => {
    const { expiryDate, batchLabel, ...fields } = body;
    const defaultImage = getCategoryImage(body.category);
    const [created] = await Medicine.create(
      [
        {
          ...fields,
          batches: [
            {
              batchId: randomUUID(),
              label: batchLabel,
              expiryDate,
              stock: body.stock,
            },
          ],
          image: body.image || defaultImage,
          color: "#c1c8b2",
        },
      ],
      { session },
    );
    await Inventory.create(
      [
        {
          medicine: created._id,
          actor: user._id,
          delta: body.stock,
          reason: "Initial catalog stock",
        },
      ],
      { session },
    );

    return medicineView(created);
  });
}

export async function adjustInventoryStock(user, body) {
  return await transaction(async (session) => {
    const product = await Medicine.findById(body.medicine).session(session);
    ensure(product, 404, "Medicine not found.");
    const batches = stockBatches(product);
    let batch = batches.find((item) => item.batchId === body.batchId);
    if (!body.batchId) {
      ensure(
        body.delta > 0 && body.batchLabel && body.expiryDate,
        400,
        "A new batch needs a label, expiry date, and positive stock.",
      );
      ensure(
        batches.length < 100,
        409,
        "This product has reached its 100-batch limit.",
      );
      batch = {
        batchId: randomUUID(),
        label: body.batchLabel,
        expiryDate: body.expiryDate,
        stock: 0,
      };
      batches.push(batch);
    }
    ensure(
      batch && batch.stock + body.delta >= 0,
      409,
      "Choose an existing batch; its stock cannot become negative.",
    );
    ensure(
      product.stock + body.delta <= 100000,
      400,
      "Total stock cannot exceed 100,000 units.",
    );
    batch.stock += body.delta;
    product.batches = batches;
    product.stock += body.delta;
    await product.save({ session });
    await Inventory.create(
      [
        {
          medicine: product._id,
          delta: body.delta,
          reason: body.reason,
          batchId: batch.batchId,
          actor: user._id,
        },
      ],
      { session },
    );

    return medicineView(product);
  });
}

export async function updateBatch(user, medicineId, batchId, body) {
  return transaction(async (session) => {
    const product = await Medicine.findById(medicineId).session(session);
    ensure(product, 404, "Medicine not found.");
    const batches = stockBatches(product);
    const batch = batches.find((item) => item.batchId === batchId);
    ensure(batch, 404, "Batch not found.");
    batch.label = body.label;
    batch.expiryDate = body.expiryDate;
    product.batches = batches;
    await product.save({ session });
    await Inventory.create(
      [
        {
          medicine: product._id,
          actor: user._id,
          delta: 0,
          batchId,
          reason: `Batch ${body.label}: expiry ${body.expiryDate || "not recorded"}. ${body.reason}`,
        },
      ],
      { session },
    );
    return medicineView(product);
  });
}
