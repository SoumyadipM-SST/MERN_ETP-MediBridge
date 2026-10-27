import { CheckCircle2, Clock, FileText, Printer, Upload } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Badge, Modal } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useNow } from "../../hooks/useNow.js";
import { API, api } from "../../services/api.js";
import { date } from "../../utils/format.js";

export function PrescriptionUpload({ appointment }) {
  const { action, pending } = useApp();
  return (
    <form
      className="upload-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fileInput = form.elements.namedItem("file");
        if (!fileInput?.files?.[0]) return;
        const body = new FormData();
        body.append("file", fileInput.files[0]);
        const result = await action(
          () =>
            api(
              appointment
                ? `/consultations/${appointment}/prescription/upload`
                : "/prescriptions/upload",
              { method: "POST", body },
            ),
          "Prescription uploaded. Pharmacy verification is still required.",
        );
        if (result) form.reset();
      }}
    >
      <div className="upload-form-info">
        <Upload size={20} className="upload-icon" />
        <div>
          <strong>Upload a prescription</strong>
          <p>Private PDF, PNG or JPEG · maximum 5 MB</p>
        </div>
      </div>
      <div className="upload-form-controls">
        <input
          type="file"
          name="file"
          aria-label="Prescription file"
          accept="application/pdf,image/png,image/jpeg"
          required
        />
        <button className="btn small" disabled={pending}>
          Upload
        </button>
      </div>
    </form>
  );
}

