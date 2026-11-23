import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AISchedulingAssistant from "./AISchedulingAssistant";
import { request } from "../test/fixtures";
import { aiPayload, allocationCandidates } from "../lib/ai";
import type { LabState } from "../types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const state: LabState = { version: 1, requests: [request()] };
it("keeps the static fallback usable without API calls", () => {
  vi.stubEnv("VITE_AI_ENABLED", "false");
  render(<AISchedulingAssistant state={state} />);
  expect(
    screen.getByText(/AI is unavailable on this static fallback/),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("displays genuine-provider advice only after validation, clears it on stock changes, and never approves", async () => {
  vi.stubEnv("VITE_AI_ENABLED", "true");
  const recommendations = allocationCandidates(aiPayload(state)).map((c) => ({
    requestId: c.requestId,
    equipmentId: c.equipmentId,
    slot: c.slots[0],
    reason: "This slot fits the deadline and remaining equipment capacity.",
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          provider: "Google Gemini",
          model: "gemini-test",
          feasibilityValidated: true,
          recommendations,
        }),
        { headers: { "content-type": "application/json" } },
      ),
    ),
  );
  const view = render(<AISchedulingAssistant state={state} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Generate AI allocation advice" }),
  );
  expect(
    await screen.findByText(/Google Gemini · gemini-test/),
  ).toBeInTheDocument();
  expect(state.requests[0].status).toBe("pending");
  view.rerender(
    <AISchedulingAssistant state={{ ...state, stock: { oscilloscope: 2 } }} />,
  );
  expect(
    screen.queryByText(/Google Gemini · gemini-test/),
  ).not.toBeInTheDocument();
});
it("reports unavailable API without affecting the pending request", async () => {
  vi.stubEnv("VITE_AI_ENABLED", "true");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Provider unavailable")),
  );
  render(<AISchedulingAssistant state={state} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Generate AI allocation advice" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Provider unavailable",
  );
  expect(state.requests[0].status).toBe("pending");
});
