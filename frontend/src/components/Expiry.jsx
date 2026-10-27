import { CalendarClock } from "lucide-react";

export function expiryLabel(value) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "Not recorded";
}

export function Expiry({ product, detailed = false }) {
  const batches = product.batches || [];
  const eligible = batches
    .filter(
      (batch) =>
        batch.stock > 0 && ["in_date", "expiring_soon"].includes(batch.expiryStatus),
    )
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  return (
    <div className="expiry-info">
      <span>
        <CalendarClock size={14} />{" "}
        {eligible.length
          ? `Earliest expiry: ${expiryLabel(eligible[0].expiryDate)}`
          : "No stock with a recorded, valid expiry"}
      </span>
      {detailed && (
        <>
          <p className="small-text muted">
            Expiry is checked per batch, through the date shown in India. Stock with
            no recorded expiry cannot be ordered. The earliest eligible batches are
            allocated at checkout.
          </p>
          <ul className="batch-list">
            {batches
              .filter((batch) => batch.stock > 0)
              .map((batch) => (
                <li key={batch.batchId}>
                  <strong>{batch.label}</strong>
                  <span>
                    {batch.stock} units · Expiry date:{" "}
                    {expiryLabel(batch.expiryDate)}
                  </span>
                  <span className={`badge ${batch.expiryStatus}`}>
                    {batch.expiryStatus?.replaceAll("_", " ")}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
