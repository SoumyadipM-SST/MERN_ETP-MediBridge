import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { IconButton } from "./components/ui.jsx";
import { Cart } from "./features/commerce/Cart.jsx";
import { Orders } from "./features/commerce/Orders.jsx";
import { InventoryPage } from "./features/pharmacy/InventoryPage.jsx";
import { AppContext } from "./hooks/useApp.js";
import { useData } from "./hooks/useData.js";
import { Footer, Header } from "./layouts/SiteLayout.jsx";
import { Login, Protected, Signup } from "./pages/Auth.jsx";
import { Catalog, ProductDetail } from "./pages/Catalog.jsx";
import { Consultation } from "./pages/Consultation.jsx";
import { ConsultationsPage } from "./pages/Consultations.jsx";
import { DoctorDetail } from "./pages/Doctors.jsx";
import { HistoryPage } from "./pages/History.jsx";
import { Home } from "./pages/Home.jsx";
import { ProfilePage } from "./pages/Profile.jsx";

export default function App() {
  const client = useQueryClient();
  const auth = useData("auth", "/auth/me", { retry: false });
  const user = auth.error ? null : auth.data;
  const cart = useData("cart", "/cart", { enabled: user?.role === "patient" });
  const [toast, setToast] = useState(null),
    [busy, setBusy] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function resetSession(nextUser) {
    await client.cancelQueries();
    client.clear();
    client.setQueryData(["auth"], nextUser);
  }
  async function action(fn, message) {
    setBusy((count) => count + 1);
    try {
      const result = await fn();
      await client.invalidateQueries();
      if (message) {
        setToast({ message, type: "success" });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 6000);
      }
      return result;
    } catch (error) {
      setToast({ message: error.message, type: "error" });
      clearTimeout(timer.current);
      if (error.status === 401) {
        await resetSession(null);
        await client.invalidateQueries({ queryKey: ["auth"] });
      }
      return null;
    } finally {
      setBusy((count) => count - 1);
    }
  }
  const protect = (element, roles) => <Protected roles={roles}>{element}</Protected>;
  return (
    <AppContext.Provider
      value={{
        user,
        auth,
        cart: cart.data,
        cartQuery: cart,
        action,
        pending: busy > 0,
        resetSession,
      }}
    >
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={protect(<Home />)} />
        <Route path="/profile" element={protect(<ProfilePage />)} />
        <Route
          path="/history"
          element={protect(<HistoryPage />, ["patient", "doctor"])}
        />
        <Route
          path="/consultations"
          element={protect(<ConsultationsPage />, ["patient", "doctor"])}
        />
        <Route
          path="/consultations/doctors/:id"
          element={protect(<DoctorDetail />, ["patient"])}
        />
        <Route
          path="/consultations/:id"
          element={protect(<Consultation />, ["patient", "doctor"])}
        />
        <Route path="/pharmacy" element={protect(<Catalog />, ["patient"])} />
        <Route
          path="/pharmacy/:id"
          element={protect(<ProductDetail />, ["patient"])}
        />
        <Route path="/cart" element={protect(<Cart />, ["patient"])} />
        <Route
          path="/inventory"
          element={protect(
            <main id="main-content" tabIndex={-1} className="container section">
              <h1>Medicine inventory</h1>
              <InventoryPage />
            </main>,
            ["pharmacy"],
          )}
        />
        <Route
          path="/orders"
          element={protect(
            <main id="main-content" tabIndex={-1} className="container section">
              <h1>Order fulfilment</h1>
              <Orders />
            </main>,
            ["pharmacy"],
          )}
        />
        <Route
          path="*"
          element={
            <main id="main-content" className="container section">
              <h1>Page not found</h1>
              <Link className="btn" to="/">
                Return home
              </Link>
            </main>
          }
        />
      </Routes>
      <Footer />
      {toast && (
        <div
          className={`toast ${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          {toast.type === "success" ? <Check size={18} /> : <X size={18} />}
          <span>{toast.message}</span>
          <IconButton label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={16} />
          </IconButton>
        </div>
      )}
    </AppContext.Provider>
  );
}
