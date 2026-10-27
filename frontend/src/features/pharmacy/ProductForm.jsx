import { Camera, Check, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Field, getCategoryImage } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";
import { formValues } from "../../utils/forms.js";

const KNOWN_CATEGORIES = [
  "First aid",
  "Personal care",
  "Medical devices",
  "Prescription medicines",
];

function ProductForm({ product, onSaved }) {
  const { action, pending } = useApp();
  const initialCategory = product.category || "First aid";
  const [category, setCategory] = useState(initialCategory);
  const [hasCustomImage, setHasCustomImage] = useState(
    Boolean(product.image && !product.image.startsWith("/assets/")),
  );
  const [image, setImage] = useState(
    product.image && !product.image.startsWith("/assets/")
      ? product.image
      : getCategoryImage(initialCategory),
  );

  const categories = Array.from(
    new Set([...KNOWN_CATEGORIES, ...(product.category ? [product.category] : [])]),
  );

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WebP, SVG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        setImage(dataUrl);
        setHasCustomImage(true);
      };
      img.onerror = () => {
        setImage(reader.result);
        setHasCustomImage(true);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleResetToCategory() {
    setHasCustomImage(false);
    setImage(getCategoryImage(category));
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const data = formValues(e.target);
        const body = {
          ...data,
          category,
          image: hasCustomImage ? image : getCategoryImage(category),
          ...(!product._id ? { expiryDate: data.expiryDate || null } : {}),
          price: Math.round(Number(data.price) * 100),
          active: data.active === "true",
          requiresPrescription: data.requiresPrescription === "true",
          ...(!product._id ? { stock: Number(data.stock) } : {}),
        };
        const result = await action(
          () =>
            api(`/pharmacy/medicines${product._id ? `/${product._id}` : ""}`, {
              method: product._id ? "PATCH" : "POST",
              body,
            }),
          "Catalog product saved.",
        );
        if (result) onSaved();
      }}
    >
      <Field
        label="Product name"
        name="name"
        required
        maxLength={120}
        defaultValue={product.name}
      />
      <div className="form-grid">
        <Field
          label="Brand"
          name="brand"
          required
          maxLength={80}
          defaultValue={product.brand}
        />
        <Field label="Category">
          <select
            name="category"
            required
            value={category}
            onChange={(e) => {
              const val = e.target.value;
              setCategory(val);
              if (!hasCustomImage) {
                setImage(getCategoryImage(val));
              }
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "Prescription demo" ? "Prescription medicines" : c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="product-image-section">
        <div className="product-image-label">
          <strong>Medicine product image</strong>
          <small>
            {hasCustomImage
              ? "Custom photo uploaded for this medicine"
              : `Defaulting to ${category} category artwork`}
          </small>
        </div>
        <div className="product-image-box">
          <div className="product-image-preview">
            <img
              src={image || getCategoryImage(category)}
              alt="Medicine packaging preview"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getCategoryImage(category);
              }}
            />
            <span className={`image-badge ${hasCustomImage ? "custom" : "default"}`}>
              {hasCustomImage ? "Custom photo" : "Category default"}
            </span>
          </div>
          <div className="product-image-actions">
            <label className="btn small secondary file-upload-btn">
              <Camera size={15} />
              <span>
                {hasCustomImage ? "Change photo" : "Upload medicine photo"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={handleFile}
              />
            </label>
            {hasCustomImage && (
              <button
                type="button"
                className="text-link danger"
                onClick={handleResetToCategory}
              >
                <RefreshCw size={13} style={{ verticalAlign: -2 }} /> Use category
                default
              </button>
            )}
            <p className="footnote">
              Defaults to category artwork. Click above if you want to upload an
              authentic medicine photo.
            </p>
          </div>
        </div>
      </div>

      <Field label="Description (no clinical claims)">
        <textarea
          name="description"
          required
          maxLength={1500}
          defaultValue={product.description}
        />
      </Field>
      <div className="form-grid">
        <Field
          label="Pack size"
          name="pack"
          required
          maxLength={100}
          defaultValue={product.pack}
        />
        <Field
          label="Manufacturer"
          name="manufacturer"
          required
          maxLength={120}
          defaultValue={product.manufacturer}
        />
        <Field
          label="Price (₹)"
          name="price"
          type="number"
          min="0.01"
          max="100000"
          step="0.01"
          required
          defaultValue={product.price ? product.price / 100 : ""}
        />
        {!product._id && (
          <Field
            label="Opening stock"
            name="stock"
            type="number"
            min="0"
            max="100000"
            required
            defaultValue="0"
          />
        )}
        <Field label="Requires prescription">
          <select
            name="requiresPrescription"
            defaultValue={String(product.requiresPrescription || false)}
          >
            <option value="false">No</option>
            <option value="true">Yes · pharmacy review required</option>
          </select>
        </Field>
        <Field label="Catalog state">
          <select name="active" defaultValue={String(product.active ?? true)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </Field>
      </div>
      {!product._id && (
        <>
          <div className="form-grid">
            <Field
              label="Opening batch label / number"
              name="batchLabel"
              required
              maxLength={80}
            />
            <Field
              label="Expiry date"
              name="expiryDate"
              type="date"
              max="9999-12-31"
            />
          </div>
          <p className="footnote">
            Enter the date on the pack. Stock without an expiry date remains
            unavailable for ordering. Manage additional batches separately after
            saving.
          </p>
        </>
      )}
      <button className="btn" disabled={pending}>
        Save catalog product <Check size={16} />
      </button>
    </form>
  );
}
export { ProductForm };
