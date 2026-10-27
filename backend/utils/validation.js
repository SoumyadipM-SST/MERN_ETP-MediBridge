import { z } from "zod";

import { id, quantity, text } from "./lib.js";

const credentials = z
  .object({
    email: z
      .email()
      .max(150)
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8)
      .max(72)
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Use at most 72 UTF-8 bytes for a password.",
      ),
  })
  .strict();
export const expiryDate = z.iso.date().nullable();
const productFields = z.object({
  name: text(120),
  brand: text(80),
  category: text(80),
  description: text(1500),
  pack: text(100),
  manufacturer: text(120),
  price: z.coerce.number().int().min(1).max(10000000),
  stock: z.coerce.number().int().min(0).max(100000),
  requiresPrescription: z.boolean(),
  active: z.boolean(),
  image: z.string().trim().max(10000000).optional().nullable(),
});
const rxFields = z
  .object({
    items: z
      .array(
        z.object({
          medicine: id,
          quantity,
          instructions: z.string().trim().max(500).default(""),
        }),
      )
      .min(1)
      .max(20),
    instructions: z.string().trim().max(2000).default(""),
    issue: z.boolean(),
  })
  .strict();
export { credentials, productFields, rxFields };
