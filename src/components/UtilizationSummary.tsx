import { Activity, CalendarCheck2, Clock3, Gauge } from "lucide-react";
import type { LabState } from "../types";
import { utilizationSummary } from "../lib/utilization";

export default function UtilizationSummary({ state }: { state: LabState }) {
  const summary = utilizationSummary(state);
  const hours = (minutes: number) =>
    Number.isInteger(minutes / 60)
      ? String(minutes / 60)
      : (minutes / 60).toFixed(1);
  return (
    <section className="utilization-panel" aria-labelledby="utilization-title">
      <div>
        <p className="eyebrow">NEXT SEVEN DAYS</p>
        <h2 id="utilization-title">Resource utilisation</h2>
        <p className="muted">
          Approved unit-hours compared with total stocked capacity during daily
          09:00–17:00 campus hours.
        </p>
      </div>
      <div className="utilization-grid">
        <article>
          <Gauge aria-hidden="true" />
          <strong>{summary.utilizationPercent}%</strong>
          <span>capacity booked</span>
        </article>
        <article>
          <CalendarCheck2 aria-hidden="true" />
          <strong>{summary.approvedSessions}</strong>
          <span>approved sessions</span>
        </article>
        <article>
          <Clock3 aria-hidden="true" />
          <strong>{hours(summary.pendingMinutes)}h</strong>
          <span>pending demand</span>
        </article>
        <article>
          <Activity aria-hidden="true" />
          <strong>{summary.busiest?.name ?? "No bookings"}</strong>
          <span>most booked resource</span>
        </article>
      </div>
      <div
        className="utilization-track"
        role="progressbar"
        aria-label="Seven-day equipment capacity booked"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.utilizationPercent}
      >
        <span
          style={{ width: `${Math.min(summary.utilizationPercent, 100)}%` }}
        />
      </div>
      <p className="muted utilization-detail">
        {hours(summary.bookedMinutes)} of {hours(summary.capacityMinutes)}{" "}
        stocked unit-hours booked. Browser-local demo data only.
      </p>
    </section>
  );
}
