import * as appointments from "../controllers/appointments.controller.js";
import * as room from "../controllers/consultation.controller.js";
import * as doctor from "../controllers/doctor.controller.js";
import { uploadPrescription } from "../controllers/prescriptions.controller.js";
import { roles } from "../middleware/auth.js";
import { upload } from "../middleware/uploads.js";
import { patient, wrap } from "../utils/http.js";

export function registerClinicalRoutes(app) {
  app.get(
    "/api/appointments",
    roles("patient", "doctor"),
    wrap(appointments.appointments),
  );
  app.post("/api/appointments", patient, wrap(appointments.createAppointment));
  app.post(
    "/api/appointments/instant",
    patient,
    wrap(appointments.createInstantAppointment),
  );
  app.patch(
    "/api/appointments/:id/status",
    roles("patient", "doctor"),
    wrap(appointments.changeAppointmentStatus),
  );
  app.get("/api/doctor/profile", roles("doctor"), wrap(doctor.doctorProfile));
  app.patch(
    "/api/doctor/profile",
    roles("doctor"),
    wrap(doctor.updateDoctorProfile),
  );
  app.get("/api/doctor/slots", roles("doctor"), wrap(doctor.doctorSlots));
  app.post("/api/doctor/slots", roles("doctor"), wrap(doctor.createDoctorSlot));
  app.delete(
    "/api/doctor/slots/:id",
    roles("doctor"),
    wrap(doctor.removeDoctorSlot),
  );
  app.get(
    "/api/consultations/:id",
    roles("patient", "doctor"),
    wrap(room.consultation),
  );
  app.post(
    "/api/consultations/:id/join",
    roles("patient", "doctor"),
    wrap(room.joinConsultation),
  );
  app.post(
    "/api/consultations/:id/video-access",
    roles("patient", "doctor"),
    wrap(room.videoAccessForConsultation),
  );
  app.put("/api/consultations/:id/notes", roles("doctor"), wrap(room.saveNotes));
  app.get(
    "/api/consultations/:id/messages",
    roles("patient", "doctor"),
    wrap(room.messages),
  );
  app.post(
    "/api/consultations/:id/messages",
    roles("patient", "doctor"),
    wrap(room.sendMessage),
  );
  app.put(
    "/api/consultations/:id/prescription",
    roles("doctor"),
    wrap(room.savePrescription),
  );
  app.post(
    "/api/consultations/:id/prescription/upload",
    roles("doctor"),
    upload.single("file"),
    wrap(uploadPrescription),
  );
}
