import { publicUser } from "../middleware/auth.js";
import {
  Appointment,
  Doctor,
  Inventory,
  Medicine,
  Order,
  Prescription,
} from "../models/index.js";
import { medicineView } from "../services/stock.service.js";
import { send } from "../utils/http.js";
import { ensure } from "../utils/lib.js";

async function clinicalRecords(user) {
  const filter = user.role === "patient" ? { patient: user._id } : {};
  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: user._id });
    ensure(doctor, 404, "Doctor profile not found.");
    filter.doctor = doctor._id;
  }
  const appointments = await Appointment.find(filter)
    .sort("-start")
    .limit(150)
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .populate("patient", "name");
  const rxFilter =
    user.role === "patient"
      ? { patient: user._id, status: { $ne: "draft" } }
      : { appointment: { $in: appointments.map((item) => item._id) } };
  const prescriptions = await Prescription.find(rxFilter)
    .sort("-createdAt")
    .limit(150)
    .populate({ path: "doctor", populate: { path: "user", select: "name" } });
  const orders =
    user.role === "patient"
      ? await Order.find({ patient: user._id })
          .sort("-createdAt")
          .limit(100)
          .populate("payment", "state")
      : await Order.find({
          prescription: { $in: prescriptions.map((item) => item._id) },
        }).select("appointment prescription status createdAt items.name");
  const linkedOrders = orders.map((item) => ({
    ...item.toObject(),
    appointment:
      item.appointment ||
      prescriptions.find((rx) => String(rx._id) === String(item.prescription))
        ?.appointment ||
      null,
  }));
  return {
    appointments: appointments.map((item) => ({
      ...item.toObject(),
      prescription:
        prescriptions.find((rx) => String(rx.appointment) === String(item._id)) ||
        null,
      orders: linkedOrders.filter(
        (order) => String(order.appointment) === String(item._id),
      ),
    })),
    orders: linkedOrders,
    prescriptions,
  };
}
export async function history(req, res) {
  send(res, await clinicalRecords(req.user));
}
export async function dashboard(req, res) {
  if (req.user.role !== "pharmacy") {
    const data = await clinicalRecords(req.user);
    const upcoming = data.appointments
      .filter(
        (item) =>
          ["booked", "confirmed"].includes(item.status) &&
          +new Date(item.end) > Date.now(),
      )
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
    return send(res, {
      user: publicUser(req.user),
      upcoming: upcoming.slice(0, 5),
      recent: data.appointments
        .filter(
          (item) => !upcoming.some((next) => String(next._id) === String(item._id)),
        )
        .slice(0, 4),
      orders: data.orders.slice(0, 4),
      prescriptions: data.prescriptions.slice(0, 4),
    });
  }
  const [products, orders, activity] = await Promise.all([
    Medicine.find().select(
      "name active available stock batches unavailabilityReason",
    ),
    Order.find({
      status: { $in: ["awaiting_review", "confirmed", "packed", "shipped"] },
    })
      .sort("-createdAt")
      .limit(10)
      .populate("patient", "name"),
    Inventory.find()
      .sort("-createdAt")
      .limit(5)
      .populate("medicine", "name")
      .populate("actor", "name"),
  ]);
  send(res, {
    user: publicUser(req.user),
    medicineCount: products.length,
    lowStock: products
      .map(medicineView)
      .filter((item) => item.active && item.sellableStock < 8),
    unavailable: products
      .map(medicineView)
      .filter(
        (item) =>
          !item.active || item.available === false || item.sellableStock === 0,
      ),
    orders,
    activity,
  });
}
