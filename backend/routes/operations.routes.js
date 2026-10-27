import { dashboard, history } from "../controllers/account.controller.js";
import * as inventory from "../controllers/inventory.controller.js";
import { roles } from "../middleware/auth.js";
import { staff, wrap } from "../utils/http.js";

export function registerOperationsRoutes(app) {
  app.get("/api/dashboard", wrap(dashboard));
  app.get("/api/history", roles("patient", "doctor"), wrap(history));
  app.get("/api/pharmacy/inventory", staff, wrap(inventory.inventory));
  app.post("/api/pharmacy/medicines", staff, wrap(inventory.createProduct));
  app.patch("/api/pharmacy/medicines/:id", staff, wrap(inventory.updateProduct));
  app.patch(
    "/api/pharmacy/medicines/:id/batches/:batchId",
    staff,
    wrap(inventory.editBatch),
  );
  app.patch(
    "/api/pharmacy/medicines/:id/availability",
    staff,
    wrap(inventory.availability),
  );
  app.post("/api/pharmacy/stock", staff, wrap(inventory.adjustStock));
  app.get("/api/pharmacy/history", staff, wrap(inventory.stockHistory));
}
