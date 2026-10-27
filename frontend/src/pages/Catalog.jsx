import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { Expiry } from "../components/Expiry.jsx";
import { ProductAdd, ProductCard } from "../components/products.jsx";
import {
  Empty,
  Field,
  IconButton,
  PageTitle,
  ProductArt,
  QueryState,
} from "../components/ui.jsx";
import { useData } from "../hooks/useData.js";
import { categoryLabel, money } from "../utils/format.js";

function Catalog() {
  const [params, setParams] = useSearchParams();
  const query = useData(["catalog", params.toString()], `/medicines?${params}`);
  const categories = useData("categories", "/categories");
  function filter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <PageTitle
        eyebrow="ONLINE PHARMACY / MEDICINE CATALOGUE"
        description="Compare prices, pack sizes, stock, and prescription requirements with authentic pharmacy distribution."
      >
        Medicines &amp; medical products
      </PageTitle>
      <div className="category-chips" aria-label="Medicine categories">
        <button
          className={!params.get("category") ? "active" : ""}
          onClick={() => filter("category", "")}
        >
          All medicines
        </button>
        {categories.data?.map((category) => (
          <button
            key={category}
            className={params.get("category") === category ? "active" : ""}
            onClick={() => filter("category", category)}
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>
      <div className="catalog-layout">
        <aside className="filters">
          <div className="filter-title">
            <SlidersHorizontal size={17} />
            <strong>Filter products</strong>
          </div>
          <Field label="Search">
            <div className="input-icon">
              <Search size={17} />
              <input
                aria-label="Search catalog"
                placeholder="Name or brand"
                value={params.get("q") || ""}
                onChange={(e) => filter("q", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Collection">
            <select
              value={params.get("category") || ""}
              onChange={(e) => filter("category", e.target.value)}
            >
              <option value="">All collections</option>
              {categories.data?.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prescription">
            <select
              value={params.get("rx") || ""}
              onChange={(e) => filter("rx", e.target.value)}
            >
              <option value="">All products</option>
              <option value="true">Prescription required</option>
              <option value="false">No prescription required</option>
            </select>
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={params.get("stock") === "true"}
              onChange={(e) => filter("stock", e.target.checked ? "true" : "")}
            />{" "}
            In stock only
          </label>
          <button className="text-link" onClick={() => setParams({})}>
            Clear filters <X size={14} />
          </button>
          <div className="filter-note">
            <ShieldCheck size={23} />
            <p>
              Prescription products always pass through explicit pharmacy review.
            </p>
          </div>
        </aside>
        <div>
          <div className="results-toolbar">
            <span>{query.data?.total ?? "…"} products found</span>
            <label>
              Sort by{" "}
              <select
                aria-label="Sort products"
                value={params.get("sort") || "featured"}
                onChange={(e) => filter("sort", e.target.value)}
              >
                <option value="featured">Catalogue order</option>
                <option value="price">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>
          </div>
          <QueryState query={query}>
            {(data) => (
              <>
                {data.items.length ? (
                  <div className="product-grid">
                    {data.items.map((p) => (
                      <ProductCard product={p} key={p._id} />
                    ))}
                  </div>
                ) : (
                  <Empty title="No products found">
                    Try another name or clear filters to search the collection.
                  </Empty>
                )}
                {data.pages > 1 && (
                  <div className="pagination">
                    <IconButton
                      label="Previous page"
                      disabled={data.page === 1}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("page", data.page - 1);
                        setParams(next);
                        window.scrollTo(0, 0);
                      }}
                    >
                      <ChevronLeft />
                    </IconButton>
                    <span>
                      Page {data.page} of {data.pages}
                    </span>
                    <IconButton
                      label="Next page"
                      disabled={data.page === data.pages}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("page", data.page + 1);
                        setParams(next);
                        window.scrollTo(0, 0);
                      }}
                    >
                      <ChevronRight />
                    </IconButton>
                  </div>
                )}
              </>
            )}
          </QueryState>
        </div>
      </div>
    </main>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const query = useData(["product", id], `/medicines/${id}`);
  return (
    <main id="main-content" tabIndex={-1} className="container section">
      <Link className="back-link" to="/pharmacy">
        <ChevronLeft size={16} /> Back to medicines
      </Link>
      <QueryState query={query}>
        {(product) => (
          <div className="product-detail">
            <ProductArt product={product} large />
            <div>
              <span className="eyebrow">
                {product.brand} / {categoryLabel(product.category)}
              </span>
              <h1>{product.name}</h1>
              <p>{product.description}</p>
              <div className="detail-price">{money(product.price)}</div>
              <dl className="detail-list">
                <div>
                  <dt>Pack</dt>
                  <dd>{product.pack}</dd>
                </div>
                <div>
                  <dt>Manufacturer</dt>
                  <dd>{product.manufacturer}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>
                    {product.available === false
                      ? "Unavailable for ordering"
                      : `${product.sellableStock} eligible units in stock`}
                  </dd>
                </div>
                <div>
                  <dt>Prescription</dt>
                  <dd>
                    {product.requiresPrescription
                      ? "Required · explicit review"
                      : "Not required"}
                  </dd>
                </div>
              </dl>
              {product.available === false && (
                <p className="notice error">
                  {product.unavailabilityReason ||
                    "Temporarily unavailable for ordering."}
                </p>
              )}
              <ProductAdd product={product} />
              <Expiry product={product} detailed />
              <div className="notice">
                <strong>Delivery &amp; prescription checks</strong>
                <p>
                  ₹49 delivery charge below ₹500; free at ₹500 and above. Enter your
                  delivery address at checkout. Prescription-required products are
                  fulfilled only after explicit pharmacy approval.
                </p>
              </div>
              <div className="notice">
                Catalog images are illustrative. This application does not dispense
                real medicines. Product information is not a recommendation for use.
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </main>
  );
}

export { Catalog, ProductDetail };
