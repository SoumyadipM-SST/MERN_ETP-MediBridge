import { roles } from "../middleware/auth.js";

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const send = (res, data, status = 200) => res.status(status).json({ data });
const patient = roles("patient");
const staff = roles("pharmacy");
export { wrap, send, patient, staff };
