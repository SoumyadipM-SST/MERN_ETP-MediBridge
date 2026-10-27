import { cart, updateCart } from "../controllers/cart.controller.js";
import * as orders from "../controllers/orders.controller.js";
import * as rx from "../controllers/prescriptions.controller.js";
import { roles } from "../middleware/auth.js";
import { upload } from "../middleware/uploads.js";
import { patient, staff, wrap } from "../utils/http.js";

export function registerCommerceRoutes(app) {
  app.get("/api/cart", patient, wrap(cart));
  app.put("/api/cart/items", patient, wrap(updateCart));
  app.get("/api/payments/config", patient, wrap(orders.paymentConfig));
  app.post("/api/payments", patient, wrap(orders.checkout));
  app.get("/api/payments/:id", patient, wrap(orders.payment));
  app.post("/api/payments/:id/verify", patient, wrap(orders.verify));
  app.post("/api/payments/:id/reconcile", patient, wrap(orders.reconcile));
  app.post("/api/payments/:id/cancel", patient, wrap(orders.cancel));
  app.get("/api/orders", roles("patient", "pharmacy"), wrap(orders.orders));
  app.get("/api/orders/:id", roles("patient", "pharmacy"), wrap(orders.order));
  app.patch(
    "/api/orders/:id/status",
    roles("patient", "pharmacy"),
    wrap(orders.changeOrderStatus),
  );
  app.post("/api/orders/:id/review", staff, wrap(orders.reviewPrescriptionOrder));
  app.get("/api/prescriptions", roles("patient", "doctor"), wrap(rx.prescriptions));
  app.get(
    "/api/prescriptions/:id",
    roles("patient", "doctor", "pharmacy"),
    wrap(rx.prescription),
  );
  app.post(
    "/api/prescriptions/upload",
    patient,
    upload.single("file"),
    wrap(rx.uploadPrescription),
  );
  app.get(
    "/api/files/:id",
    roles("patient", "doctor", "pharmacy"),
    wrap(rx.downloadFile),
  );
  app.post("/api/prescriptions/:id/cart", patient, wrap(rx.prescriptionCart));
}
