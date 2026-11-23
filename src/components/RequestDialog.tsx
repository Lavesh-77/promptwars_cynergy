import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  X,
} from "lucide-react";
import type { AccessRequest, Equipment, LabState } from "../types";
import {
  addDays,
  dateKey,
  isAvailable,
  prettyDate,
  recommendSlots,
  requestSchema,
  timeLabel,
  stockCount,
} from "../lib/scheduler";

interface Props {
  item: Equipment;
  state: LabState;
  onClose: () => void;
  onViewRequests: () => void;
  onSubmit: (input: unknown) => Promise<boolean>;
  conflict?: boolean;
}
export default function RequestDialog({
  item,
  state,
  onClose,
  onViewRequests,
  onSubmit,
  conflict,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({
    equipmentId: item.id,
    student: "",
    project: "",
    description: "",
    deadline: addDays(dateKey(), 7),
    date: addDays(dateKey(), 1),
    start: conflict ? 600 : 540,
    duration: 60,
    flexible: true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const available = isAvailable(
    state.requests,
    item.id,
    draft.date,
    draft.start,
    draft.duration,
    undefined,
    state.stock,
  );
  const slots = recommendSlots(
    draft as AccessRequest,
    state.requests,
    state.stock,
  );
  function field(key: keyof typeof draft, value: string | number | boolean) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError("");
  }
  return (
    <dialog
      ref={dialog}
      className="request-dialog"
      onCancel={onClose}
      aria-labelledby="request-title"
    >
      <button
        className="icon-button close-dialog"
        aria-label="Close request form"
        onClick={onClose}
      >
        <X size={21} />
      </button>
      {success ? (
        <div className="success-panel">
          <span className="success-icon">
            <CheckCircle2 size={36} />
          </span>
          <p className="eyebrow">YOU’RE ONE STEP CLOSER</p>
          <h2 id="request-title">Request submitted!</h2>
          <p>
            Your request is pending faculty demo approval. It does not reserve
            the equipment yet.
          </p>
          <p>Would you like to view your requests or keep exploring?</p>
          <button className="button primary" onClick={onViewRequests}>
            View my requests <ArrowRight size={17} />
          </button>
          <button className="button secondary" onClick={onClose}>
            Keep exploring
          </button>
        </div>
      ) : (
        <>
          <p className="eyebrow">LET’S MAKE IT HAPPEN</p>
          <h2 id="request-title">Request equipment access</h2>
          <p className="muted">
            {item.name} · {item.location}
            {" · "}
            {stockCount(item.id, state.stock)} units
          </p>
          <div className="requirement">
            <CheckCircle2 size={17} />
            <span>Before your session: {item.requirement.toLowerCase()}.</span>
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const result = requestSchema.safeParse(draft);
              if (!result.success) {
                setError(result.error.issues[0].message);
                return;
              }
              setBusy(true);
              try {
                if (await onSubmit(result.data)) setSuccess(true);
                else
                  setError(
                    "Unable to save your request. Browser storage may be full or blocked. Close this form to see details or reset the demo.",
                  );
              } catch {
                setError("Your request could not be saved. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-grid">
              <label>
                Your name
                <input
                  required
                  minLength={2}
                  maxLength={60}
                  value={draft.student}
                  onChange={(e) => field("student", e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  autoComplete="name"
                />
              </label>
              <label>
                Project title
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={draft.project}
                  onChange={(e) => field("project", e.target.value)}
                  placeholder="What are you working on?"
                />
              </label>
            </div>
            <label>
              Project & equipment requirements
              <textarea
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                value={draft.description}
                onChange={(e) => field("description", e.target.value)}
                placeholder="Describe your project and how this equipment will help…"
              />
            </label>
            <div className="form-grid">
              <label>
                Session date
                <input
                  type="date"
                  required
                  min={dateKey()}
                  max={addDays(dateKey(), 30)}
                  value={draft.date}
                  onChange={(e) => field("date", e.target.value)}
                />
              </label>
              <label>
                Project deadline
                <input
                  type="date"
                  required
                  min={draft.date}
                  value={draft.deadline}
                  onChange={(e) => field("deadline", e.target.value)}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Preferred start
                <select
                  value={draft.start}
                  onChange={(e) => field("start", Number(e.target.value))}
                >
                  {Array.from({ length: 16 }, (_, i) => 540 + i * 30).map(
                    (time) => (
                      <option key={time} value={time}>
                        {timeLabel(time)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Session duration
                <select
                  value={draft.duration}
                  onChange={(e) => field("duration", Number(e.target.value))}
                >
                  {[30, 60, 90, 120, 180, 240].map((duration) => (
                    <option key={duration} value={duration}>
                      {duration < 60 ? "30 minutes" : `${duration / 60} hours`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.flexible}
                onChange={(e) => field("flexible", e.target.checked)}
              />
              I’m flexible — faculty may approve an alternative or later move my
              booking to make room for an exact-slot request, only with faculty
              confirmation and before my project deadline.
            </label>
            <div className={`slot-advice ${available ? "" : "conflict"}`}>
              <div className="advice-title">
                <CalendarDays size={18} />
                {available
                  ? "Your preferred slot looks available"
                  : "A scheduling conflict was found"}
              </div>
              <p>
                {available
                  ? "Availability is checked again at approval. Pending requests do not reserve a slot."
                  : "Another project has this equipment booked. Choose an alternative below, or submit for faculty review."}
              </p>
              {!available && (
                <div className="slot-options">
                  {slots.length ? (
                    slots.map((slot) => (
                      <button
                        type="button"
                        className="slot-option"
                        key={`${slot.date}-${slot.start}`}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            date: slot.date,
                            start: slot.start,
                          })
                        }
                      >
                        <Clock3 size={14} />
                        {prettyDate(slot.date)} · {timeLabel(slot.start)}
                        <span>{draft.duration} min</span>
                      </button>
                    ))
                  ) : (
                    <p>
                      No feasible alternatives before your deadline. Try a
                      different date, duration, or flexibility setting.
                    </p>
                  )}
                </div>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="privacy-note">
              Public demo: use a fictional name and project. Requests stay in
              this browser. Slots use local campus time, daily 09:00–17:00.
            </p>
            <button
              className="button primary full-width"
              disabled={busy}
              type="submit"
            >
              {busy ? "Submitting…" : "Submit access request"}
              <ArrowRight size={17} />
            </button>
          </form>
        </>
      )}
    </dialog>
  );
}
