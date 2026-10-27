import { rateLimit } from "express-rate-limit";

import {
  login,
  logout,
  me,
  register,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { wrap } from "../utils/http.js";

function registerAuthRoutes(app) {
  const loginLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.post("/api/auth/register", loginLimit, wrap(register));
  app.post("/api/auth/login", loginLimit, wrap(login));
  app.get("/api/auth/me", authenticate, wrap(me));
  app.post("/api/auth/logout", authenticate, wrap(logout));
  app.patch("/api/users/me", authenticate, wrap(updateProfile));
}
export { registerAuthRoutes };
