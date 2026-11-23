import { describe, expect, it } from "vitest";
import {
  createRequest,
  decideRequest,
  initialState,
  loadState,
  saveState,
  transact,
} from "./store";
import { request } from "../test/fixtures";
import type { LabState } from "../types";

describe("request lifecycle", () => {
  it("creates pending requests and persists reloads", () => {
    const next = createRequest({ version: 1, requests: [] }, request());
    expect(next.requests[0].status).toBe("pending");
    saveState(next);
    expect(loadState()).toEqual(next);
  });
  it("approves once and rejects a conflicting approval", () => {
    const state: LabState = {
      version: 1,
      requests: [request(), request({ id: "two" })],
    };
    const approved = decideRequest(state, "one", "approved");
    expect(approved.requests[0].status).toBe("approved");
    expect(() => decideRequest(approved, "two", "approved")).toThrow(
      "already booked",
    );
    expect(() => decideRequest(approved, "one", "approved")).toThrow(
      "no longer pending",
    );
  });
  it("approves an alternative and preserves request duration", () => {
    const state: LabState = {
      version: 1,
      requests: [request({ id: "booked", status: "approved" }), request()],
    };
    const next = decideRequest(state, "one", "approved", {
      date: request().date,
      start: 720,
    });
    expect(next.requests[1]).toMatchObject({
      status: "approved",
      start: 720,
      duration: 60,
    });
  });
  it("refuses alternatives for exact-slot requests", () => {
    expect(() =>
      decideRequest(
        { version: 1, requests: [request({ flexible: false })] },
        "one",
        "approved",
        { date: request().date, start: 720 },
      ),
    ).toThrow("exact slot");
  });
  it("rejecting never creates a booking", () => {
    expect(
      decideRequest({ version: 1, requests: [request()] }, "one", "rejected")
        .requests[0].status,
    ).toBe("rejected");
  });
  it("re-reads latest persisted data for sequential transactions", async () => {
    saveState({ version: 1, requests: [request(), request({ id: "two" })] });
    await transact((s) => decideRequest(s, "one", "approved"));
    await expect(
      transact((s) => decideRequest(s, "two", "approved")),
    ).rejects.toThrow("already booked");
  });
  it("starts with synthetic demo data and detects corrupted storage", () => {
    expect(initialState().requests).toHaveLength(2);
    localStorage.setItem("lablink-demo-v1", '{"version":2}');
    expect(() => loadState()).toThrow("could not be read");
  });
  it("recovers corrupted storage only through an explicit reset", async () => {
    localStorage.setItem("lablink-demo-v1", "not json");
    expect(() => loadState()).toThrow("could not be read");
    await transact(() => initialState(), true);
    expect(loadState().requests).toHaveLength(2);
  });
});
