import type { AccessRequest } from "../types";
import { prettyDate, timeLabel, timestampLabel } from "../lib/scheduler";
import { requestHistory } from "../lib/store";

export default function RequestHistory({
  request,
  requests,
}: {
  request: AccessRequest;
  requests: AccessRequest[];
}) {
  const events = requestHistory(request);
  const slotLabel = (slot: { date: string; start: number }) =>
    `${prettyDate(slot.date)} ${timeLabel(slot.start)}–${timeLabel(slot.start + request.duration)}`;
  return (
    <div className="request-history">
      <p className="submitted-at">
        Submitted{" "}
        <time dateTime={request.createdAt}>
          {timestampLabel(request.createdAt)}
        </time>
      </p>
      <details>
        <summary>Full change history ({events.length})</summary>
        <ol>
          {events.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <strong>
                {event.action === "rescheduled"
                  ? "Rescheduled by faculty"
                  : event.action.charAt(0).toUpperCase() +
                    event.action.slice(1)}
              </strong>
              <time dateTime={event.at}>{timestampLabel(event.at)}</time>
              {event.from &&
              event.to &&
              (event.from.date !== event.to.date ||
                event.from.start !== event.to.start) ? (
                <span>
                  Original: {slotLabel(event.from)} → Replacement:{" "}
                  {slotLabel(event.to)}
                </span>
              ) : event.to ? (
                <span>Session: {slotLabel(event.to)}</span>
              ) : null}
              {event.relatedRequestId && (
                <span>
                  Coordinated with “
                  {requests.find((r) => r.id === event.relatedRequestId)
                    ?.project ?? "related project"}
                  ”.
                </span>
              )}
            </li>
          ))}
        </ol>
        {request.status !== "pending" &&
          !events.some(
            (e) => e.action === "approved" || e.action === "rejected",
          ) && (
            <p>
              This older demo record has no recorded{" "}
              {request.status === "approved" ? "approval" : "rejection"}{" "}
              timestamp.
            </p>
          )}
      </details>
    </div>
  );
}
