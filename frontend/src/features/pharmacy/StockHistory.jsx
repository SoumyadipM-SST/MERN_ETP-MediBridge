import { QueryState } from "../../components/ui.jsx";
import { useData } from "../../hooks/useData.js";
import { date } from "../../utils/format.js";

function StockHistory() {
  const query = useData("stock-history", "/pharmacy/history");
  return (
    <QueryState query={query}>
      {(items) => (
        <section>
          <h2>Stock movement history</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Change</th>
                  <th>Actor</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i._id}>
                    <td>{date(i.createdAt)}</td>
                    <td>{i.medicine?.name}</td>
                    <td>
                      {i.delta > 0 ? "+" : ""}
                      {i.delta}
                    </td>
                    <td>{i.actor?.name}</td>
                    <td>{i.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </QueryState>
  );
}
export { StockHistory };
