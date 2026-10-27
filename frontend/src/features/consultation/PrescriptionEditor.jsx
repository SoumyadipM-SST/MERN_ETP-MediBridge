import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";

import { Field } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";

function PrescriptionEditor({ appointment, existing, products, joined }) {
  const { action, pending } = useApp();
  const [items, setItems] = useState(
    existing?.items.map((i) => ({
      medicine: i.medicine,
      quantity: i.quantity,
      instructions: i.instructions,
    })) || [{ medicine: "", quantity: 1, instructions: "" }],
  );
  function update(index, key, value) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }
  return (
    <section className="panel prescription-editor">
      <h3>{existing ? "Continue prescription draft" : "Create prescription"}</h3>
      <p className="footnote">
        Choose the exact catalog products and enter clear instructions. Verify all
        dosages and patient requirements before issuing.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const issue = e.nativeEvent.submitter.value === "issue";
          if (
            issue &&
            !confirm("Issue this prescription? Issued records cannot be edited.")
          )
            return;
          await action(
            () =>
              api(`/consultations/${appointment}/prescription`, {
                method: "PUT",
                body: {
                  items,
                  instructions: e.target.instructions.value,
                  issue,
                },
              }),
            issue ? "Prescription issued to the patient." : "Draft saved.",
          );
        }}
      >
        {items.map((item, i) => (
          <div className="rx-line" key={i}>
            <Field label={`Catalog product ${i + 1}`}>
              <select
                value={item.medicine}
                required
                onChange={(e) => update(i, "medicine", e.target.value)}
              >
                <option value="">Choose exact product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} · {p.sellableStock} eligible units
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min="1"
                max="99"
                required
                value={item.quantity}
                onChange={(e) => update(i, "quantity", Number(e.target.value))}
              />
            </Field>
            <Field label="Medicine instructions">
              <input
                value={item.instructions}
                maxLength={500}
                onChange={(e) => update(i, "instructions", e.target.value)}
              />
            </Field>
            {items.length > 1 && (
              <button
                type="button"
                className="text-link danger"
                onClick={() => setItems(items.filter((_, index) => index !== i))}
              >
                Remove line
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-link"
          disabled={items.length >= 20}
          onClick={() =>
            setItems([...items, { medicine: "", quantity: 1, instructions: "" }])
          }
        >
          <Plus size={14} /> Add another exact product
        </button>
        <Field label="General instructions">
          <textarea
            name="instructions"
            maxLength={2000}
            defaultValue={existing?.instructions || ""}
          />
        </Field>
        <div className="record-actions">
          <button
            className="btn secondary small"
            value="draft"
            disabled={pending || !joined}
          >
            Save draft
          </button>
          <button className="btn small" value="issue" disabled={pending || !joined}>
            Issue prescription <ArrowRight size={14} />
          </button>
        </div>
        {!joined && (
          <p className="footnote">
            Open the consultation workspace to enable prescription actions.
          </p>
        )}
      </form>
    </section>
  );
}
export { PrescriptionEditor };
