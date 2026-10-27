import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { Expiry } from "../../components/Expiry.jsx";
import { Badge, Field, Modal, QueryState } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useData } from "../../hooks/useData.js";
import { api } from "../../services/api.js";
import { categoryLabel, date, money } from "../../utils/format.js";
import { formValues } from "../../utils/forms.js";
import { BatchInventory } from "./BatchInventory.jsx";
import { ProductForm } from "./ProductForm.jsx";
import { StockHistory } from "./StockHistory.jsx";

function InventoryPage() {
  const query = useData("inventory", "/pharmacy/inventory");
  const { action, pending } = useApp();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [filter, setFilter] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const matches = (product) =>
    `${product.name} ${product.brand}`
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    (!filter ||
      (filter === "low"
        ? product.sellableStock < 8
        : filter === "unavailable"
          ? !product.active || product.available === false || !product.sellableStock
          : product.active &&
            product.available !== false &&
            product.sellableStock > 0));
  return (
    <>
      <div className="content-heading">
        <h2>Inventory management</h2>
        <button className="btn small" onClick={() => setEdit({})}>
          Add product <Plus size={16} />
        </button>
      </div>
      <div className="input-icon inventory-search">
        <Search size={18} />
        <input
          aria-label="Search inventory"
          placeholder="Search product name or brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Field label="Inventory availability">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All medicines</option>
          <option value="available">Available for ordering</option>
          <option value="unavailable">Unavailable / inactive</option>
          <option value="low">Low stock</option>
        </select>
      </Field>
      <QueryState query={query}>
        {(items) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product / brand</th>
                  <th>Collection</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>State</th>
                  <th>Ordering</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!items.some(matches) && (
                  <tr>
                    <td colSpan={7}>
                      No inventory products match this search. Try another product
                      name or brand.
                    </td>
                  </tr>
                )}
                {items.filter(matches).map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <span className="table-sub">
                        {p.brand}
                        {p.requiresPrescription ? " · Rx" : ""}
                      </span>
                    </td>
                    <td>{categoryLabel(p.category)}</td>
                    <td>{money(p.price)}</td>
                    <td>
                      <span className={p.sellableStock < 8 ? "danger" : ""}>
                        {p.sellableStock} eligible / {p.stock} total
                      </span>
                      <Expiry product={p} />
                    </td>
                    <td>
                      <Badge status={p.active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <Badge
                        status={p.available === false ? "unavailable" : "available"}
                      />
                      {p.available === false && (
                        <span className="table-sub">{p.unavailabilityReason}</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="text-link" onClick={() => setEdit(p)}>
                          Edit
                        </button>
                        <button className="text-link" onClick={() => setAdjust(p)}>
                          Batches & expiry
                        </button>
                        <button
                          className="text-link"
                          onClick={() => setAvailability(p)}
                        >
                          Ordering availability
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
      {edit && (
        <Modal
          title={edit._id ? "Edit medicine" : "Add medicine"}
          onClose={() => setEdit(null)}
        >
          <ProductForm product={edit} onSaved={() => setEdit(null)} />
        </Modal>
      )}
      {availability && (
        <Modal
          title={`Availability: ${availability.name}`}
          onClose={() => setAvailability(null)}
        >
          <p>
            Physical stock: {availability.stock}. Unavailable medicines cannot be
            checked out, including from existing carts.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const data = formValues(event.currentTarget);
              const result = await action(
                () =>
                  api(`/pharmacy/medicines/${availability._id}/availability`, {
                    method: "PATCH",
                    body: {
                      available: data.available === "true",
                      reason: data.reason,
                    },
                  }),
                "Ordering availability updated.",
              );
              if (result) setAvailability(null);
            }}
          >
            <Field label="Ordering status">
              <select
                name="available"
                defaultValue={availability.available === false ? "false" : "true"}
              >
                <option value="true">Available</option>
                <option value="false">Temporarily unavailable</option>
              </select>
            </Field>
            <Field label="Reason for this change">
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={500}
                rows={3}
              />
            </Field>
            <button className="btn" disabled={pending}>
              Save availability
            </button>
          </form>
          <h3 className="subheading">Recent availability changes</h3>
          {availability.availabilityHistory?.length ? (
            availability.availabilityHistory
              .slice(-5)
              .reverse()
              .map((item, index) => (
                <p className="small-text" key={index}>
                  {date(item.at)} · {item.available ? "Available" : "Unavailable"} ·{" "}
                  {item.reason}
                </p>
              ))
          ) : (
            <p className="muted">No availability changes recorded.</p>
          )}
        </Modal>
      )}
      <details
        className="panel section-panel"
        onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
      >
        <summary>Stock movement history</summary>
        {historyOpen && <StockHistory />}
      </details>
      {adjust && (
        <Modal title={`Batches: ${adjust.name}`} onClose={() => setAdjust(null)}>
          <BatchInventory product={adjust} />
        </Modal>
      )}
    </>
  );
}
export { InventoryPage };
