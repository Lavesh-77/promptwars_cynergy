import { useEffect, useRef, useState } from "react";
import type { LabState } from "../types";
import { aiPayload, validateAIOutput, type AIOutput } from "../lib/ai";
import { prettyDate, timeLabel } from "../lib/scheduler";
import { equipment } from "../data";

export default function AISchedulingAssistant({ state }: { state: LabState }) {
  const [result, setResult] = useState<(AIOutput & { model: string }) | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = useRef(state);
  latest.current = state;
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    setResult(null);
    setError("");
    active.current?.abort();
    return () => active.current?.abort();
  }, [state]);
  const supported = import.meta.env.VITE_AI_ENABLED === "true";
  return (
    <section
      className="request-card"
      aria-labelledby="ai-title"
      aria-busy={busy}
    >
      <h2 id="ai-title">AI Scheduling Assistant</h2>
      <p>
        Gemini explains a feasible, priority-ordered allocation plan. No booking
        changes automatically. Review suggestions using the faculty controls
        below.
      </p>
      <p className="muted">
        Only scheduling details and project requirements are sent to Google.
        Names are replaced with aliases; use fictional project details. Slot
        feasibility is checked by code; AI reasoning is advisory.
      </p>
      {!supported ? (
        <p>
          AI is unavailable on this static fallback. All manual scheduling
          controls remain available.
        </p>
      ) : (
        <button
          className="button secondary small"
          disabled={busy || !state.requests.some((r) => r.status === "pending")}
          onClick={async () => {
            setBusy(true);
            setError("");
            setResult(null);
            const snapshot = state;
            const controller = new AbortController();
            active.current = controller;
            const timeout = setTimeout(() => controller.abort(), 20_000);
            try {
              const payload = aiPayload(snapshot);
              if (payload.requests.length > 100)
                throw new Error(
                  "AI supports up to 100 active/demo bookings. Manual scheduling remains available.",
                );
              const response = await fetch("/api/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal,
              });
              if (
                !response.headers
                  .get("content-type")
                  ?.includes("application/json")
              )
                throw new Error(
                  "AI endpoint is unavailable. Manual scheduling remains available.",
                );
              const data = await response.json();
              if (!response.ok)
                throw new Error(
                  typeof data.error === "string"
                    ? data.error
                    : "AI is unavailable. Please retry later.",
                );
              if (
                data.provider !== "Google Gemini" ||
                data.feasibilityValidated !== true ||
                typeof data.model !== "string"
              )
                throw new Error("Unverified AI response was discarded.");
              const validated = validateAIOutput(payload, {
                recommendations: data.recommendations,
              });
              if (latest.current !== snapshot)
                throw new Error(
                  "The queue changed. Request a fresh recommendation.",
                );
              setResult({ ...validated, model: data.model });
            } catch (e) {
              if (latest.current === snapshot)
                setError(
                  controller.signal.aborted
                    ? "AI timed out. Manual scheduling remains available."
                    : e instanceof Error
                      ? e.message
                      : "AI unavailable. Manual scheduling remains available.",
                );
            } finally {
              clearTimeout(timeout);
              setBusy(false);
            }
          }}
        >
          {busy ? "Asking Gemini…" : "Generate AI allocation advice"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            <strong>Google Gemini · {result.model}</strong> — slot feasibility
            checked against this queue snapshot. Explanations are AI-generated,
            not independently verified. Only the first eight pending requests
            are reviewed.
          </p>
          <ol>
            {result.recommendations.map((row) => {
              const request = state.requests.find(
                (r) => r.id === row.requestId,
              )!;
              return (
                <li key={row.requestId}>
                  <strong>
                    {request.project} ·{" "}
                    {equipment.find((e) => e.id === row.equipmentId)?.name}
                  </strong>
                  <p>
                    {row.slot
                      ? `${prettyDate(row.slot.date)} · ${timeLabel(row.slot.start)}–${timeLabel(row.slot.start + request.duration)}`
                      : "No feasible slot in this plan. Faculty review required."}
                  </p>
                  <p>{row.reason}</p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
