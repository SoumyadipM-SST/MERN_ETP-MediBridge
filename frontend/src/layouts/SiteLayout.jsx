import {
  Activity,
  ArrowRight,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useApp } from "../hooks/useApp.js";
import { api } from "../services/api.js";

const navigation = {
  patient: [
    ["/", "Home", Home],
    ["/profile", "Profile", User],
    ["/history", "Medical history", FileText],
    ["/cart", "Cart", ShoppingBag],
    ["/consultations", "Consultation", Stethoscope],
    ["/pharmacy", "Pharmacy", Package],
  ],
  doctor: [
    ["/", "Home", Home],
    ["/profile", "Profile", User],
    ["/history", "Consultation history", FileText],
    ["/consultations", "Consultations", Stethoscope],
  ],
  pharmacy: [
    ["/", "Home", Home],
    ["/profile", "Profile", User],
    ["/inventory", "Inventory", Package],
    ["/orders", "Order fulfilment", ShoppingBag],
  ],
};
export function Header() {
  const { user, cart, action, resetSession } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="announcement">
        <div className="container">
          <span>
            <Activity size={12} /> MEDIBRIDGE · CARE & PHARMACY
          </span>
          <span>Appointments, prescriptions & pharmacy</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header">
          <Link className="brand" to="/" onClick={() => setOpen(false)}>
            <img src="/mark.svg" alt="" />
            <span>
              MediBridge
              <small className="brand-subtitle">PHARMACY + TELEMEDICINE</small>
            </span>
          </Link>
          {user?.role === "patient" && (
            <form
              className="header-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(
                  `/pharmacy?q=${encodeURIComponent(new FormData(event.currentTarget).get("search") || "")}`,
                );
                setOpen(false);
              }}
            >
              <input
                name="search"
                aria-label="Search medicines"
                placeholder="Search medicines & medical products"
              />
              <button aria-label="Search pharmacy">
                <ArrowRight size={19} />
              </button>
            </form>
          )}
          <div className="header-actions">
            {user && (
              <>
                <Link
                  className="user-link"
                  to="/profile"
                  aria-label={`${user.name} profile`}
                >
                  <User size={18} />
                  <span>{user.name}</span>
                </Link>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    const result = await action(async () => {
                      const result = await api("/auth/logout", { method: "POST" });
                      await resetSession(null);
                      return result;
                    });
                    if (result) {
                      setOpen(false);
                      navigate("/login");
                    }
                  }}
                >
                  <LogOut size={19} />
                </button>
              </>
            )}
            {user && (
              <button
                className="icon-button mobile-menu"
                aria-label="Toggle navigation"
                aria-expanded={open}
                aria-controls="primary-nav"
                onClick={() => setOpen(!open)}
              >
                {open ? <X /> : <Menu />}
              </button>
            )}
          </div>
        </div>
        {user && (
          <div className={`navigation-bar ${open ? "is-open" : ""}`}>
            <nav
              id="primary-nav"
              className={`container main-nav ${open ? "open" : ""}`}
              aria-label="Main navigation"
            >
              {navigation[user.role]?.map(([path, title, Icon]) => (
                <NavLink
                  end={path === "/"}
                  to={path}
                  key={path}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={16} />
                  {title}
                  {path === "/cart" && (
                    <span className="cart-count">
                      {cart?.items.reduce((sum, item) => sum + item.quantity, 0) ||
                        0}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-bottom">
        <span>MediBridge · Connected healthcare</span>
        <span>
          Trusted clinical consultations, verified pharmacy orders and digital care.
        </span>
      </div>
    </footer>
  );
}
