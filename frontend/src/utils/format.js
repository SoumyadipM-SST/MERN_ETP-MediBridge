export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((value || 0) / 100);
export const date = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const label = (value) => String(value || "").replaceAll("_", " ");
export const categoryLabel = (value) =>
  value === "Prescription demo" ? "Prescription medicines" : value;
