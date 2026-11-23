import { useState } from "react";
import { equipment } from "../data";
import { stockCount } from "../lib/scheduler";
import type { LabState } from "../types";

interface Props {
  state: LabState;
  busy: boolean;
  onSave: (id: string, count: number) => Promise<boolean>;
}
export default function StockEditor({ state, busy, onSave }: Props) {
  return (
    <section
      className="requests-section stock-section"
      aria-labelledby="stock-title"
    >
      <h2 id="stock-title">Equipment stock</h2>
      <p className="muted">
        Each booking uses one unit. Changes apply only in this browser.
        Reductions cannot invalidate existing approvals.
      </p>
      <div className="equipment-grid">
        {equipment.map((item) => (
          <StockForm
            key={`${item.id}-${stockCount(item.id, state.stock)}`}
            id={item.id}
            name={item.name}
            count={stockCount(item.id, state.stock)}
            busy={busy}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}
function StockForm({
  id,
  name,
  count,
  busy,
  onSave,
}: { id: string; name: string; count: number } & Pick<
  Props,
  "busy" | "onSave"
>) {
  const [value, setValue] = useState(String(count));
  const [error, setError] = useState("");
  return (
    <form
      className="request-card stock-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        if (!(await onSave(id, Number(value))))
          setError("Stock was not changed. Check the error message above.");
      }}
    >
      <label htmlFor={`stock-${id}`}>{name} stock</label>
      <input
        id={`stock-${id}`}
        type="number"
        min={1}
        max={100}
        step={1}
        required
        value={value}
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        className="button secondary small"
        disabled={busy}
        type="submit"
        aria-label={`Save stock for ${name}`}
      >
        Save stock
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
