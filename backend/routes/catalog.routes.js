import {
  categories,
  doctor,
  doctors,
  medicine,
  medicines,
} from "../controllers/catalog.controller.js";
import { wrap } from "../utils/http.js";

function registerCatalogRoutes(app) {
  app.get("/api/categories", wrap(categories));
  app.get("/api/medicines", wrap(medicines));
  app.get("/api/medicines/:id", wrap(medicine));
  app.get("/api/doctors", wrap(doctors));
  app.get("/api/doctors/:id", wrap(doctor));
}
export { registerCatalogRoutes };
