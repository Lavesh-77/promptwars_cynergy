import { CalendarDays, Check, Clock3, X } from "lucide-react";
import { equipment } from "../data";
import type { AccessRequest, LabState } from "../types";
import {
  isAvailable,
  prettyDate,
  rankRequests,
  recommendSlots,
  timeLabel,
} from "../lib/scheduler";

interface Props {
  state: LabState;
  faculty: boolean;
  onDecide: (
    id: string,
    decision: "approved" | "rejected",
    slot?: { date: string; start: number },
  ) => Promise<void>;
  busy: boolean;
}
export default function RequestList({ state, faculty, onDecide, busy }: Props) {
  const pending = rankRequests(state.requests);
  const list = faculty
    ? [
        ...pending,
        ...state.requests.filter((r) => r.status !== "pending").reverse(),
      ]
    : [...state.requests].reverse();
  return (
    <section
      className="requests-section"
      aria-label={faculty ? "Faculty request queue" : "Demo requests"}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {faculty ? "A FAIRER WAY TO SHARE" : "FROM IDEA TO LAB TIME"}
          </p>
          <h2>{faculty ? "Faculty approval desk" : "Project requests"}</h2>
          <p className="muted">
            {faculty
              ? "Review project needs and approve conflict-free equipment access."
              : "All requests saved in this browser, including sample projects."}
          </p>
        </div>
        <span className="count-pill">{pending.length} pending</span>
      </div>
      {faculty && (
        <div className="policy-note">
          <strong>Transparent priority, not a black box.</strong> Requests are
          ordered by earliest deadline, fewer approved hours for the same demo
          name, then submission time. Recommendations are rule-based, not
          generative AI. Changing names can bypass demo fairness.
        </div>
      )}
      {!list.length && (
        <div className="empty-state">
          <CalendarDays size={32} />
          <h3>Your next project starts here</h3>
          <p>
            Find equipment in the catalogue and submit your first access
            request.
          </p>
        </div>
      )}
      <div className="request-list">
        {list.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            state={state}
            faculty={faculty}
            onDecide={onDecide}
            busy={busy}
          />
        ))}
      </div>
    </section>
  );
}
function RequestCard({
  request,
  state,
  faculty,
  onDecide,
  busy,
}: Omit<Props, "state"> & { request: AccessRequest; state: LabState }) {
  const item = equipment.find((e) => e.id === request.equipmentId);
  const available = isAvailable(
    state.requests,
    request.equipmentId,
    request.date,
    request.start,
    request.duration,
    request.id,
  );
  const alternatives =
    request.status === "pending" && !available
      ? recommendSlots(request, state.requests)
      : [];
  return (
    <article className="request-card">
      <div className="request-card-top">
        <div>
          <span className="request-equipment">
            {item?.name || "Equipment unavailable"}
          </span>
          <h3>{request.project}</h3>
          <p className="muted">
            {request.student} · Deadline {prettyDate(request.deadline)}
          </p>
        </div>
        <span className={`status ${request.status}`}>
          <span />
          {request.status}
        </span>
      </div>
      <p className="request-description">{request.description}</p>
      <div className="request-metadata">
        <span>
          <CalendarDays size={15} />
          {prettyDate(request.date)}
        </span>
        <span>
          <Clock3 size={15} />
          {timeLabel(request.start)}–
          {timeLabel(request.start + request.duration)}
        </span>
        <span>
          {request.flexible ? "Flexible schedule" : "Exact slot only"}
        </span>
      </div>
      {request.status === "pending" && !available && (
        <div className="conflict-note">
          <strong>Scheduling conflict</strong>
          <p>
            The preferred slot overlaps an approved booking.
            {!request.flexible &&
              " This student needs an exact slot; reject it or ask them to submit a new request."}
          </p>
          {faculty &&
            alternatives.map((slot) => (
              <button
                disabled={busy}
                className="alternative-button"
                key={`${slot.date}-${slot.start}`}
                onClick={() => onDecide(request.id, "approved", slot)}
              >
                <Check size={15} />
                <span>
                  Approve {prettyDate(slot.date)} at {timeLabel(slot.start)}
                  <small>{slot.reason}</small>
                </span>
              </button>
            ))}
          {faculty && request.flexible && alternatives.length === 0 && (
            <p>
              No feasible alternatives. A shorter session or later deadline
              requires a new student request.
            </p>
          )}
        </div>
      )}
      {faculty && request.status === "pending" && (
        <div className="request-actions">
          <button
            disabled={busy || !available}
            className="button primary small"
            onClick={() => onDecide(request.id, "approved")}
          >
            <Check size={15} />
            Approve preferred slot
          </button>
          <button
            disabled={busy}
            className="button secondary small"
            onClick={() => onDecide(request.id, "rejected")}
          >
            <X size={15} />
            Reject
          </button>
        </div>
      )}
    </article>
  );
}
