import { ClipboardList, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { label } from "../utils/format.js";

function IconButton({ label: description, children, ...props }) {
  return (
    <button
      className="icon-button"
      aria-label={description}
      title={description}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({ status }) {
  return <span className={`badge ${status}`}>{label(status)}</span>;
}

function Empty({ title = "Nothing here yet", children }) {
  return (
    <div className="empty">
      <ClipboardList size={30} />
      <h3>{title}</h3>
      <p>{children || "Your next step will appear here."}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="skeleton-group" aria-label="Loading" role="status">
      <span className="sr-only">Loading…</span>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

function QueryState({ query, children }) {
  if (query.isPending) return <Loading />;
  if (query.error && !query.data)
    return (
      <div className="notice error" role="alert">
        <p>{query.error.message}</p>
        <button className="btn small" onClick={() => query.refetch()}>
          Try again
        </button>
      </div>
    );
  return (
    <>
      {query.error && (
        <div className="notice error" role="status">
          Could not refresh this view. Showing the last loaded records.{" "}
          <button className="text-link" onClick={() => query.refetch()}>
            Retry
          </button>
        </div>
      )}
      {children(query.data)}
    </>
  );
}

function Field({ label: caption, name, children, ...props }) {
  return (
    <label className="field">
      <span>{caption}</span>
      {children || <input name={name} {...props} />}
    </label>
  );
}

function PageTitle({ eyebrow, children, description, aside }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{children}</h1>
        {description && <p>{description}</p>}
      </div>
      {aside}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  const box = useRef(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    box.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const items = box.current.querySelectorAll(
          "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])",
        );
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === box.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === box.current)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={box}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}

function getCategoryImage(category) {
  if (category === "First aid") return "/assets/first-aid.svg";
  if (category === "Personal care") return "/assets/care-bottle.svg";
  if (category === "Prescription medicines" || category === "Prescription demo")
    return "/assets/rx.svg";
  if (category === "Medical devices") return "/assets/device.svg";
  return "/assets/pack.svg";
}

function getProductImage(product) {
  if (!product) return "/assets/pack.svg";
  const categoryDefault = getCategoryImage(product.category);
  if (product.image && product.image !== "/assets/pack.svg") {
    return product.image;
  }
  return categoryDefault;
}

function ProductArt({ product, large = false }) {
  const fallback = getCategoryImage(product?.category);
  const src = getProductImage(product);
  return (
    <div
      className={`product-art ${large ? "large" : ""}`}
      data-category={product?.category}
    >
      <img
        src={src}
        loading={large ? "eager" : "lazy"}
        decoding="async"
        alt={`${product?.name || "Product"} packaging`}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = fallback;
        }}
      />
      {product?.requiresPrescription && <span className="rx-mark">Rx</span>}
    </div>
  );
}

export {
  IconButton,
  Badge,
  Empty,
  Loading,
  QueryState,
  Field,
  PageTitle,
  Modal,
  ProductArt,
  getCategoryImage,
  getProductImage,
};