export function PrintablePrescription({ rx, appointment, user }) {
  const now = useNow();
  const doctorName =
    rx.doctor?.user?.name ||
    appointment?.doctor?.user?.name ||
    (user?.role === "doctor" ? user.name : "Dr. Rajesh Verma");
  const doctorQualification =
    rx.doctor?.qualification ||
    appointment?.doctor?.qualification ||
    "MBBS, MD (Internal Medicine)";
  const doctorSpecialty =
    rx.doctor?.specialty || appointment?.doctor?.specialty || "General Medicine";
  const patientName =
    appointment?.patient?.name ||
    (user?.role === "patient" ? user.name : "Aarav Sharma");
  const rxNumber = `RX-${(rx._id || "NEW").slice(-8).toUpperCase()}`;
  const issueDate = date(rx.issuedAt || appointment?.start || now);
  const expiryDate = rx.expiresAt ? date(rx.expiresAt) : "Valid 30 days";
  const consultationNotes = appointment?.notes || rx.consultationNotes || "";

  return (
    <article className="printable-prescription-document" id={`print-rx-${rx._id}`}>
      {/* 1. Official Header / Letterhead */}
      <header className="rx-doc-header">
        <div className="rx-doc-brand">
          <span className="rx-doc-symbol">℞</span>
          <div>
            <h2 className="rx-doc-title">MEDIBRIDGE TELEHEALTH CLINIC</h2>
            <p className="rx-doc-subtitle">
              Verified Digital Healthcare &amp; Clinical E-Prescription
            </p>
          </div>
        </div>
        <div className="rx-doc-meta">
          <span className="rx-doc-num">{rxNumber}</span>
          <span className="rx-doc-date">Issue Date: {issueDate}</span>
        </div>
      </header>

      <div className="rx-doc-divider" />

      {/* 2. Doctor & Patient Info Banner */}
      <div className="rx-doc-parties">
        <div className="rx-doc-doctor">
          <span className="rx-doc-tag">PRESCRIBING PHYSICIAN</span>
          <h3>{doctorName}</h3>
          <p className="rx-doc-qual">{doctorQualification}</p>
          <p className="rx-doc-spec">Specialty: {doctorSpecialty}</p>
          <p className="rx-doc-clinic">MediBridge Telemedicine Network</p>
        </div>
        <div className="rx-doc-patient">
          <span className="rx-doc-tag">PATIENT</span>
          <h3>{patientName}</h3>
          <p className="rx-doc-validity">
            <span>Valid Until: {expiryDate}</span>
          </p>
          {appointment?.reason && (
            <p className="rx-doc-reason">
              <strong>Chief Complaint:</strong> {appointment.reason}
            </p>
          )}
        </div>
      </div>

      {/* 3. Clinical Consultation Notes (if recorded) */}
      {consultationNotes && (
        <section className="rx-doc-block">
          <h4 className="rx-doc-heading">
            <FileText size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Clinical Consultation Notes &amp; Observations
          </h4>
          <div className="rx-doc-notes-body">
            <p className="preserve-text">{consultationNotes}</p>
          </div>
        </section>
      )}

      {/* 4. Prescribed Medications Table */}
      <section className="rx-doc-block">
        <div className="rx-doc-block-header">
          <span className="rx-latin-symbol">℞</span>
          <h4 className="rx-doc-heading">Prescribed Medications</h4>
        </div>
        <table className="rx-doc-table">
          <thead>
            <tr>
              <th style={{ width: "36px" }}>#</th>
              <th>Medication &amp; Form</th>
              <th style={{ width: "80px", textAlign: "center" }}>Qty</th>
              <th>Dosage &amp; Administration Instructions</th>
            </tr>
          </thead>
          <tbody>
            {rx.items?.map((item, idx) => (
              <tr key={item.medicine || idx}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className="rx-doc-qty">×{item.quantity}</span>
                </td>
                <td>
                  <span className="rx-doc-instruction">
                    {item.instructions || "Take as directed by physician"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 5. Doctor's Prescription Writing Notes & General Advice */}
      {rx.instructions && (
        <section className="rx-doc-block">
          <h4 className="rx-doc-heading">
            Doctor's Advice &amp; Special Instructions
          </h4>
          <div className="rx-doc-advice-body">
            <p className="preserve-text">{rx.instructions}</p>
          </div>
        </section>
      )}

      <div className="rx-doc-divider" />

      {/* 6. Legal / Regulatory Verification & Signature */}
      <footer className="rx-doc-footer">
        <div className="rx-doc-legal">
          <p>
            This is an electronically issued, digitally authenticated prescription
            generated under the Telemedicine Practice Guidelines. Dispensing is
            performed through verified pharmacy network partners.
          </p>
        </div>
        <div className="rx-doc-signature">
          <div className="rx-sig-badge">
            <CheckCircle2 size={15} />
            <span>DIGITALLY VERIFIED</span>
          </div>
          <strong>{doctorName}</strong>
          <small>{doctorQualification}</small>
          <span className="rx-sig-date">{issueDate}</span>
        </div>
      </footer>
    </article>
  );
}

export function PrescriptionCard({ rx, appointment }) {
  const now = useNow();
  const { user, action, pending } = useApp();
  const navigate = useNavigate();
  const [printOpen, setPrintOpen] = useState(false);

  return (
    <>
      <section className="prescription-record" id={`prescription-${rx._id}`}>
        <div className="prescription-card-header">
          <div className="prescription-title-group">
            <h4>
              {rx.kind === "upload"
                ? "Uploaded prescription"
                : "Digital clinical prescription"}
            </h4>
            <span className="prescription-meta-line">
              {rx.issuedAt
                ? `Issued ${date(rx.issuedAt)} · Valid until ${date(rx.expiresAt)}`
                : "Draft — not visible to the patient"}
            </span>
          </div>
          <Badge status={rx.status} />
        </div>

        {/* Prescribed Medicines with clear Dosage Instructions */}
        {rx.items?.length > 0 && (
          <div className="prescription-items-list">
            <span className="rx-section-label">
              Prescribed medicines &amp; directions
            </span>
            {rx.items.map((item) => (
              <div className="prescription-item-card" key={item.medicine}>
                <div className="item-main-info">
                  <strong className="item-name">{item.name}</strong>
                  <span className="item-qty-badge">Qty {item.quantity}</span>
                </div>
                <div className="item-instructions-row">
                  <Clock size={13} className="instruction-icon" />
                  <span>
                    <strong>Dosage:</strong>{" "}
                    {item.instructions || "Take as directed by consulting physician"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctor's Advice & Prescription Writing Notes */}
        {rx.instructions && (
          <div className="prescription-advice-box">
            <div className="advice-header">
              <FileText size={14} className="advice-icon" />
              <strong>Doctor's prescription notes &amp; advice:</strong>
            </div>
            <p className="preserve-text">{rx.instructions}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="record-actions">
          {rx.kind === "digital" && (
            <button
              type="button"
              className="btn small secondary"
              onClick={() => setPrintOpen(true)}
            >
              <Printer size={15} /> Print prescription
            </button>
          )}
          {rx.file && (
            <a
              className="text-link"
              href={`${API}/api/files/${rx.file}`}
              target="_blank"
              rel="noreferrer"
            >
              Download private prescription →
            </a>
          )}
          {user.role === "patient" &&
            rx.kind === "digital" &&
            !rx.order &&
            ["issued", "approved"].includes(rx.status) &&
            +new Date(rx.expiresAt) > now && (
              <button
                className="btn small"
                disabled={pending}
                onClick={async () => {
                  if (
                    !confirm("Replace your cart with the exact prescribed products?")
                  )
                    return;
                  const result = await action(
                    () => api(`/prescriptions/${rx._id}/cart`, { method: "POST" }),
                    "Exact prescription products added to your cart.",
                  );
                  if (result) navigate(`/cart?prescription=${rx._id}`);
                }}
              >
                Order prescribed medicines
              </button>
            )}
          {rx.order && user.role === "patient" && (
            <Link className="text-link" to={`/history?tab=orders&order=${rx.order}`}>
              View linked order →
            </Link>
          )}
          {rx.appointment && user.role === "doctor" && rx.status === "draft" && (
            <Link className="text-link" to={`/consultations/${rx.appointment}`}>
              Continue draft →
            </Link>
          )}
        </div>
      </section>

      {/* Printable Prescription Modal */}
      {printOpen && (
        <Modal
          title="Printable Medical Prescription"
          onClose={() => setPrintOpen(false)}
        >
          <div className="print-modal-container">
            <div className="print-dialog-actions no-print">
              <button type="button" className="btn" onClick={() => window.print()}>
                <Printer size={16} /> Print or Save as PDF
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setPrintOpen(false)}
              >
                Close
              </button>
            </div>
            <PrintablePrescription rx={rx} appointment={appointment} user={user} />
          </div>
        </Modal>
      )}
    </>
  );
}
