import { z } from "zod";

import { Inventory, Medicine } from "../models/index.js";
import {
  adjustInventoryStock,
  createInventoryProduct,
  updateBatch,
} from "../services/inventory.service.js";
import { medicineView } from "../services/stock.service.js";
import { send } from "../utils/http.js";
import { ensure, id, parse, text, transaction } from "../utils/lib.js";
import { expiryDate, productFields } from "../utils/validation.js";

export async function inventory(_req, res) {
  return send(res, (await Medicine.find().sort("name")).map(medicineView));
}
export async function availability(req, res) {
  const body = parse(
    z.object({ available: z.boolean(), reason: text(500).min(3) }).strict(),
    req.body,
  );
  const product = await transaction(async (session) => {
    const result = await Medicine.findOneAndUpdate(
      { _id: parse(id, req.params.id) },
      {
        $set: {
          available: body.available,
          unavailabilityReason: body.available ? "" : body.reason,
        },
        $push: {
          availabilityHistory: {
            available: body.available,
            reason: body.reason,
            actor: req.user._id,
            at: new Date(),
          },
        },
      },
      { new: true, session, runValidators: true },
    );
    ensure(result, 404, "Medicine not found.");
    return result;
  });
  send(res, product);
}

export async function createProduct(req, res) {
  const body = parse(
    productFields.extend({ expiryDate, batchLabel: text(80) }).strict(),
    req.body,
  );
  const medicine = await createInventoryProduct(req.user, body);
  send(res, medicine, 201);
}

export async function updateProduct(req, res) {
  const body = parse(productFields.omit({ stock: true }).strict(), req.body);
  const medicine = await Medicine.findByIdAndUpdate(parse(id, req.params.id), body, {
    new: true,
    runValidators: true,
  });
  ensure(medicine, 404, "Product not found.");

  send(res, medicine);
}

export async function adjustStock(req, res) {
  const body = parse(
    z
      .object({
        medicine: id,
        delta: z.coerce
          .number()
          .int()
          .min(-100000)
          .max(100000)
          .refine((n) => n !== 0, "Enter a non-zero adjustment."),
        reason: text(500),
        batchId: text(80).optional(),
        batchLabel: text(80).optional(),
        expiryDate: expiryDate.optional(),
      })
      .strict(),
    req.body,
  );
  const medicine = await adjustInventoryStock(req.user, body);
  send(res, medicine);
}

export async function editBatch(req, res) {
  const body = parse(
    z.object({ label: text(80), expiryDate, reason: text(500).min(3) }).strict(),
    req.body,
  );
  send(
    res,
    await updateBatch(
      req.user,
      parse(id, req.params.id),
      parse(text(80), req.params.batchId),
      body,
    ),
  );
}

export async function stockHistory(_req, res) {
  return send(
    res,
    await Inventory.find()
      .sort("-createdAt")
      .limit(100)
      .populate("medicine", "name")
      .populate("actor", "name"),
  );
}
