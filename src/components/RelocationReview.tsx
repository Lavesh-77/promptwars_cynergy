import { useState } from "react";
import type { AccessRequest, Relocation, Slot } from "../types";
import { prettyDate, timeLabel } from "../lib/scheduler";

interface Props {
  request: AccessRequest;
  booking: AccessRequest;
  slots: Slot[];
  busy: boolean;
  onConfirm: (id: string, move: Relocation) => Promise<boolean>;
}
export default function RelocationReview({
  request,
  booking,
  slots,
  busy,
  onConfirm,
}: Props) {
  const [selection, setSelection] = useState("");
  const [review, setReview] = useState<Relocation | null>(null);
  const [error, setError] = useState("");
  const selected = slots.find(
    (slot) => `${slot.date}/${slot.start}` === selection,
  );
  const label = (slot: { date: string; start: number }, duration: number) =>
    `${prettyDate(slot.date)}, ${timeLabel(slot.start)}–${timeLabel(slot.start + duration)}`;
  return (
    <div className="relocation-review">
      <strong>A flexible booking can make room</strong>
      <p>
        Move “{booking.project}” ({booking.student}) to a replacement before its{" "}
        {prettyDate(booking.deadline)} deadline. The session duration stays{" "}
        {booking.duration} minutes. Nothing changes until you confirm.
      </p>
      <label htmlFor={`replacement-${request.id}`}>
        Replacement for the flexible booking
      </label>
      <select
        id={`replacement-${request.id}`}
        value={selection}
        disabled={busy || !!review}
        onChange={(event) => {
          setSelection(event.target.value);
          setError("");
        }}
      >
        <option value="">Choose an available replacement…</option>
        {slots.map((slot) => (
          <option
            key={`${slot.date}/${slot.start}`}
            value={`${slot.date}/${slot.start}`}
          >
            {label(slot, booking.duration)}
          </option>
        ))}
      </select>
      {!review ? (
        <button
          className="button secondary small"
          disabled={!selected || busy}
          onClick={() => {
            if (selected)
              setReview({
                bookingId: booking.id,
                from: { date: booking.date, start: booking.start },
                to: { date: selected.date, start: selected.start },
              });
          }}
        >
          Review move & approval
        </button>
      ) : (
        <div
          className="move-confirmation"
          role="group"
          aria-label="Confirm rescheduling and approval"
        >
          <h4>Confirm both changes</h4>
          <p>
            <strong>{booking.project}:</strong>{" "}
            {label(review.from, booking.duration)} →{" "}
            {label(review.to, booking.duration)}.
          </p>
          <p>
            <strong>{request.project}:</strong> approve the exact requested
            slot, {label(request, request.duration)}.
          </p>
          <p>
            Both projects must meet their deadlines. Availability is checked
            again; if anything changed, neither update is saved.
          </p>
          <div className="request-actions">
            <button
              className="button primary small"
              disabled={busy}
              onClick={async () => {
                setError("");
                if (await onConfirm(request.id, review)) {
                  setReview(null);
                  setSelection("");
                } else {
                  setError(
                    "The move could not be saved. Neither booking was changed. Review the latest availability and choose a replacement again.",
                  );
                  setReview(null);
                  setSelection("");
                }
              }}
            >
              Confirm move & approve
            </button>
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => setReview(null)}
            >
              Cancel move
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
