import { ArrowRight, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ProductArt } from "../components/ui.jsx";
import { useApp } from "../hooks/useApp.js";
import { api } from "../services/api.js";
import { categoryLabel, money } from "../utils/format.js";
import { Expiry } from "./Expiry.jsx";

async function addOne(product) {
  const cart = await api("/cart");
  const count =
    cart.items.find((i) => i.medicine?._id === product._id)?.quantity || 0;
  return api("/cart/items", {
    method: "PUT",
    body: { medicine: product._id, quantity: count + 1 },
  });
}

function ProductCard({ product }) {
  const available =
    product.active !== false &&
    product.available !== false &&
    product.sellableStock > 0;
  const { user, action, pending } = useApp();
  const navigate = useNavigate();
  async function add() {
    if (!user) {
      navigate("/login");
      return;
    }
    await action(() => addOne(product), "Added to your cart.");
  }
  return (
    <article className="product-card" data-category={product.category}>
      <Link to={`/pharmacy/${product._id}`}>
        <ProductArt product={product} />
      </Link>
      <div className="product-meta">
        <span>{categoryLabel(product.category)}</span>
        <span className={available ? "" : "out-of-stock"}>
          {product.available === false
            ? "Ordering unavailable"
            : product.sellableStock
              ? `${product.sellableStock} available`
              : "No eligible stock"}
        </span>
      </div>
      <Link className="product-name" to={`/pharmacy/${product._id}`}>
        {product.name}
      </Link>
      <p className="muted small-text">{product.pack}</p>
      <Expiry product={product} />
      {product.available === false && (
        <p className="unavailable-reason">{product.unavailabilityReason}</p>
      )}
      <div className="product-bottom">
        <div>
          <strong>{money(product.price)}</strong>
          {product.originalPrice > product.price && (
            <>
              <del>{money(product.originalPrice)}</del>
              <span className="product-saving">
                Save {money(product.originalPrice - product.price)}
              </span>
            </>
          )}
        </div>
        <button
          className="btn add-to-cart"
          type="button"
          aria-label={
            available ? `Add ${product.name} to cart` : `${product.name} unavailable`
          }
          title={
            user && user.role !== "patient"
              ? "Sign in as a patient to purchase products."
              : undefined
          }
          disabled={
            !available || pending || Boolean(user && user.role !== "patient")
          }
          onClick={add}
        >
          <ShoppingBag size={16} />{" "}
          {pending
            ? "Updating…"
            : !available
              ? "Unavailable"
              : user && user.role !== "patient"
                ? "Patient account only"
                : "Add to cart"}
        </button>
      </div>
    </article>
  );
}

function ProductAdd({ product }) {
  const available =
    product.active !== false &&
    product.available !== false &&
    product.sellableStock > 0;
  const { user, action, pending } = useApp();
  const navigate = useNavigate();
  return (
    <button
      className="btn wide"
      disabled={!available || pending || Boolean(user && user.role !== "patient")}
      onClick={async () => {
        if (!user) {
          navigate("/login");
          return;
        }
        await action(() => addOne(product), "Added to your cart.");
      }}
    >
      <ShoppingBag size={18} />
      {available
        ? user && user.role !== "patient"
          ? "Patient account required"
          : "Add to cart"
        : "Currently unavailable"}
      <ArrowRight size={18} />
    </button>
  );
}

export { ProductCard, ProductAdd };
