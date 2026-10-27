import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Empty, Field, Loading } from "../components/ui.jsx";
import { useApp } from "../hooks/useApp.js";
import { api } from "../services/api.js";
import { formValues } from "../utils/forms.js";

const authSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use at most 72 characters."),
  name: z.string().optional(),
});

const loginOptions = [
  ["patient", "Patient"],
  ["doctor", "Doctor"],
  ["pharmacy", "Pharmacist"],
];

function AccountAccess({ signup = false }) {
  const location = useLocation();
  const target = location.state?.from;
  const afterLogin =
    typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
      ? target
      : "/";
  const [role, setRole] = useState("patient");
  const { user, action, pending, resetSession } = useApp();
  const navigate = useNavigate();
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(authSchema) });
  if (user) return <Navigate to={afterLogin} replace />;
  async function submit(body) {
    if (signup && !body.name?.trim()) return;
    const payload = {
      email: body.email,
      password: body.password,
      ...(signup ? { name: body.name } : { role }),
    };
    const result = await action(
      async () => {
        const user = await api(`/auth/${signup ? "register" : "login"}`, {
          method: "POST",
          body: payload,
        });
        if (user.role !== (signup ? "patient" : role)) {
          await api("/auth/logout", { method: "POST" });
          await resetSession(null);
          throw new Error("This account does not match the selected login role.");
        }
        await resetSession(user);
        return user;
      },
      signup ? "Welcome to MediBridge." : "Welcome back.",
    );
    if (result) navigate(afterLogin);
  }
  return (
    <main id="main-content" tabIndex={-1} className="auth-layout container section">
      <div className="auth-story">
        <span className="eyebrow">YOUR MEDIBRIDGE ACCOUNT</span>
        <h1>
          Medicines, consultations, <em>and your medical records.</em>
        </h1>
        <p>
          Manage appointments, prescriptions, medical orders, and follow-up in one
          secure account.
        </p>
        <div className="auth-features">
          <div>
            <Stethoscope size={22} />
            <span>
              <strong>Consult your doctor</strong>
              <small>Appointments and video consultations</small>
            </span>
          </div>
          <div>
            <Pill size={22} />
            <span>
              <strong>Your pharmacy, connected</strong>
              <small>Browse medicines and track orders</small>
            </span>
          </div>
          <div>
            <FileText size={22} />
            <span>
              <strong>Keep your records together</strong>
              <small>Prescriptions and consultation history</small>
            </span>
          </div>
        </div>
      </div>
      <section className="panel auth-panel">
        <span className="eyebrow">SECURE ACCOUNT ACCESS</span>
        <h2>{signup ? "Create your patient account." : "Login"}</h2>
        {!signup && (
          <nav className="page-tabs" aria-label="Login role">
            {loginOptions.map(([value, title]) => (
              <button
                type="button"
                key={value}
                aria-pressed={role === value}
                className={role === value ? "active" : ""}
                disabled={pending}
                onClick={() => setRole(value)}
              >
                {title}
              </button>
            ))}
          </nav>
        )}
        {signup ? (
          <p>
            Public signup creates a patient/customer account only. Doctor and
            pharmacist accounts are provided separately by the platform operator.
          </p>
        ) : (
          <p>Choose the login option that matches your existing account.</p>
        )}
        <form onSubmit={handleSubmit(submit)}>
          {signup && (
            <Field label="Name">
              <input
                {...field("name")}
                required
                maxLength={100}
                autoComplete="name"
              />
            </Field>
          )}
          <Field label="Email address">
            <input {...field("email")} type="email" autoComplete="email" />
            {errors.email && (
              <span className="field-error">{errors.email.message}</span>
            )}
          </Field>
          <Field label="Password">
            <input
              {...field("password")}
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </Field>
          <button className="btn wide" disabled={pending}>
            {pending ? "One moment…" : signup ? "Create patient account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <Link
          className="text-link auth-toggle"
          to={signup ? "/login" : "/signup"}
          state={location.state}
        >
          {signup
            ? "Already have an account? Sign in"
            : "New here? Create a patient account"}{" "}
          <ArrowUpRight size={15} />
        </Link>
      </section>
    </main>
  );
}

function Login() {
  return <AccountAccess />;
}
function Signup() {
  return <AccountAccess signup />;
}

function Protected({ children, roles: allowed }) {
  const location = useLocation();
  const { user, auth } = useApp();
  if (auth.isPending)
    return (
      <main id="main-content" tabIndex={-1} className="container section">
        <Loading />
      </main>
    );
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (allowed && !allowed.includes(user.role))
    return (
      <main id="main-content" tabIndex={-1} className="container section">
        <Empty title="Access restricted">
          <Link to="/">Return home</Link>
        </Empty>
      </main>
    );
  return children;
}

function Profile() {
  const { user, action, pending } = useApp();
  return (
    <section className="panel narrow">
      <h2>Account details</h2>
      <p className="muted">
        Keep your contact details up to date. Your email address and role cannot be
        changed here.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await action(
            () => api("/users/me", { method: "PATCH", body: formValues(e.target) }),
            "Your profile has been saved.",
          );
        }}
      >
        <Field
          label="Name"
          name="name"
          required
          maxLength={100}
          defaultValue={user.name}
        />
        <Field label="Email">
          <input disabled value={user.email} />
        </Field>
        <Field label="Phone" name="phone" maxLength={30} defaultValue={user.phone} />
        <Field label="Default delivery address">
          <textarea
            name="address"
            maxLength={500}
            defaultValue={user.address}
            rows={3}
          />
        </Field>
        <button className="btn" disabled={pending}>
          Save profile <Check size={17} />
        </button>
      </form>
    </section>
  );
}

export { Login, Protected, Profile, Signup };
