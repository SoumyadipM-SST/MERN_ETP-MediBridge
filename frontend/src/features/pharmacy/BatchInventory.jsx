import { useState } from "react";

import { expiryLabel } from "../../components/Expiry.jsx";
import { Badge, Field } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";
import { formValues } from "../../utils/forms.js";

export function BatchInventory({ product: initial }) {
  const [product, setProduct] = useState(initial);
  const [batchId, setBatchId] = useState("");
  const { action, pending } = useApp();
  return (
    <>
      <p>
        {product.stock} units on hand · {product.sellableStock} eligible for
        ordering. Expired and undated stock stays recorded but cannot be sold.
      </p>
      <div className="batch-editor">
        {product.batches.map((batch) => (
          <details key={batch.batchId}>
            <summary>
              <strong>{batch.label}</strong>
              <span>
                {batch.stock} units · {expiryLabel(batch.expiryDate)}
              </span>
              <Badge status={batch.expiryStatus} />
            </summary>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const values = formValues(event.currentTarget);
                const result = await action(
                  () =>
                    api(
                      `/pharmacy/medicines/${product._id}/batches/${batch.batchId}`,
                      {
                        method: "PATCH",
                        body: { ...values, expiryDate: values.expiryDate || null },
                      },
                    ),
                  "Batch expiry saved.",
                );
                if (result) setProduct(result);
              }}
            >
              <div className="form-grid">
                <Field
                  label="Batch label / number"
                  name="label"
                  required
                  maxLength={80}
                  defaultValue={batch.label}
                />
                <Field
                  label="Expiry date"
                  name="expiryDate"
                  type="date"
                  max="9999-12-31"
                  defaultValue={batch.expiryDate || ""}
                />
              </div>
              <Field
                label="Reason for correcting this batch"
                name="reason"
                required
                minLength={3}
                maxLength={500}
              />
              <p className="footnote">
                Copy the date from this batch's packaging. Do not extend a date to
                make old stock orderable. A separate delivery with a different expiry
                needs a new batch.
              </p>
              <button className="btn small" disabled={pending}>
                Save batch details
              </button>
            </form>
          </details>
        ))}
      </div>
      <h3 className="subheading">Receive or adjust stock</h3>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const values = formValues(form);
          const result = await action(
            () =>
              api("/pharmacy/stock", {
                method: "POST",
                body: {
                  medicine: product._id,
                  ...values,
                  delta: Number(values.delta),
                  ...(batchId ? { batchId } : {}),
                },
              }),
            "Batch stock updated.",
          );
          if (result) {
            setProduct(result);
            form.reset();
            setBatchId("");
          }
        }}
      >
        <Field label="Stock batch">
          <select
            value={batchId}
            onChange={(event) => setBatchId(event.target.value)}
          >
            <option value="">Receive a new batch</option>
            {product.batches.map((batch) => (
              <option value={batch.batchId} key={batch.batchId}>
                {batch.label} · {batch.stock} units · {expiryLabel(batch.expiryDate)}
              </option>
            ))}
          </select>
        </Field>
        {!batchId && (
          <div className="form-grid">
            <Field
              label="New batch label / number"
              name="batchLabel"
              required
              maxLength={80}
            />
            <Field
              label="Expiry date"
              name="expiryDate"
              type="date"
              required
              max="9999-12-31"
            />
          </div>
        )}
        <Field
          label={
            batchId ? "Change in units (positive or negative)" : "Units received"
          }
          name="delta"
          type="number"
          min={batchId ? -100000 : 1}
          max={100000}
          required
        />
        <Field
          label="Stock change reason"
          name="reason"
          required
          minLength={3}
          maxLength={500}
        />
        <button className="btn" disabled={pending}>
          Record stock change
        </button>
      </form>
    </>
  );
}
