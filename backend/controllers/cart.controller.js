import { z } from "zod";

import { Cart, Medicine } from "../models/index.js";
import { cartView, orderable } from "../services/commerce.service.js";
import { send } from "../utils/http.js";
import { ensure, id, parse, same, transaction } from "../utils/lib.js";

export async function cart(req, res) {
  return send(res, await cartView(req.user._id));
}

export async function updateCart(req, res) {
  const body = parse(
    z
      .object({
        medicine: id,
        quantity: z.coerce.number().int().min(0).max(99),
      })
      .strict(),
    req.body,
  );
  await transaction(async (session) => {
    let cart = await Cart.findOne({ user: req.user._id }).session(session);
    if (!cart)
      [cart] = await Cart.create([{ user: req.user._id, items: [] }], {
        session,
      });
    ensure(
      !cart.payment,
      409,
      "Finish or close the pending checkout before changing the cart.",
    );
    const medicine = await Medicine.findById(body.medicine).session(session);
    if (body.quantity)
      ensure(
        orderable(medicine, body.quantity),
        409,
        "That medicine or quantity is unavailable for ordering.",
      );
    cart.items = cart.items.filter((item) => !same(item.medicine, body.medicine));
    if (body.quantity) cart.items.push(body);
    await cart.save({ session });
  });
  send(res, await cartView(req.user._id));
}
